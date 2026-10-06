(() => {
    const openButton = document.getElementById('print-discipline-year');
    const printModal = document.getElementById('discipline-print-modal');
    const confirmButton = document.getElementById('confirm-discipline-print');
    if (!openButton || !printModal || !confirmButton) return;

    printModal.querySelectorAll('[data-close-discipline-print]').forEach(button => {
        button.addEventListener('click', () => printModal.close());
    });
    openButton.addEventListener('click', () => printModal.showModal());

    const appendCell = (document, row, text, tagName = 'td', options = {}) => {
        const cell = document.createElement(tagName);
        cell.textContent = text;
        if (options.rowSpan) cell.rowSpan = options.rowSpan;
        row.appendChild(cell);
        return cell;
    };

    const buildPrintDocument = (printWindow, data) => {
        const printDocument = printWindow.document;
        printDocument.title = 'Bảng điểm kỷ luật';
        printDocument.body.className = 'discipline-print-body';
        const stylesheet = printDocument.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = '/css/glv/glv-ky-luat.css';

        const main = printDocument.createElement('main');
        main.className = 'discipline-print-document';
        const watermark = printDocument.createElement('img');
        watermark.className = 'discipline-print-watermark';
        watermark.src = '/imgs/Logo.png';
        watermark.alt = '';
        watermark.setAttribute('aria-hidden', 'true');
        main.appendChild(watermark);
        const watermarkReady = new Promise((resolve, reject) => {
            const onLoad = () => watermark.naturalWidth > 0
                ? resolve()
                : reject(new Error('Không tải được logo watermark.'));
            if (watermark.complete) {
                onLoad();
            } else {
                watermark.addEventListener('load', onLoad, { once: true });
                watermark.addEventListener('error', () => reject(new Error('Không tải được logo watermark.')), { once: true });
            }
        });
        const parish = printDocument.createElement('p');
        parish.className = 'discipline-print-parish';
        parish.append('Giáo xứ Tân Thái Sơn');
        parish.appendChild(printDocument.createElement('br'));
        parish.append('Xứ đoàn Don Bosco');
        main.appendChild(parish);

        const title = printDocument.createElement('h1');
        title.textContent = `BẢNG ĐIỂM KỶ LUẬT · ${data.className.toLocaleUpperCase('vi')} · NIÊN KHÓA ${data.academicYear}`;
        main.appendChild(title);

        const table = printDocument.createElement('table');
        table.className = 'discipline-print-table';
        const header = printDocument.createElement('thead');
        const headerRow = printDocument.createElement('tr');
        appendCell(printDocument, headerRow, 'STT', 'th');
        appendCell(printDocument, headerRow, 'Mã số', 'th');
        appendCell(printDocument, headerRow, 'Tên thánh', 'th');
        appendCell(printDocument, headerRow, 'Họ và tên lót', 'th');
        appendCell(printDocument, headerRow, 'Tên', 'th');
        data.months.forEach(({ month, year }) => {
            appendCell(printDocument, headerRow, ` T${month} - ${year}`, 'th');
        });
        header.appendChild(headerRow);
        table.appendChild(header);

        const body = printDocument.createElement('tbody');
        data.students.forEach((student, index) => {
            const row = printDocument.createElement('tr');
            appendCell(printDocument, row, String(index + 1));
            appendCell(printDocument, row, student.mstn || '-');
            appendCell(printDocument, row, student.ten_thanh || '');
            appendCell(printDocument, row, student.ho_va_ten_lot || '');
            appendCell(printDocument, row, student.ten || '');
            data.months.forEach(({ month }) => {
                const score = student.scores[month];
                appendCell(printDocument, row, score == null ? '' : String(score));
            });
            body.appendChild(row);
        });
        table.appendChild(body);
        main.appendChild(table);
        printDocument.body.appendChild(main);

        stylesheet.addEventListener('load', () => {
            Promise.all([printDocument.fonts.ready, watermarkReady]).then(() => {
                printWindow.focus();
                printWindow.print();
            }).catch(error => {
                window.alert(error.message || 'Không tải được nội dung để in.');
                printWindow.close();
            });
        }, { once: true });
        stylesheet.addEventListener('error', () => {
            window.alert('Không tải được kiểu in điểm kỷ luật. Vui lòng thử lại.');
            printWindow.close();
        }, { once: true });
        printDocument.head.appendChild(stylesheet);
    };

    confirmButton.addEventListener('click', async () => {
        const classId = Number(openButton.dataset.classId);
        if (!Number.isInteger(classId) || classId < 1) {
            window.alert('Không xác định được lớp cần in.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.alert('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên rồi thử lại.');
            return;
        }

        printModal.close();
        confirmButton.disabled = true;
        try {
            const response = await fetch('/glv/ky-luat/print-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lop: classId })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu điểm kỷ luật.');
            buildPrintDocument(printWindow, data);
        } catch (error) {
            printWindow.close();
            window.alert(error.message || 'Không thể chuẩn bị bảng điểm kỷ luật để in.');
        } finally {
            confirmButton.disabled = false;
        }
    });
})();
