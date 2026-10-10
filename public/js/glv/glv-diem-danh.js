(() => {
    const form = document.getElementById('attendance-save-form');
    const saveStatus = document.getElementById('attendance-save-status');
    const saveStatusText = document.getElementById('attendance-save-status-text');
    if (!form || !saveStatus || !saveStatusText) return;

    const pendingSaves = new Set();
    const studentSaves = new Map();
    const saveErrors = new Map();
    const studentRows = [...form.querySelectorAll('[data-student-id][data-saved]')];
    const totalStudents = new Set(studentRows.map(row => row.dataset.studentId)).size;
    const savedStudents = new Set(studentRows
        .filter(row => row.dataset.saved === 'true')
        .map(row => row.dataset.studentId));
    const updateStudentSaved = (studentId, saved) => {
        form.querySelectorAll('[data-student-id]').forEach(row => {
            if (row.dataset.studentId === studentId) row.dataset.saved = String(saved);
        });
        if (saved) savedStudents.add(studentId);
        else savedStudents.delete(studentId);
    };
    const setStatus = (text, saved) => {
        const isFullySaved = saved && savedStudents.size === totalStudents;
        saveStatus.classList.toggle('is-saved', isFullySaved);
        saveStatus.classList.toggle('is-unsaved', !isFullySaved);
        saveStatus.querySelector('i').className = `fa-solid ${isFullySaved ? 'fa-circle-check' : 'fa-clock'}`;
        saveStatusText.textContent = `${text} · Đã lưu ${savedStudents.size}/${totalStudents}`;
    };

    form.querySelectorAll('.attendance-options input[type="radio"]').forEach(input => {
        input.addEventListener('change', () => {
            const row = input.closest('[data-student-id]');
            if (!row) return;
            const studentId = row.dataset.studentId;
            const previousSave = studentSaves.get(studentId) || Promise.resolve();
            setStatus('Đang lưu...', false);

            let currentSave;
            currentSave = previousSave.catch(() => {}).then(async () => {
                const body = new URLSearchParams({
                    nien_khoa: form.dataset.yearId,
                    id_lop: form.dataset.classId,
                    id_tn: studentId,
                    loai_buoi: form.dataset.sessionType,
                    ngay_diem_danh: form.dataset.attendanceDate,
                    trang_thai: input.value
                });
                const response = await fetch(form.dataset.saveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Không thể lưu điểm danh.');
                }
                updateStudentSaved(studentId, true);
                if (studentSaves.get(studentId) === currentSave) {
                    saveErrors.delete(studentId);
                    setStatus('Đã lưu', true);
                }
            }).catch(error => {
                saveErrors.set(studentId, error);
                setStatus(error.message || 'Lỗi lưu điểm danh', false);
                throw error;
            }).finally(() => {
                pendingSaves.delete(currentSave);
                if (studentSaves.get(studentId) === currentSave) studentSaves.delete(studentId);
            });

            currentSave.catch(() => {});
            studentSaves.set(studentId, currentSave);
            pendingSaves.add(currentSave);
        });
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
    });

    const filterForm = document.getElementById('attendance-filter');
    filterForm?.addEventListener('submit', event => {
        if (!pendingSaves.size && !saveErrors.size) return;
        event.preventDefault();
        Promise.all([...pendingSaves]).then(() => {
            if (saveErrors.size) {
                const error = saveErrors.values().next().value;
                setStatus(error.message || 'Không thể lưu điểm danh.', false);
                return;
            }
            filterForm.submit();
        }).catch(error => {
            setStatus(error.message || 'Không thể lưu điểm danh trước khi chuyển ngày hoặc lớp.', false);
        });
    });
})();

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
        stylesheet.href = '/css/output.css';

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
    const filter = document.getElementById('attendance-filter');
    const classSelect = document.getElementById('attendance-class');
    type?.addEventListener('change', () => { filter.submit(); });
    document.getElementById('attendance-date')?.addEventListener('change', () => { filter.submit(); });
    classSelect?.addEventListener('change', () => { filter.submit(); });
})();
