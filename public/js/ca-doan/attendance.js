(() => {
    const page = document.querySelector('.choir-attendance');
    if (!page) return;

    const yearId = page.dataset.yearId;
    const attendanceDate = page.dataset.date;
    const sessionType = page.dataset.session;
    const toast = document.getElementById('choir-toast');
    const scanStatus = document.getElementById('scan-status');
    const filterForm = document.getElementById('attendance-filters');
    const dateInput = document.getElementById('attendance-date');
    const searchInput = document.getElementById('attendance-search');
    const rows = [...page.querySelectorAll('[data-attendance-row]')];
    const filterButtons = [...page.querySelectorAll('[data-attendance-filter]')];
    const scannerPanel = document.getElementById('scanner-panel');
    const scannerToggle = document.getElementById('scanner-toggle');
    const flashButton = document.getElementById('scanner-flash');
    let activeFilter = 'all';
    let toastTimer;
    let lastQrValue = '';
    let lastQrTime = 0;
    let scanInProgress = false;
    let scannerCollapsed = false;
    let flashEnabled = false;
    let scanner;
    let scannerStartPromise;

    const statusLabels = {
        pending: 'Chưa điểm danh',
        present: 'Có mặt',
        permission: 'Có phép',
        absent: 'Vắng'
    };

    const socket = window.io();
    const attendanceRooms = new Set(rows
        .map(row => row.dataset.classId)
        .filter(Boolean)
        .map(classId => `attendance_${yearId}_${classId}_${attendanceDate}_${encodeURIComponent(sessionType)}`));
    attendanceRooms.forEach(room => socket.emit('join_room', room));

    const normalize = value => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi')
        .trim()
        .replace(/\s+/g, ' ');

    dateInput?.addEventListener('change', () => filterForm?.requestSubmit());

    const showToast = (message, type = 'success', vibrate = false) => {
        if (!toast) return;
        toast.textContent = message;
        toast.classList.toggle('is-error', type === 'error');
        toast.classList.toggle('is-info', type === 'info');
        toast.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4000);
        if (vibrate && typeof navigator.vibrate === 'function') navigator.vibrate(35);
    };

    const setRowStatus = (row, state, copy = statusLabels[state]) => {
        row.dataset.status = state;
        row.dataset.statusCopy = copy;
        row.querySelector('[data-status-copy]').textContent = copy;
        row.querySelector('[data-attendance-present]').checked = state === 'present';
        updateFilterCounts();
        renderRows();
    };

    socket.on('attendance_entry_updated', ({ studentId, status, saved }) => {
        const row = rows.find(item => item.dataset.studentId === String(studentId));
        if (!row) return;

        const state = status === 'Vắng phép'
            ? 'permission'
            : status === 'Vắng không phép'
                ? 'absent'
                : status
                    ? 'present'
                    : 'pending';
        row.dataset.serverStatus = state;
        row.dataset.persisted = String(saved);
        setRowStatus(row, state, status || statusLabels.pending);
    });

    const updateFilterCounts = () => {
        const counts = {
            all: rows.length,
            pending: 0,
            present: 0,
            permission: 0,
            absent: 0
        };
        rows.forEach(row => {
            const state = row.dataset.status;
            if (Object.hasOwn(counts, state)) counts[state] += 1;
        });
        page.querySelectorAll('[data-filter-count]').forEach(count => {
            count.textContent = String(counts[count.dataset.filterCount] || 0);
        });
    };

    const renderRows = () => {
        const keyword = normalize(searchInput?.value);
        let visibleCount = 0;

        rows.forEach(row => {
            const statusMatches = activeFilter === 'all' || row.dataset.status === activeFilter;
            const searchMatches = !keyword || normalize(row.dataset.search).includes(keyword);
            row.hidden = !statusMatches;
            row.classList.toggle('search-hidden', !searchMatches);
            if (statusMatches && searchMatches) visibleCount += 1;
        });

        const visibleCountElement = document.getElementById('attendance-visible-count');
        if (visibleCountElement) visibleCountElement.textContent = String(visibleCount);

        const emptyMessage = document.getElementById('attendance-search-empty');
        if (emptyMessage) emptyMessage.hidden = visibleCount > 0;
        document.dispatchEvent(new CustomEvent('pagination:refresh'));
    };

    searchInput?.addEventListener('input', renderRows);
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            activeFilter = button.dataset.attendanceFilter;
            filterButtons.forEach(filterButton => {
                const selected = filterButton === button;
                filterButton.classList.toggle('is-active', selected);
                filterButton.setAttribute('aria-pressed', String(selected));
            });
            renderRows();
        });
    });

    const recordAttendance = async ({ studentId, qrValue }) => {
        const endpoint = qrValue ? '/ca-doan/diem-danh/scan' : '/ca-doan/diem-danh/mark';
        const payload = {
            nien_khoa: yearId,
            ngay_diem_danh: attendanceDate,
            loai_buoi: sessionType
        };
        if (studentId) payload.id_tn = studentId;
        if (qrValue) payload.qr_value = qrValue;

        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (!response.ok || !result.success) {
            throw new Error(result.message || 'Không thể lưu điểm danh.');
        }
        return result;
    };

    const markPresent = async (row, checkbox) => {
        const previousState = row.dataset.status;
        const previousCopy = row.dataset.statusCopy;
        row.dataset.saving = 'true';
        checkbox.disabled = true;
        setRowStatus(row, 'present', 'Đang lưu...');

        try {
            const result = await recordAttendance({ studentId: row.dataset.studentId });
            row.dataset.serverStatus = 'present';
            row.dataset.persisted = 'true';
            setRowStatus(row, 'present', result.status || 'Có mặt');
            showToast(`Đã ghi nhận ${result.name} có mặt.`);
        } catch (error) {
            setRowStatus(row, previousState, previousCopy);
            showToast(error.message, 'error');
        } finally {
            delete row.dataset.saving;
            checkbox.disabled = false;
            if (!row.hidden && !row.classList.contains('search-hidden')) {
                checkbox.focus({ preventScroll: true });
            }
        }
    };

    page.querySelectorAll('[data-attendance-present]').forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const row = checkbox.closest('[data-attendance-row]');
            if (!row || row.dataset.saving === 'true') return;

            if (!checkbox.checked) {
                const hasSavedRecord = row.dataset.serverStatus !== 'pending';
                setRowStatus(row, 'pending', hasSavedRecord
                    ? 'Chưa điểm danh · thay đổi tạm thời'
                    : statusLabels.pending);
                showToast(
                    hasSavedRecord
                        ? 'Giao diện đã về Chưa điểm danh; bản ghi cũ vẫn còn trên hệ thống.'
                        : 'Đã bỏ trạng thái tạm thời.',
                    'info'
                );
                return;
            }

            markPresent(row, checkbox);
        });
    });

    const readerElement = document.getElementById('choir-qr-reader');
    const setScanMessage = (message, isError = false) => {
        if (!scanStatus) return;
        scanStatus.textContent = message;
        scanStatus.classList.toggle('is-error', isError);
    };

    const handleDecodedQr = async decodedText => {
        if (scanInProgress) return;
        const now = Date.now();
        if (decodedText === lastQrValue && now - lastQrTime < 3000) return;
        lastQrValue = decodedText;
        lastQrTime = now;
        scanInProgress = true;
        setScanMessage('Đang kiểm tra và lưu điểm danh...');
        try {
            const result = await recordAttendance({ qrValue: decodedText });
            const row = rows.find(item => item.dataset.studentId === String(result.studentId));
            if (row) {
                row.dataset.serverStatus = 'present';
                row.dataset.persisted = 'true';
                setRowStatus(row, 'present', result.status || 'Có mặt');
            }
            setScanMessage(`Đã ghi nhận: ${result.name} (${result.mstn}).`);
            showToast(`Đã ghi nhận ${result.name} có mặt.`, 'success', true);
        } catch (error) {
            setScanMessage(error.message, true);
            showToast(error.message, 'error');
        } finally {
            scanInProgress = false;
        }
    };

    const startScanner = async () => {
        if (!scanner || scanner.isScanning || scannerStartPromise || scannerCollapsed) return;
        setScanMessage('Đang mở camera...');
        scannerStartPromise = (async () => {
            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: (viewWidth, viewHeight) => {
                        const size = Math.min(250, viewWidth, viewHeight);
                        return { width: size, height: size };
                    }
                },
                handleDecodedQr,
                () => {}
            );
            flashButton.disabled = false;
            setScanMessage('Đưa mã QR vào khung để điểm danh.');
            if (scannerCollapsed && scanner.isScanning) await scanner.stop();
        })();

        try {
            await scannerStartPromise;
        } catch (error) {
            console.error('Không thể khởi động máy quét QR:', error);
            flashButton.disabled = true;
            setScanMessage('Không thể mở camera. Hãy cấp quyền camera hoặc dùng danh sách.', true);
        } finally {
            scannerStartPromise = null;
        }
    };

    const stopScanner = async () => {
        if (scannerStartPromise) {
            try {
                await scannerStartPromise;
            } catch (error) {
                console.error('Không thể hoàn tất khởi tạo máy quét trước khi thu gọn:', error);
                return;
            }
        }
        if (!scanner?.isScanning) return;
        try {
            await scanner.stop();
        } catch (error) {
            console.error('Không thể dừng camera:', error);
            showToast('Không thể dừng camera. Vui lòng tải lại trang nếu camera vẫn bật.', 'error');
        }
        flashEnabled = false;
        flashButton.disabled = true;
        flashButton.setAttribute('aria-pressed', 'false');
        flashButton.setAttribute('aria-label', 'Bật đèn flash');
        flashButton.querySelector('span').textContent = 'Flash';
    };

    if (scannerToggle && scannerPanel) {
        scannerToggle.addEventListener('click', async () => {
            scannerCollapsed = !scannerCollapsed;
            scannerPanel.hidden = scannerCollapsed;
            scannerToggle.setAttribute('aria-expanded', String(!scannerCollapsed));
            scannerToggle.querySelector('span').textContent = scannerCollapsed ? 'Mở rộng' : 'Thu gọn';
            scannerToggle.querySelector('i').className = `fa-solid ${scannerCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`;

            if (scannerCollapsed) {
                await stopScanner();
            } else {
                await startScanner();
            }
        });
    }

    if (readerElement && typeof Html5Qrcode !== 'undefined') {
        scanner = new Html5Qrcode('choir-qr-reader');
        startScanner();
    } else if (readerElement) {
        setScanMessage('Không tải được thư viện quét QR. Vui lòng tải lại trang hoặc điểm danh bằng danh sách.', true);
        if (flashButton) flashButton.disabled = true;
    }

    flashButton?.addEventListener('click', async () => {
        if (!scanner?.isScanning) {
            showToast('Camera chưa sẵn sàng để bật đèn flash.', 'info');
            return;
        }
        try {
            const capabilities = scanner.getRunningTrackCapabilities();
            if (!capabilities.torch) {
                showToast('Thiết bị hoặc trình duyệt không hỗ trợ đèn flash.', 'info');
                return;
            }
            flashEnabled = !flashEnabled;
            await scanner.applyVideoConstraints({ advanced: [{ torch: flashEnabled }] });
            flashButton.setAttribute('aria-pressed', String(flashEnabled));
            flashButton.setAttribute('aria-label', `${flashEnabled ? 'Tắt' : 'Bật'} đèn flash`);
            flashButton.querySelector('span').textContent = flashEnabled ? 'Tắt flash' : 'Flash';
        } catch (error) {
            flashEnabled = false;
            showToast('Không thể bật đèn flash trên thiết bị này.', 'error');
            console.error('Không thể thay đổi đèn flash máy quét:', error);
        }
    });

    updateFilterCounts();
    renderRows();

    window.addEventListener('pagehide', () => {
        if (scanner?.isScanning) {
            scanner.stop().catch(error => console.error('Không thể dừng camera:', error));
        }
    }, { once: true });
})();
