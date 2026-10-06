document.getElementById('print-score-button')?.addEventListener('click', async () => {
        const watermark = document.querySelector('.score-print-watermark');
        try {
            if (!watermark) throw new Error('Không tìm thấy logo watermark.');
            if (!watermark.complete) {
                await new Promise((resolve, reject) => {
                    watermark.addEventListener('load', resolve, { once: true });
                    watermark.addEventListener('error', () => reject(new Error('Không tải được logo watermark.')), { once: true });
                });
            }
            if (!watermark.naturalWidth) throw new Error('Không tải được logo watermark.');
            await watermark.decode();
            window.print();
        } catch (error) {
            window.alert(error.message || 'Không thể chuẩn bị logo để in.');
        }
    });
