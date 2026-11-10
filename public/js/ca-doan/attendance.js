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
    let toastTimer;
    let lastQrValue = '';
    let lastQrTime = 0;
    let scanInProgress = false;

    dateInput?.addEventListener('change', () => filterForm.requestSubmit());

    const showToast = (message, isError = false) => {
        toast.textContent = message;
        toast.classList.toggle('is-error', isError);
        toast.classList.add('is-visible');
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => toast.classList.remove('is-visible'), 4000);
    };

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
        if (!response.ok || !result.success) throw new Error(result.message || 'Không thể lưu điểm danh.');

        const row = document.querySelector(`[data-student-id="${result.studentId}"]`);
        if (row) {
            const status = row.querySelector('[data-student-status]');
            status.textContent = result.status;
            const button = row.querySelector('[data-mark-student]');
            button.disabled = true;
            button.querySelector('i').className = 'fa-solid fa-circle-check text-emerald-600';
        }
        showToast(`Đã ghi nhận ${result.name} có mặt.`);
        return result;
    };

    document.querySelectorAll('[data-mark-student]').forEach(button => {
        button.addEventListener('click', async () => {
            button.disabled = true;
            try {
                await recordAttendance({ studentId: button.dataset.markStudent });
            } catch (error) {
                showToast(error.message, true);
                button.disabled = false;
            }
        });
    });

    const readerElement = document.getElementById('choir-qr-reader');
    if (!readerElement) return;
    if (typeof Html5Qrcode === 'undefined') {
        scanStatus.textContent = 'Không tải được thư viện quét QR. Vui lòng tải lại trang hoặc điểm danh bằng danh sách.';
        scanStatus.classList.add('is-error');
        return;
    }

    const scanner = new Html5Qrcode('choir-qr-reader');
    scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        async decodedText => {
            if (scanInProgress) return;
            const now = Date.now();
            if (decodedText === lastQrValue && now - lastQrTime < 3000) return;
            lastQrValue = decodedText;
            lastQrTime = now;
            scanInProgress = true;
            scanStatus.textContent = 'Đang kiểm tra và lưu điểm danh...';
            scanStatus.classList.remove('is-error');
            try {
                const result = await recordAttendance({ qrValue: decodedText });
                scanStatus.textContent = `Đã ghi nhận: ${result.name} (${result.mstn}).`;
            } catch (error) {
                scanStatus.textContent = error.message;
                scanStatus.classList.add('is-error');
            } finally {
                scanInProgress = false;
            }
        },
        () => {}
    ).catch(error => {
        console.error('Không thể khởi động máy quét QR:', error);
        scanStatus.textContent = 'Không thể mở camera. Hãy cấp quyền camera hoặc dùng nút Có mặt trong danh sách.';
        scanStatus.classList.add('is-error');
    });

    window.addEventListener('pagehide', () => {
        if (scanner.isScanning) scanner.stop().catch(error => console.error('Không thể dừng camera:', error));
    }, { once: true });
})();
