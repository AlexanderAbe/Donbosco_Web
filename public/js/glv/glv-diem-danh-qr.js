(() => {
    const qrPage = document.querySelector('.attendance-page');
    const { yearId, classId, sessionType, selectedDate } = qrPage.dataset;
    const filterForm = document.getElementById('qr-filter');
    const statusElement = document.getElementById('qr-scan-status');
    const toast = document.getElementById('qr-toast');
    const saveForm = document.getElementById('qr-attendance-save-form');
    const saveButton = document.getElementById('qr-attendance-save-button');
    const scanUrl = '/glv/diem-danh/scan';
    let requestInFlight = false;
    let lastCode = '';
    let lastScanAt = 0;
    let toastTimer;
    let saveSubmitted = false;

    filterForm.querySelectorAll('select, input[type="date"]').forEach(field => {
        field.addEventListener('change', () => filterForm.requestSubmit());
    });

    saveForm.addEventListener('submit', event => {
        if (saveSubmitted) {
            event.preventDefault();
            return;
        }

        saveSubmitted = true;
        saveButton.disabled = true;
        saveButton.setAttribute('aria-busy', 'true');
        saveButton.innerHTML = '<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> <span>Đang lưu...</span>';
    });

    const showToast = (message, type) => {
        toast.textContent = message;
        toast.className = `qr-toast is-visible ${type}`;
        window.clearTimeout(toastTimer);
        toastTimer = window.setTimeout(() => { toast.className = 'qr-toast'; }, 2600);
    };

    const setStatus = (message, isError = false) => {
        statusElement.innerHTML = `<i class="fa-solid ${isError ? 'fa-circle-exclamation' : 'fa-camera'}"></i> ${message}`;
        statusElement.classList.toggle('is-error', isError);
    };

    const sendScan = async decodedText => {
        const now = Date.now();
        if (requestInFlight || (decodedText === lastCode && now - lastScanAt < 3500)) return;
        requestInFlight = true;
        lastCode = decodedText;
        lastScanAt = now;
        setStatus('Đang gửi kết quả quét...');

        try {
            const response = await fetch(scanUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                body: JSON.stringify({
                    qr_value: decodedText,
                    nien_khoa: yearId,
                    id_lop: classId,
                    loai_buoi: sessionType,
                    ngay_diem_danh: selectedDate
                })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || 'QR không hợp lệ.');
            showToast(`Đã lưu ${result.status}: ${result.student.name}`, 'success');
            setStatus(`Đã lưu ${result.status}. Mời quét mã tiếp theo.`);
        } catch (error) {
            showToast(error.message || 'Quét QR thất bại.', 'error');
            setStatus('Mã vừa quét chưa được lưu. Mời thử lại.', true);
        } finally {
            requestInFlight = false;
        }
    };

    const startScanner = async () => {
        if (!window.Html5Qrcode) {
            setStatus('Không tải được thư viện quét QR.', true);
            showToast('Không thể khởi tạo camera.', 'error');
            return;
        }
        const scanner = new Html5Qrcode('qr-reader');
        try {
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                sendScan,
                () => {}
            );
        } catch (error) {
            setStatus('Không thể mở camera. Hãy cấp quyền camera và dùng HTTPS hoặc localhost.', true);
            showToast('Không thể mở camera.', 'error');
        }
    };

    if (document.getElementById('qr-reader')) startScanner();
})();
