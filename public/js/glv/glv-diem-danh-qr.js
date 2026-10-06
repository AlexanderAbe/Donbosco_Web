(() => {
    const qrPage = document.querySelector('.attendance-page');
    const { yearId, classId, sessionType, selectedDate } = qrPage.dataset;
    const statusElement = document.getElementById('qr-scan-status');
    const stopButton = document.getElementById('qr-stop-button');
    const toast = document.getElementById('qr-toast');
    const scanUrl = '/glv/diem-danh/scan';
    let scanner;
    let requestInFlight = false;
    let lastCode = '';
    let lastScanAt = 0;
    let toastTimer;

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
        scanner = new Html5Qrcode('qr-reader');
        try {
            await scanner.start(
                { facingMode: 'environment' },
                { fps: 10, qrbox: { width: 250, height: 250 } },
                sendScan,
                () => {}
            );
            stopButton.disabled = false;
            setStatus('Camera đang sẵn sàng. Đưa mã QR vào khung quét.');
        } catch (error) {
            setStatus('Không thể mở camera. Hãy cấp quyền camera và dùng HTTPS hoặc localhost.', true);
            showToast('Không thể mở camera.', 'error');
        }
    };

    stopButton.addEventListener('click', async () => {
        if (!scanner) return;
        await scanner.stop();
        stopButton.disabled = true;
        setStatus('Camera đã dừng.');
    });

    startScanner();
})();
