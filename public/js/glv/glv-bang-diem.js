(() => {
    // --- TÍCH HỢP WEBSOCKET CHO TRANG BẢNG ĐIỂM ---
    const scorePage = document.getElementById('score-page');
    const yearId = scorePage?.dataset.yearId;
    const scoreRows = [...(scorePage?.querySelectorAll('[data-score-row]') || [])];
    const scoreCards = [...(scorePage?.querySelectorAll('[data-score-card]') || [])];
    const originalRowsByCard = new Map(scoreCards.map(card => [
        card,
        [...card.querySelectorAll('[data-score-row]')]
    ]));
    const retainedFilterButton = document.getElementById('filter-retained-students');
    const scoreRankingButton = document.getElementById('rank-student-scores');
    const scoreSubheader = document.getElementById('score-subheader');
    const scoreToolbarActions = document.getElementById('score-toolbar-actions');
    const retainedEmptyState = document.getElementById('score-retained-empty');
    const studentSearch = document.getElementById('score-student-search');
    let retainedFilterActive = false;
    let scoreRankingActive = false;

    const isRetained = row => [...row.querySelectorAll('[data-result-cell]')]
        .some(cell => cell.textContent.trim() === 'Ở lại lớp');
    const updateRetainedFilter = () => {
        scoreRows.forEach(row => {
            row.hidden = retainedFilterActive && !isRetained(row);
        });
        retainedFilterButton?.setAttribute('aria-pressed', String(retainedFilterActive));
        retainedFilterButton?.classList.toggle('is-active', retainedFilterActive);
        const mobileLabel = retainedFilterButton?.querySelector('[data-retained-filter-label-mobile]');
        const desktopLabel = retainedFilterButton?.querySelector('[data-retained-filter-label-desktop]');
        if (mobileLabel) mobileLabel.textContent = retainedFilterActive ? 'Bỏ lọc' : 'Ở lại';
        if (desktopLabel) desktopLabel.textContent = retainedFilterActive ? 'Hiện tất cả' : 'Lọc ở lại';

        if (retainedEmptyState) {
            const searchMatches = scoreRows.filter(row => !row.classList.contains('search-hidden'));
            const retainedMatches = searchMatches.some(isRetained);
            retainedEmptyState.hidden = !retainedFilterActive
                || !searchMatches.length
                || retainedMatches;
        }
        document.dispatchEvent(new Event('pagination:refresh'));
    };

    const updateScoreRanking = () => {
        let sortOrder = 0;
        scoreCards.forEach(card => {
            const originalRows = originalRowsByCard.get(card) || [];
            const originalPositions = new Map(originalRows.map((row, index) => [row, index]));
            const orderedRows = scoreRankingActive
                ? [...originalRows].sort((first, second) => {
                    const firstScore = Number(first.dataset.totalScore);
                    const secondScore = Number(second.dataset.totalScore);
                    const firstHasScore = first.dataset.totalScore !== '' && Number.isFinite(firstScore);
                    const secondHasScore = second.dataset.totalScore !== '' && Number.isFinite(secondScore);
                    if (firstHasScore !== secondHasScore) return firstHasScore ? -1 : 1;
                    if (firstHasScore && firstScore !== secondScore) return secondScore - firstScore;
                    return originalPositions.get(first) - originalPositions.get(second);
                })
                : originalRows;
            const tbody = card.querySelector('tbody');
            let previousScore = null;
            let previousRank = 0;

            orderedRows.forEach((row, index) => {
                if (tbody) tbody.append(row);
                row.dataset.scoreSortOrder = String(sortOrder++);
                let rank = String(originalPositions.get(row) + 1);
                if (scoreRankingActive) {
                    const score = row.dataset.totalScore === '' ? null : Number(row.dataset.totalScore);
                    if (score === null || !Number.isFinite(score)) {
                        rank = '-';
                    } else {
                        if (score !== previousScore) previousRank = index + 1;
                        rank = String(previousRank);
                        previousScore = score;
                    }
                }
                row.querySelectorAll('[data-score-student-number]').forEach(number => {
                    number.textContent = rank;
                });
            });
        });
        scoreRankingButton?.setAttribute('aria-pressed', String(scoreRankingActive));
        scoreRankingButton?.classList.toggle('is-active', scoreRankingActive);
        const mobileLabel = scoreRankingButton?.querySelector('[data-score-ranking-label-mobile]');
        const desktopLabel = scoreRankingButton?.querySelector('[data-score-ranking-label-desktop]');
        if (mobileLabel) mobileLabel.textContent = scoreRankingActive ? 'Bỏ hạng' : 'Xếp hạng';
        if (desktopLabel) desktopLabel.textContent = scoreRankingActive ? 'Bỏ xếp hạng' : 'Xếp hạng điểm';
        document.dispatchEvent(new Event('pagination:refresh'));
    };

    retainedFilterButton?.addEventListener('click', () => {
        retainedFilterActive = !retainedFilterActive;
        updateRetainedFilter();
    });
    studentSearch?.addEventListener('input', () => {
        if (retainedFilterActive) updateRetainedFilter();
    });
    scoreRankingButton?.addEventListener('click', () => {
        scoreRankingActive = !scoreRankingActive;
        updateScoreRanking();
    });
    let previousScrollY = window.scrollY;
    let scrollDirection = 0;
    let distanceInScrollDirection = 0;
    let pendingDirectionDelta = 0;
    let scrollUpdateScheduled = false;
    window.addEventListener('scroll', () => {
        if (scrollUpdateScheduled) return;
        scrollUpdateScheduled = true;
        window.requestAnimationFrame(() => {
            const currentScrollY = window.scrollY;
            const scrollDelta = currentScrollY - previousScrollY;
            const toolbarHasFocus = scoreToolbarActions?.contains(document.activeElement);
            const currentScrollDirection = Math.sign(scrollDelta);

            if (currentScrollY <= 120 || toolbarHasFocus) {
                scoreSubheader?.classList.remove('is-toolbar-collapsed');
                scrollDirection = 0;
                distanceInScrollDirection = 0;
                pendingDirectionDelta = 0;
            } else if (currentScrollDirection !== 0) {
                if (scrollDirection === 0) {
                    scrollDirection = currentScrollDirection;
                }

                if (currentScrollDirection === scrollDirection) {
                    pendingDirectionDelta = 0;
                    distanceInScrollDirection += Math.abs(scrollDelta);
                } else {
                    pendingDirectionDelta += Math.abs(scrollDelta);
                    if (pendingDirectionDelta >= 48) {
                        scrollDirection = currentScrollDirection;
                        distanceInScrollDirection = pendingDirectionDelta;
                        pendingDirectionDelta = 0;
                    }
                }

                if (
                    scrollDirection > 0
                    && !scoreSubheader?.classList.contains('is-toolbar-collapsed')
                    && distanceInScrollDirection >= 96
                ) {
                    scoreSubheader?.classList.add('is-toolbar-collapsed');
                    distanceInScrollDirection = 0;
                } else if (
                    scrollDirection < 0
                    && scoreSubheader?.classList.contains('is-toolbar-collapsed')
                    && distanceInScrollDirection >= 96
                ) {
                    scoreSubheader?.classList.remove('is-toolbar-collapsed');
                    distanceInScrollDirection = 0;
                }
            }

            previousScrollY = currentScrollY;
            scrollUpdateScheduled = false;
        });
    }, { passive: true });
    scoreToolbarActions?.addEventListener('focusin', () => {
        scoreSubheader?.classList.remove('is-toolbar-collapsed');
        scrollDirection = 0;
        distanceInScrollDirection = 0;
        pendingDirectionDelta = 0;
    });
    
    if (yearId) {
        const socket = io();
        
        // 1. Tham gia vào phòng riêng theo niên khóa
        socket.emit('join_room', `bang_diem_${yearId}`);

        let refreshTimer;
        let refreshRequest;
        socket.on('bang_diem_scores_updated', (data) => {
            if (String(data.yearId) !== String(yearId)) return;
            window.clearTimeout(refreshTimer);
            refreshTimer = window.setTimeout(async () => {
                if (refreshRequest) refreshRequest.abort();
                refreshRequest = new AbortController();
                try {
                    const response = await fetch(
                        `/glv/bang-diem/realtime-data?yearId=${encodeURIComponent(yearId)}`,
                        { signal: refreshRequest.signal }
                    );
                    const result = await response.json();
                    if (!response.ok) throw new Error(result.error || 'Không thể cập nhật bảng điểm.');

                    result.scores.forEach(student => {
                        const row = document.querySelector(
                            `tr[data-score-row][data-student-id="${student.id_tn}"][data-class-id="${student.id_lop}"]`
                        );
                        if (!row) return;

                        const scoreFields = {
                            learning: student.diem_hoc_tap,
                            attendance: student.diem_chuyen_can,
                            discipline: student.diem_ky_luat,
                            total: student.diem_tong
                        };
                        Object.entries(scoreFields).forEach(([field, value]) => {
                            row.dataset[`${field}Score`] = value ?? '';
                            const cells = row.querySelectorAll(`[data-score-field="${field}"]`);
                            const displayValue = value ?? '-';
                            cells.forEach(cell => {
                                const valueElement = cell.querySelector('.score-mobile-metric-value')
                                    || (field === 'total' ? cell.querySelector('strong') : null);
                                if (valueElement) {
                                    valueElement.textContent = displayValue;
                                } else {
                                    cell.textContent = displayValue;
                                }
                            });
                        });

                        const resultCells = row.querySelectorAll('[data-result-cell]');
                        if (resultCells.length) {
                            const result = student.tinh_trang || '-';
                            const isInactive = result !== 'Đang học' && result !== 'Lên lớp';
                            resultCells.forEach(resultCell => {
                                resultCell.textContent = result;
                                resultCell.classList.toggle('is-inactive', isInactive);
                            });
                        }
                        row.classList.add('bg-green-50', 'transition-colors');
                        window.setTimeout(() => row.classList.remove('bg-green-50'), 1000);
                    });
                    if (scoreRankingActive) updateScoreRanking();
                    if (retainedFilterActive) updateRetainedFilter();
                } catch (error) {
                    if (error.name !== 'AbortError') {
                        console.error('Không thể đồng bộ bảng điểm thời gian thực:', error);
                    }
                }
            }, 100);
        });

        // Lắng nghe sự kiện cập nhật kết quả từ các máy khác trong hệ thống
        socket.on('bang_diem_result_updated', (data) => {
            const { idTn, result } = data;
            
            // Tìm hàng (row) của thiếu nhi tương ứng
            const row = document.querySelector(`tr[data-student-id="${idTn}"]`);
            if (row) {
                // Cập nhật giá trị hiển thị ở ô kết quả
                row.querySelectorAll('[data-result-cell]').forEach(cell => {
                    cell.textContent = result;
                    cell.classList.remove('is-inactive');

                    // Hiệu ứng nháy xanh nhẹ nhận biết dữ liệu thay đổi từ xa
                    cell.classList.add('bg-green-100', 'transition-colors');
                    setTimeout(() => cell.classList.remove('bg-green-100'), 1000);
                });

                // Cập nhật luôn giá trị trong thẻ <select> (nếu ô đó đang không bị focus)
                row.querySelectorAll('[data-result-select]').forEach(select => {
                    if (document.activeElement !== select) {
                        select.value = result;
                    }
                });
                if (retainedFilterActive) updateRetainedFilter();
            }
        });
    }
    // ---------------------------------------------

    const printModal = document.getElementById('score-print-modal');
    const openPrintButton = document.getElementById('open-score-print');
    if (printModal && openPrintButton) {
        openPrintButton.addEventListener('click', () => printModal.showModal());
        printModal.querySelectorAll('[data-close-score-print]').forEach(button => {
            button.addEventListener('click', () => printModal.close());
        });

        const confirmPrintButton = document.getElementById('confirm-score-print');
        if (confirmPrintButton) {
            confirmPrintButton.addEventListener('click', async () => {
                const selectedTab = printModal.querySelector('[data-score-print-tab][aria-selected="true"]');
                const isPersonalPrint = selectedTab?.dataset.scorePrintTab === 'score-print-student-panel';
                const academicYear = document.getElementById('score-page')?.dataset.academicYear || '';
                const academicYearMatch = academicYear.match(/^(\d{4})-(\d{4})$/);
                if (isPersonalPrint && !academicYearMatch) {
                    window.alert('Không xác định được niên khóa để hiển thị năm cho điểm kỷ luật.');
                    return;
                }
                const selectedStudents = [...printModal.querySelectorAll('[data-score-student-option]:checked')]
                    .map(input => ({ id_tn: Number(input.value), id_lop: Number(input.dataset.classId) }));
                const allRows = [...document.querySelectorAll('[data-score-row]')];
                const rows = isPersonalPrint
                    ? allRows.filter(row => selectedStudents.some(student =>
                        String(student.id_tn) === row.dataset.studentId &&
                        String(student.id_lop) === row.dataset.classId
                    ))
                    : allRows;

                if (isPersonalPrint && !selectedStudents.length) {
                    window.alert('Vui lòng chọn ít nhất một thiếu nhi để in bảng điểm.');
                    return;
                }
                if (!rows.length && !isPersonalPrint) {
                    window.alert('Không có dữ liệu bảng điểm để in.');
                    return;
                }

                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                    window.alert('Trình duyệt đã chặn cửa sổ in. Vui lòng cho phép cửa sổ bật lên rồi thử lại.');
                    return;
                }

                const printDocument = printWindow.document;
                printDocument.title = 'Bảng điểm tổng hợp';
                printDocument.body.className = 'score-print-body';
                const stylesheet = printDocument.createElement('link');
                stylesheet.rel = 'stylesheet';
                stylesheet.href = '/css/output.css';

                const printMain = printDocument.createElement('main');
                printMain.className = 'score-print-document';
                const watermark = printDocument.createElement('img');
                watermark.className = 'score-print-watermark';
                watermark.src = '/imgs/Logo.png';
                watermark.alt = '';
                watermark.setAttribute('aria-hidden', 'true');
                printMain.appendChild(watermark);
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
                const makePage = () => {
                    const page = printDocument.createElement('section');
                    page.className = 'score-print-page';
                    const parish = printDocument.createElement('p');
                    parish.className = 'score-print-parish';
                    parish.append('Giáo xứ Tân Thái Sơn');
                    parish.appendChild(printDocument.createElement('br'));
                    parish.append('Xứ đoàn Don Bosco');
                    page.appendChild(parish);
                    return page;
                };
                const appendTable = (page, headings, records, tableClass = '') => {
                    const table = printDocument.createElement('table');
                    table.className = `score-print-table ${tableClass}`.trim();
                    const header = printDocument.createElement('thead');
                    const headerRow = printDocument.createElement('tr');
                    headings.forEach(label => {
                        const cell = printDocument.createElement('th');
                        cell.textContent = label;
                        headerRow.appendChild(cell);
                    });
                    header.appendChild(headerRow);
                    table.appendChild(header);

                    const body = printDocument.createElement('tbody');
                    records.forEach(values => {
                        const tableRow = printDocument.createElement('tr');
                        values.forEach(value => {
                            const cell = printDocument.createElement('td');
                            cell.textContent = value === null || value === undefined || value === '' ? '-' : String(value);
                            tableRow.appendChild(cell);
                        });
                        body.appendChild(tableRow);
                    });
                    table.appendChild(body);
                    page.appendChild(table);
                };
                const appendClassPages = () => {
                    const classes = new Map();
                    rows.forEach(row => {
                        if (!classes.has(row.dataset.classId)) {
                            classes.set(row.dataset.classId, {
                                name: row.dataset.className,
                                rows: []
                            });
                        }
                        classes.get(row.dataset.classId).rows.push(row);
                    });

                    classes.forEach(classItem => {
                        const page = makePage();
                        const title = printDocument.createElement('h1');
                        title.textContent = `BẢNG ĐIỂM TRUNG BÌNH LỚP ${classItem.name.toLocaleUpperCase('vi')}`;
                        page.appendChild(title);

                        appendTable(
                            page,
                            ['Stt', 'MSTN', 'Tên thánh', 'Họ và tên lót', 'Tên', 'Học tập', 'Kỷ luật', 'Chuyên cần', 'Điểm tổng'],
                            classItem.rows.map((row, index) => {
                                const data = row.dataset;
                                return [
                                    index + 1,
                                    data.mstn,
                                    data.saintName,
                                    data.lastNames,
                                    data.firstName,
                                    data.learningScore,
                                    data.disciplineScore,
                                    data.attendanceScore,
                                    data.totalScore
                                ];
                            }),
                            'score-print-class-table'
                        );
                        printMain.appendChild(page);
                    });
                };
                const formatPrintDate = value => {
                    if (!value) return '-';
                    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})/);
                    return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
                };
                const appendPersonalPages = students => {
                    students.forEach(student => {
                        const page = makePage();
                        const title = printDocument.createElement('h1');
                        title.textContent = `BẢNG ĐIỂM ${[student.ten_thanh, student.ho_va_ten_lot, student.ten].filter(Boolean).join(' ').toLocaleUpperCase('vi')}`;
                        page.appendChild(title);

                        const studentInfo = printDocument.createElement('p');
                        studentInfo.className = 'score-print-student-info';
                        studentInfo.textContent = `MSTN: ${student.mstn || '-'} · Lớp: ${student.ten_lop || '-'} · Khối: ${student.ten_khoi || '-'}`;
                        page.appendChild(studentInfo);

                        const summaryHeading = printDocument.createElement('h2');
                        summaryHeading.textContent = 'BẢNG ĐIỂM TRUNG BÌNH';
                        page.appendChild(summaryHeading);
                        appendTable(
                            page,
                            ['MSTN', 'Tên thánh', 'Họ và tên lót', 'Tên', 'Học tập', 'Kỷ luật', 'Chuyên cần', 'Điểm tổng'],
                            [[
                                student.mstn,
                                student.ten_thanh,
                                student.ho_va_ten_lot,
                                student.ten,
                                student.diem_hoc_tap,
                                student.diem_ky_luat,
                                student.diem_chuyen_can,
                                student.diem_tong
                            ]],
                            'score-print-personal-summary'
                        );

                        const learningHeading = printDocument.createElement('h2');
                        learningHeading.textContent = 'LỊCH SỬ ĐIỂM HỌC TẬP';
                        page.appendChild(learningHeading);
                        const learningHistory = student.learning_history || [];
                        appendTable(
                            page,
                            ['Bài kiểm tra', 'Ngày kiểm tra', 'Điểm'],
                            learningHistory.length
                                ? learningHistory.map(item => [`Bài ${item.exam}`, formatPrintDate(item.date), item.score])
                                : [['-', 'Chưa có dữ liệu', '-']]
                        );

                        const attendanceHeading = printDocument.createElement('h2');
                        attendanceHeading.textContent = 'TỔNG SỐ BUỔI ĐIỂM DANH';
                        page.appendChild(attendanceHeading);
                        appendTable(page, ['Đi sớm', 'Đi trễ', 'Có mặt', 'Vắng không phép', 'Vắng có phép'], [[
                            student.early_count,
                            student.late_count,
                            student.present_count,
                            student.unexcused_count,
                            student.excused_count
                        ]]);

                        const disciplineHeading = printDocument.createElement('h2');
                        disciplineHeading.textContent = 'ĐIỂM KỶ LUẬT THEO THÁNG';
                        page.appendChild(disciplineHeading);
                        const disciplineByMonth = new Map(
                            (student.discipline_history || []).map(item => [Number(item.month), item.score])
                        );
                        const academicMonthOrder = [
                            ...Array.from({ length: 4 }, (_, index) => index + 9),
                            ...Array.from({ length: 8 }, (_, index) => index + 1)
                        ];
                        const savedDisciplineMonths = academicMonthOrder
                            .filter(month => disciplineByMonth.has(month))
                            .map(month => {
                                const calendarYear = Number(month >= 9 ? academicYearMatch[1] : academicYearMatch[2]);
                                return [`Tháng ${month}\n${calendarYear}`, disciplineByMonth.get(month)];
                            });
                        appendTable(
                            page,
                            ['Tháng', 'Điểm kỷ luật'],
                            savedDisciplineMonths.length ? savedDisciplineMonths : [['-', 'Chưa có dữ liệu']]
                        );
                        printMain.appendChild(page);
                    });
                };

                try {
                    if (isPersonalPrint) {
                        const response = await fetch('/glv/bang-diem/print-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ students: selectedStudents })
                        });
                        const data = await response.json();
                        if (!response.ok) throw new Error(data.error || 'Không thể tải lịch sử điểm cá nhân.');
                        appendPersonalPages(data.students);
                    } else {
                        appendClassPages();
                    }
                } catch (error) {
                    printWindow.close();
                    window.alert(error.message || 'Không thể chuẩn bị bảng điểm để in.');
                    return;
                }

                printDocument.body.appendChild(printMain);
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
                    window.alert('Không tải được kiểu in bảng điểm. Vui lòng thử lại.');
                    printWindow.close();
                }, { once: true });
                printDocument.head.appendChild(stylesheet);
                printModal.close();
            });
        }

        const multiselect = document.getElementById('score-student-multiselect');
        const multiselectToggle = document.getElementById('score-student-multiselect-toggle');
        const multiselectOptions = document.getElementById('score-student-multiselect-options');
        const multiselectLabel = document.getElementById('score-student-multiselect-label');
        const studentSearch = document.getElementById('score-print-student-search');
        const studentOptionList = document.getElementById('score-student-option-list');
        const noStudentResults = document.getElementById('score-student-no-results');
        if (
            multiselect &&
            multiselectToggle &&
            multiselectOptions &&
            multiselectLabel &&
            studentSearch &&
            studentOptionList &&
            noStudentResults
        ) {
            const studentOptions = [...studentOptionList.querySelectorAll('.score-student-option')];
            const normalizeName = value => String(value || '')
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .toLocaleLowerCase('vi')
                .trim();
            const updateSelectedCount = () => {
                const selectedCount = studentOptionList.querySelectorAll('[data-score-student-option]:checked').length;
                multiselectLabel.textContent = selectedCount
                    ? `Đã chọn ${selectedCount} trên ${studentOptions.length} người`
                    : 'Chọn thiếu nhi';
            };
            const updateStudentOptions = () => {
                const keyword = normalizeName(studentSearch.value);
                let visibleCount = 0;
                studentOptions
                    .sort((first, second) => {
                        const firstSelected = first.querySelector('[data-score-student-option]').checked;
                        const secondSelected = second.querySelector('[data-score-student-option]').checked;
                        return Number(secondSelected) - Number(firstSelected);
                    })
                    .forEach(option => {
                        const matches = normalizeName(option.dataset.studentName).includes(keyword);
                        option.hidden = !matches;
                        if (matches) visibleCount += 1;
                        studentOptionList.appendChild(option);
                    });
                noStudentResults.hidden = visibleCount > 0;
            };
            const closeOptions = () => {
                multiselectOptions.hidden = true;
                multiselectToggle.setAttribute('aria-expanded', 'false');
            };

            multiselectToggle.addEventListener('click', () => {
                const isOpening = multiselectOptions.hidden;
                multiselectOptions.hidden = !isOpening;
                multiselectToggle.setAttribute('aria-expanded', String(isOpening));
                if (isOpening) studentSearch.focus();
            });
            multiselect.querySelectorAll('[data-score-student-option]').forEach(option => {
                option.addEventListener('change', () => {
                    updateSelectedCount();
                    updateStudentOptions();
                });
            });
            studentSearch.addEventListener('input', updateStudentOptions);
            printModal.addEventListener('click', event => {
                if (!multiselect.contains(event.target)) closeOptions();
            });
            multiselect.addEventListener('keydown', event => {
                if (event.key === 'Escape') closeOptions();
            });
            updateSelectedCount();
        }

        const tabs = [...printModal.querySelectorAll('[data-score-print-tab]')];
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(item => {
                    const isActive = item === tab;
                    item.classList.toggle('is-active', isActive);
                    item.setAttribute('aria-selected', String(isActive));
                    item.tabIndex = isActive ? 0 : -1;
                    printModal.querySelector(`#${item.dataset.scorePrintTab}`).hidden = !isActive;
                });
            });
        });
    }

    document.querySelectorAll('[data-result-save]').forEach(button => {
        button.addEventListener('click', async () => {
            const studentId = button.dataset.studentId;
            const select = button.closest('td')?.querySelector('[data-result-select]');
            if (!studentId || !select) return;
            button.disabled = true;
            try {
                const response = await fetch(`/glv/bang-diem/${studentId}/update-result`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ yearId, ket_qua: select.value })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.error || 'Không thể cập nhật kết quả.');
                
                const row = button.closest('tr');
                if (!row) return;
                row.querySelectorAll('[data-result-cell]').forEach(cell => {
                    cell.textContent = select.value;
                    cell.classList.remove('is-inactive');
                });
                if (retainedFilterActive) updateRetainedFilter();
            } catch (error) {
                window.alert(error.message);
            } finally {
                button.disabled = false;
            }
        });
    });
})();