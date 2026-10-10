(() => {
    const scoreForm = document.getElementById('discipline-score-form');
    const saveStatus = document.getElementById('discipline-save-status');
    const saveStatusText = document.getElementById('discipline-save-status-text');

    if (scoreForm && saveStatus && saveStatusText) {
        const pendingSaves = new Map();
        const pendingScores = new Map();
        const saveTimers = new Map();
        const studentRows = [...scoreForm.querySelectorAll('[data-student-id][data-saved]')];
        const totalStudents = new Set(studentRows.map(row => row.dataset.studentId)).size;
        const savedStudents = new Set(studentRows
            .filter(row => row.dataset.saved === 'true')
            .map(row => row.dataset.studentId));
        const savedScores = new Map(studentRows.map(row => [
            row.dataset.studentId,
            row.dataset.saved === 'true' ? row.querySelector('.discipline-input')?.value.trim() ?? '' : null
        ]));
            
        const updateStudentSaved = (studentId, saved) => {
            scoreForm.querySelectorAll('[data-student-id]').forEach(row => {
                if (row.dataset.studentId === studentId) row.dataset.saved = String(saved);
            });
            if (saved) savedStudents.add(studentId);
            else savedStudents.delete(studentId);
        };

        const setStatus = (text, saved) => {
            const isFullySaved = saved && savedStudents.size === totalStudents;
            saveStatus.classList.toggle('saved', isFullySaved);
            saveStatus.classList.toggle('unsaved', !isFullySaved);
            saveStatus.querySelector('i').className = `fa-solid ${isFullySaved ? 'fa-circle-check' : 'fa-clock'}`;
            saveStatusText.textContent = `${text} · Đã lưu ${savedStudents.size}/${totalStudents}`;
        };

        // --- TÍCH HỢP WEBSOCKET CLIENT ---
        const classId = scoreForm.dataset.classId;
        const month = scoreForm.dataset.month;
        const socket = io();

        if (classId && month) {
            socket.emit('join_room', `class_${classId}_month_${month}`);
        }

        // Lắng nghe sự kiện điểm thay đổi từ server (do người khác hoặc tab khác sửa)
        socket.on('discipline_score_updated', (data) => {
            const { studentId, newScore } = data;
            const row = scoreForm.querySelector(`tr[data-student-id="${studentId}"]`);
            if (row) {
                const inputElem = row.querySelector('.discipline-input');
                const savedScore = savedScores.get(String(studentId)) ?? '';
                const hasLocalChanges = inputElem && inputElem.value.trim() !== savedScore;
                savedScores.set(String(studentId), newScore);
                updateStudentSaved(String(studentId), newScore !== '');
                if (inputElem && !hasLocalChanges) {
                    inputElem.value = newScore;
                    
                    // Hiệu ứng nháy xanh nhẹ thông báo dữ liệu được đồng bộ từ xa
                    inputElem.classList.add('bg-green-100', 'transition-colors');
                    setTimeout(() => inputElem.classList.remove('bg-green-100'), 1000);
                }
                setStatus('Đã đồng bộ', true);
            }
        });
        // ---------------------------------

        const persistScore = input => {
            const row = input.closest('[data-student-id]');
            const studentId = row?.dataset.studentId;
            const rawScore = input.value.trim();
            if (!studentId) return Promise.resolve();

            const score = rawScore === '' ? null : Number(rawScore);
            if (score !== null && (!Number.isFinite(score) || score < 0 || score > 10)) {
                setStatus('Điểm phải từ 0 đến 10', false);
                const error = new Error('Điểm kỷ luật phải nằm trong khoảng từ 0 đến 10.');
                window.showAppToast(error.message, 'error');
                return Promise.reject(error);
            }

            if ((savedScores.get(studentId) ?? '') === rawScore) return Promise.resolve();
            if (pendingScores.get(studentId) === rawScore) {
                return pendingSaves.get(studentId) || Promise.resolve();
            }

            const previousSave = pendingSaves.get(studentId) || Promise.resolve();
            setStatus('Đang lưu...', false);
            let currentSave;
            currentSave = previousSave.catch(() => {}).then(async () => {
                const body = new URLSearchParams({
                    nien_khoa: scoreForm.dataset.yearId,
                    id_lop: classId,
                    thang: month,
                    id_tn: studentId,
                    diem: rawScore
                });
                const response = await fetch(scoreForm.dataset.saveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Không thể lưu điểm kỷ luật.');
                }
                savedScores.set(studentId, rawScore || null);
                updateStudentSaved(studentId, rawScore !== '');
            }).then(() => {
                if (pendingSaves.get(studentId) === currentSave) setStatus('Đã lưu', true);
            }).catch(error => {
                if (pendingSaves.get(studentId) === currentSave) {
                    setStatus(error.message || 'Lỗi lưu điểm kỷ luật', false);
                    window.showAppToast(error.message || 'Lỗi lưu điểm kỷ luật', 'error');
                }
                throw error;
            }).finally(() => {
                if (pendingSaves.get(studentId) === currentSave) {
                    pendingSaves.delete(studentId);
                    pendingScores.delete(studentId);
                }
            });
            pendingScores.set(studentId, rawScore);
            pendingSaves.set(studentId, currentSave);
            return currentSave;
        };

        scoreForm.querySelectorAll('.discipline-input').forEach(input => {
            const scheduleSave = () => {
                const previousTimer = saveTimers.get(input);
                if (previousTimer) clearTimeout(previousTimer);
                saveTimers.set(input, setTimeout(() => {
                    saveTimers.delete(input);
                    persistScore(input).catch(() => {});
                }, 400));
            };
            input.addEventListener('input', scheduleSave);
            input.addEventListener('change', () => {
                const timer = saveTimers.get(input);
                if (timer) clearTimeout(timer);
                saveTimers.delete(input);
                persistScore(input).catch(() => {});
            });
            input.addEventListener('blur', () => {
                const timer = saveTimers.get(input);
                if (!timer) return;
                clearTimeout(timer);
                saveTimers.delete(input);
                persistScore(input).catch(() => {});
            });
        });

        const flushAndWaitForSaves = async () => {
            for (const [input, timer] of saveTimers) {
                clearTimeout(timer);
                saveTimers.delete(input);
                persistScore(input).catch(() => {});
            }
            while (saveTimers.size || pendingSaves.size) {
                for (const [input, timer] of saveTimers) {
                    clearTimeout(timer);
                    saveTimers.delete(input);
                    persistScore(input).catch(() => {});
                }
                await Promise.all([...pendingSaves.values()]);
            }
        };

        const monthSelector = document.getElementById('discipline-month');
        monthSelector?.addEventListener('change', async () => {
            try {
                await flushAndWaitForSaves();
                monthSelector.form.submit();
            } catch (error) {
                setStatus(error.message || 'Không thể lưu điểm trước khi chuyển tháng.', false);
            }
        });

        scoreForm.addEventListener('submit', event => {
            event.preventDefault();
            flushAndWaitForSaves().catch(error => {
                setStatus(error.message || 'Không thể lưu điểm trước khi rời trang.', false);
            });
        });
    }

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
        stylesheet.href = '/css/output.css';

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
            appendCell(printDocument, headerRow, ` T${month}\n${year}`, 'th');
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