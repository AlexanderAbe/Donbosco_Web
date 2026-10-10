(() => {
    const scoreForm = document.getElementById('score-form');
    const saveStatus = document.getElementById('score-save-status');
    const saveStatusText = document.getElementById('score-save-status-text');

    if (scoreForm && saveStatus && saveStatusText) {
        const dateInput = document.getElementById('test-date');
        const hiddenDateInput = scoreForm.querySelector('[name="ngay_kiem_tra"]');
        const scoreLayouts = [...scoreForm.querySelectorAll('[data-score-layout]')];
        const desktopLayout = window.matchMedia('(min-width: 768px)');
        const updateScoreLayout = () => {
            const hasExamDate = Boolean(dateInput?.value);
            scoreLayouts.forEach(layout => {
                const activeLayout = layout.dataset.scoreLayout === (desktopLayout.matches ? 'desktop' : 'mobile');
                layout.querySelectorAll('input').forEach(input => {
                    input.disabled = !activeLayout || !hasExamDate;
                });
            });
        };
        updateScoreLayout();
        desktopLayout.addEventListener('change', updateScoreLayout);
        dateInput?.addEventListener('change', () => {
            hiddenDateInput.value = dateInput.value;
            updateScoreLayout();
        });

        const pendingSaves = new Map();
        const saveTimers = new Map();
        const studentRows = [...scoreForm.querySelectorAll('[data-student-id][data-saved]')];
        const totalStudents = new Set(studentRows.map(row => row.dataset.studentId)).size;
        const savedStudents = new Set(studentRows
            .filter(row => row.dataset.saved === 'true')
            .map(row => row.dataset.studentId));
        const classId = scoreForm.dataset.classId;
        const yearId = scoreForm.dataset.yearId;
        const examNumber = scoreForm.dataset.examNumber;
        const socket = io();
        socket.emit('join_room', `exam_${yearId}_${classId}_${examNumber}`);

        const updateStudentSaved = (studentId, saved) => {
            scoreForm.querySelectorAll('[data-student-id]').forEach(row => {
                if (row.dataset.studentId === studentId) row.dataset.saved = String(saved);
            });
            if (saved) savedStudents.add(studentId);
            else savedStudents.delete(studentId);
        };

        const setStatus = (text, saved) => {
            const isFullySaved = saved && savedStudents.size === totalStudents;
            saveStatus.classList.toggle('is-saved', isFullySaved);
            saveStatus.classList.toggle('is-unsaved', !isFullySaved);
            saveStatus.classList.remove(
                'bg-emerald-50', 'text-emerald-700', 'border-emerald-200',
                'bg-amber-50', 'text-amber-700', 'border-amber-200'
            );
            saveStatus.classList.add(
                ...(isFullySaved
                    ? ['bg-emerald-50', 'text-emerald-700', 'border-emerald-200']
                    : ['bg-amber-50', 'text-amber-700', 'border-amber-200'])
            );
            saveStatus.querySelector('i').className = `fa-solid ${isFullySaved ? 'fa-circle-check' : 'fa-clock'}`;
            saveStatusText.textContent = `${text} · Đã lưu ${savedStudents.size}/${totalStudents}`;
        };

        socket.on('exam_score_updated', ({ studentId, score, saved }) => {
            const normalizedStudentId = String(studentId);
            const rows = scoreForm.querySelectorAll(`[data-student-id="${normalizedStudentId}"]`);
            if (!rows.length) return;

            updateStudentSaved(normalizedStudentId, saved);
            if (!pendingSaves.has(normalizedStudentId)
                && ![...saveTimers.keys()].some(input => input.closest('[data-student-id]')?.dataset.studentId === normalizedStudentId)) {
                rows.forEach(row => {
                    const input = row.querySelector('.score-input');
                    if (input && document.activeElement !== input) input.value = score ?? '';
                });
            }
            setStatus('Đã đồng bộ', true);
        });

        const persistScore = input => {
            const row = input.closest('[data-student-id]');
            const studentId = row?.dataset.studentId;
            const rawScore = input.value.trim();
            if (!studentId) return Promise.resolve();

            const score = Number(rawScore);
            if (!Number.isFinite(score) || score < 0 || score > 10) {
                setStatus('Điểm phải từ 0 đến 10', false);
                return Promise.reject(new Error('Điểm phải nằm trong khoảng từ 0 đến 10.'));
            }

            const previousSave = pendingSaves.get(studentId) || Promise.resolve();
            setStatus('Đang lưu...', false);
            let currentSave;
            currentSave = previousSave.catch(() => {}).then(async () => {
                const body = new URLSearchParams({
                    nien_khoa: scoreForm.dataset.yearId,
                    id_lop: scoreForm.dataset.classId,
                    bai_kiem_tra: scoreForm.dataset.examNumber,
                    id_tn: studentId,
                    diem_so: rawScore,
                    ngay_kiem_tra: scoreForm.querySelector('[name="ngay_kiem_tra"]').value
                });
                const response = await fetch(scoreForm.dataset.saveUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body
                });
                const result = await response.json();
                if (!response.ok || !result.success) {
                    throw new Error(result.message || 'Không thể lưu điểm kiểm tra.');
                }
                updateStudentSaved(studentId, rawScore !== '');
            }).then(() => {
                if (pendingSaves.get(studentId) === currentSave) setStatus('Đã lưu', true);
            }).catch(error => {
                if (pendingSaves.get(studentId) === currentSave) {
                    setStatus(error.message || 'Lỗi lưu điểm kiểm tra', false);
                }
                throw error;
            }).finally(() => {
                if (pendingSaves.get(studentId) === currentSave) pendingSaves.delete(studentId);
            });
            pendingSaves.set(studentId, currentSave);
            return currentSave;
        };

        scoreForm.querySelectorAll('.score-input').forEach(input => {
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

        const examSelector = document.getElementById('test-number');
        examSelector?.addEventListener('change', async () => {
            try {
                await flushAndWaitForSaves();
                examSelector.form.submit();
            } catch (error) {
                setStatus(error.message || 'Không thể lưu điểm trước khi chuyển bài.', false);
            }
        });

        scoreForm.addEventListener('submit', event => {
            event.preventDefault();
            flushAndWaitForSaves().catch(error => {
                setStatus(error.message || 'Không thể lưu điểm trước khi rời trang.', false);
            });
        });
    }

    const openButton = document.getElementById('open-exam-print');
    const printModal = document.getElementById('exam-print-modal');
    const fromSelect = document.getElementById('exam-print-from');
    const toSelect = document.getElementById('exam-print-to');
    const confirmButton = document.getElementById('confirm-exam-print');
    const rangeHint = document.getElementById('exam-print-range-hint');
    if (!openButton || !printModal || !fromSelect || !toSelect || !confirmButton) return;

    const updateExamRange = (changedSelect) => {
        const fromExam = Number(fromSelect.value);
        const toExam = Number(toSelect.value);
        if (toExam < fromExam) {
            if (changedSelect === fromSelect) {
                toSelect.value = fromSelect.value;
            } else {
                fromSelect.value = toSelect.value;
            }
        }
        const selectedFrom = Number(fromSelect.value);
        const selectedTo = Number(toSelect.value);
        [...toSelect.options].forEach(option => {
            const examNumber = Number(option.value);
            option.disabled = examNumber < selectedFrom;
        });
        [...fromSelect.options].forEach(option => {
            option.disabled = Number(option.value) > selectedTo;
        });
        rangeHint.textContent = `Đã chọn ${selectedTo - selectedFrom + 1} bài; niên khóa có ${Number(openButton.dataset.examCount)} bài kiểm tra.`;
    };

    fromSelect.addEventListener('change', () => updateExamRange(fromSelect));
    toSelect.addEventListener('change', () => updateExamRange(toSelect));
    updateExamRange(fromSelect);

    printModal.querySelectorAll('[data-close-exam-print]').forEach(button => {
        button.addEventListener('click', () => printModal.close());
    });
    openButton.addEventListener('click', () => printModal.showModal());

    const appendCell = (document, row, text, tagName = 'td') => {
        const cell = document.createElement(tagName);
        cell.textContent = text;
        row.appendChild(cell);
        return cell;
    };

    const buildPrintDocument = (printWindow, data) => {
        const printDocument = printWindow.document;
        printDocument.title = 'Bảng điểm kiểm tra';
        printDocument.body.className = 'exam-print-body';
        const stylesheet = printDocument.createElement('link');
        stylesheet.rel = 'stylesheet';
        stylesheet.href = '/css/output.css';

        const main = printDocument.createElement('main');
        main.className = 'exam-print-document';
        const watermark = printDocument.createElement('img');
        watermark.className = 'exam-print-watermark';
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
        parish.className = 'exam-print-parish';
        parish.append('Giáo xứ Tân Thái Sơn');
        parish.appendChild(printDocument.createElement('br'));
        parish.append('Xứ đoàn Don Bosco');
        main.appendChild(parish);

        const title = printDocument.createElement('h1');
        title.textContent = `BẢNG ĐIỂM KIỂM TRA · ${data.className.toLocaleUpperCase('vi')} · NIÊN KHÓA ${data.academicYear}`;
        main.appendChild(title);

        const table = printDocument.createElement('table');
        table.className = 'exam-print-table';
        const header = printDocument.createElement('thead');
        const dateRow = printDocument.createElement('tr');
        const examRow = printDocument.createElement('tr');
        ['STT', 'Mã số', 'Tên thánh', 'Họ và tên lót', 'Tên']
            .forEach(label => {
                const cell = appendCell(printDocument, dateRow, label, 'th');
                cell.rowSpan = 2;
            });
        for (let exam = data.fromExam; exam <= data.toExam; exam += 1) {
            const examDate = data.students
                .map(student => student.scores[exam]?.ngay_kiem_tra)
                .find(Boolean);
            const dateLabel = examDate
                ? `${examDate.slice(8, 10)}/${examDate.slice(5, 7)}/${examDate.slice(0, 4)}`
                : 'Chưa có ngày';
            appendCell(printDocument, dateRow, dateLabel, 'th');
            appendCell(printDocument, examRow, `Bài ${exam}`, 'th');
        }
        header.appendChild(dateRow);
        header.appendChild(examRow);
        table.appendChild(header);

        const body = printDocument.createElement('tbody');
        data.students.forEach((student, index) => {
            const row = printDocument.createElement('tr');
            appendCell(printDocument, row, String(index + 1));
            appendCell(printDocument, row, student.mstn || '-');
            appendCell(printDocument, row, student.ten_thanh || '');
            appendCell(printDocument, row, student.ho_va_ten_lot || '');
            appendCell(printDocument, row, student.ten || '');
            for (let exam = data.fromExam; exam <= data.toExam; exam += 1) {
                appendCell(printDocument, row, student.scores[exam]?.diem_so == null
                    ? ''
                    : String(student.scores[exam].diem_so));
            }
            body.appendChild(row);
        });
        table.appendChild(body);
        main.appendChild(table);
        printDocument.body.appendChild(main);

        stylesheet.addEventListener('load', () => {
            Promise.all([watermarkReady, printDocument.fonts.ready]).then(() => {
                printWindow.focus();
                printWindow.print();
            }).catch(error => {
                window.alert(error.message || 'Không thể tải nội dung trang in điểm kiểm tra.');
                printWindow.close();
            });
        }, { once: true });
        stylesheet.addEventListener('error', () => {
            window.alert('Không tải được kiểu in điểm kiểm tra. Vui lòng thử lại.');
            printWindow.close();
        }, { once: true });
        printDocument.head.appendChild(stylesheet);
    };

    confirmButton.addEventListener('click', async () => {
        const classId = Number(openButton.dataset.classId);
        const fromExam = Number(fromSelect.value);
        const toExam = Number(toSelect.value);
        if (!Number.isInteger(classId) || classId < 1
            || !Number.isInteger(fromExam) || !Number.isInteger(toExam)
            || fromExam < 1 || toExam < fromExam
            || toExam > Number(openButton.dataset.examCount)) {
            window.alert('Vui lòng chọn khoảng bài kiểm tra hợp lệ.');
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
            const response = await fetch('/glv/kiem-tra/print-data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id_lop: classId, bai_tu: fromExam, bai_den: toExam })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Không thể tải dữ liệu điểm kiểm tra.');
            buildPrintDocument(printWindow, data);
        } catch (error) {
            printWindow.close();
            window.alert(error.message || 'Không thể chuẩn bị bảng điểm kiểm tra để in.');
        } finally {
            confirmButton.disabled = false;
        }
    });
})();
