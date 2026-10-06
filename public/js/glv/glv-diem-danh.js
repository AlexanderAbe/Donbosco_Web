(() => {
    const printButton = document.getElementById('print-monthly-attendance');
    const classSelect = document.getElementById('attendance-class');
    const printModal = document.getElementById('attendance-print-modal');
    const monthSelect = document.getElementById('attendance-print-month');
    const confirmPrintButton = document.getElementById('confirm-monthly-attendance-print');
    if (!printButton || !classSelect || !printModal || !monthSelect || !confirmPrintButton) return;

    printButton.addEventListener('click', () => printModal.showModal());
    printModal.querySelectorAll('[data-close-attendance-print]').forEach(button => {
        button.addEventListener('click', () => printModal.close());
    });

    const appendCell = (document, row, text, tagName = 'td', options = {}) => {
        const cell = document.createElement(tagName);
        cell.textContent = text;
        if (options.rowSpan) cell.rowSpan = options.rowSpan;
        if (options.colSpan) cell.colSpan = options.colSpan;
        row.appendChild(cell);
        return cell;
    };

    const getMonthSessions = (year, month) => {
        const sessions = [];
        const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
        for (let day = 1; day <= daysInMonth; day += 1) {
            const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
            const date = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            if (weekday === 2) sessions.push({ date, label: 'T3', type: 'Lễ Thứ 3' });
            else if (weekday === 4) sessions.push({ date, label: 'T5', type: 'Lễ Thứ 5' });
            else if (weekday === 0) {
                sessions.push({ date, label: 'Lễ', type: 'Lễ Chúa Nhật' });
                sessions.push({ date, label: 'GL', type: 'Học Giáo Lý' });
            }
        }
        return sessions;
    };

    const buildPrintDocument = (printWindow, data) => {
        const printDocument = printWindow.document;
        printDocument.title = ' Bảng điểm danh';
        printDocument.body.className = 'attendance-print-body';
        const stylesheet = printDocument.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = '/css/glv/glv-diem-danh.css';

        const main = printDocument.createElement('main');
        main.className = 'attendance-print-document';
        const watermark = printDocument.createElement('img');
        watermark.className = 'attendance-print-watermark';
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
        parish.className = 'attendance-print-parish';
        parish.append('Giáo xứ Tân Thái Sơn');
        parish.appendChild(printDocument.createElement('br'));
        parish.append('Xứ đoàn Don Bosco');
        main.appendChild(parish);

        const title = printDocument.createElement('h1');
        title.textContent = `BẢNG ĐIỂM DANH THÁNG ${data.month} - ${data.calendarYear} · ${data.className.toLocaleUpperCase('vi')}`;
        main.appendChild(title);

        const note = printDocument.createElement('p');
        note.className = 'attendance-print-note';
        note.textContent = 'Đi sớm: S, Có mặt: -, Vắng không phép: V, Vắng có phép: P';
        main.appendChild(note);

        const sessions = getMonthSessions(data.calendarYear, data.month);
        const table = printDocument.createElement('table');
        table.className = 'attendance-print-table';
        const header = printDocument.createElement('thead');
        const dateRow = printDocument.createElement('tr');
        appendCell(printDocument, dateRow, 'STT', 'th', { rowSpan: 2 });
        appendCell(printDocument, dateRow, 'Mã TN', 'th', { rowSpan: 2 });
        appendCell(printDocument, dateRow, 'Tên thánh', 'th', { rowSpan: 2 });
        appendCell(printDocument, dateRow, 'Họ và tên lót', 'th', { rowSpan: 2 });
        appendCell(printDocument, dateRow, 'Tên', 'th', { rowSpan: 2 });
        for (let index = 0; index < sessions.length;) {
            const session = sessions[index];
            const dateSessions = sessions.filter(item => item.date === session.date);
            const [, month, day] = session.date.split('-');
            appendCell(printDocument, dateRow, `${day}/${month}`, 'th', { colSpan: dateSessions.length });
            index += dateSessions.length;
        }
        header.appendChild(dateRow);

        const sessionRow = printDocument.createElement('tr');
        sessions.forEach(session => appendCell(printDocument, sessionRow, session.label, 'th'));
        header.appendChild(sessionRow);
        table.appendChild(header);

        const statusCodes = {
            'Đi sớm': 'S',
            'Có mặt': '-',
            'Vắng không phép': 'V',
            'Vắng phép': 'P'
        };
        const body = printDocument.createElement('tbody');
        data.students.forEach((student, index) => {
            const row = printDocument.createElement('tr');
            appendCell(printDocument, row, String(index + 1));
            appendCell(printDocument, row, student.mstn || '-');
            appendCell(printDocument, row, student.ten_thanh || '');
            appendCell(printDocument, row, student.ho_va_ten_lot || '');
            appendCell(printDocument, row, student.ten || '');
            sessions.forEach(session => {
                const status = student.attendance[`${session.date}|${session.type}`];
                appendCell(printDocument, row, statusCodes[status] || '');
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
            window.alert('Không tải được kiểu in điểm danh. Vui lòng thử lại.');
            printWindow.close();
        }, { once: true });
        printDocument.head.appendChild(stylesheet);
    };

    confirmPrintButton.addEventListener('click', async () => {
        const classId = Number(classSelect.value);
        const month = Number(monthSelect.value);
        if (!Number.isInteger(classId) || classId < 1 || !Number.isInteger(month) || month < 1 || month > 12) {
            window.alert('Vui lòng chọn lớp và tháng hợp lệ trước khi in.');
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            window.alert('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên rồi thử lại.');
            return;
        }

        printModal.close();
        confirmPrintButton.disabled = true;
        try {
            const response = await fetch('/glv/diem-danh/print-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lop: classId, thang: month })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu điểm danh.');
            buildPrintDocument(printWindow, data);
        } catch (error) {
            printWindow.close();
            window.alert(error.message || 'Không thể chuẩn bị bảng điểm danh để in.');
        } finally {
            confirmPrintButton.disabled = false;
        }
    });
})();


(() => {
    const type = document.getElementById('attendance-type');
    const date = document.getElementById('attendance-date');
    const filter = document.getElementById('attendance-filter');
    const classSelect = document.getElementById('attendance-class');
    const targetDays = { 'Lễ Thứ 3': 2, 'Lễ Thứ 5': 4, 'Lễ Chúa Nhật': 0, 'Học Giáo Lý': 0 };
    const smartDate = sessionType => { const current = new Date(); current.setDate(current.getDate() - ((current.getDay() - targetDays[sessionType] + 7) % 7)); return `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}-${String(current.getDate()).padStart(2, '0')}`; };
    type?.addEventListener('change', () => { date.value = smartDate(type.value); filter.submit(); });
    date?.addEventListener('change', () => { filter.submit(); });
    classSelect?.addEventListener('change', () => { filter.submit(); });
})();
