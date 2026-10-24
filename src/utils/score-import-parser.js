const SCORE_SHEETS = {
    exams: 'Kiểm tra',
    attendance: 'Chuyên cần',
    discipline: 'Kỷ luật'
};

const ATTENDANCE_LABELS = new Map([
    ['T3', 'Lễ Thứ 3'],
    ['T5', 'Lễ Thứ 5'],
    ['LE', 'Lễ Chúa Nhật'],
    ['GL', 'Học Giáo Lý'],
    ['LE CHUA NHAT', 'Lễ Chúa Nhật'],
    ['HOC GIAO LY', 'Học Giáo Lý'],
    ['LE THU 3', 'Lễ Thứ 3'],
    ['LE THU 5', 'Lễ Thứ 5']
]);

const ATTENDANCE_STATUSES = new Map([
    ['S', 'Đi sớm'],
    ['-', 'Có mặt'],
    ['V', 'Vắng không phép'],
    ['P', 'Vắng phép'],
    ['CO MAT', 'Có mặt'],
    ['DI SOM', 'Đi sớm'],
    ['VANG KHONG PHEP', 'Vắng không phép'],
    ['VANG PHEP', 'Vắng phép']
]);

const normalize = value => String(value ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .replace(/\s+/g, ' ')
    .toUpperCase();

const cellText = value => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').trim();
const isBlank = value => value == null || (typeof value === 'string' && value.trim() === '');

function parseDate(value, xlsx) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value.toISOString().slice(0, 10);
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
        const parsed = xlsx.SSF.parse_date_code(value);
        if (parsed) {
            return `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
        }
    }
    const text = cellText(value);
    let match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) match = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{4})$/);
    if (!match) return null;
    const [, first, second, third] = match;
    const [year, month, day] = /^\d{4}/.test(text)
        ? [Number(first), Number(second), Number(third)]
        : [Number(third), Number(second), Number(first)];
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() + 1 !== month
        || date.getUTCDate() !== day
    ) return null;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function parseScore(value, sheetName, rowNumber, columnNumber, errors) {
    if (isBlank(value)) return null;
    const score = typeof value === 'number' ? value : Number(String(value).trim().replace(',', '.'));
    if (
        !Number.isFinite(score)
        || score < 0
        || score > 10
        || Math.abs(score * 100 - Math.round(score * 100)) > 1e-8
    ) {
        errors.push(`${sheetName}, dòng ${rowNumber}, cột ${columnNumber}: điểm phải là số từ 0 đến 10, tối đa 2 chữ số thập phân.`);
        return null;
    }
    return score;
}

function readRows(xlsx, workbook, sheetName, errors, headerRows) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) {
        errors.push(`Thiếu sheet "${sheetName}".`);
        return [];
    }
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, raw: true, defval: '' });
    if (rows.length <= headerRows) {
        errors.push(`Sheet "${sheetName}" chưa có dữ liệu thiếu nhi.`);
        return rows;
    }
    return rows;
}

function parseStudents(rows, firstDataRow, sheetName, scoreColumns, errors, parseCell) {
    const students = [];
    const seen = new Set();
    for (let index = firstDataRow; index < rows.length; index += 1) {
        const row = rows[index] || [];
        if (row.every(isBlank)) continue;
        const rowNumber = index + 1;
        const mstn = cellText(row[1]);
        if (!mstn || mstn === '-') {
            errors.push(`${sheetName}, dòng ${rowNumber}: thiếu mã số thiếu nhi ở cột B.`);
            continue;
        }
        if (seen.has(mstn)) {
            errors.push(`${sheetName}, dòng ${rowNumber}: mã số "${mstn}" bị trùng trong sheet.`);
            continue;
        }
        seen.add(mstn);
        const values = [];
        for (const column of scoreColumns) {
            values.push(parseCell(row[column.index], rowNumber, column));
        }
        students.push({ rowNumber, mstn, values });
    }
    if (!students.length) errors.push(`Sheet "${sheetName}" không có dòng thiếu nhi hợp lệ.`);
    return students;
}

function parseWorkbook(xlsx, workbook, academicYear) {
    const errors = [];
    const sheetNames = workbook.SheetNames || [];
    const examRows = readRows(xlsx, workbook, SCORE_SHEETS.exams, errors, 2);
    const attendanceRows = readRows(xlsx, workbook, SCORE_SHEETS.attendance, errors, 2);
    const disciplineRows = readRows(xlsx, workbook, SCORE_SHEETS.discipline, errors, 1);
    for (const [rows, sheetName] of [
        [examRows, SCORE_SHEETS.exams],
        [attendanceRows, SCORE_SHEETS.attendance],
        [disciplineRows, SCORE_SHEETS.discipline]
    ]) {
        if (normalize(rows[0]?.[1]) !== 'MA SO' && normalize(rows[0]?.[1]) !== 'MA TN') {
            errors.push(`Sheet "${sheetName}", dòng 1: cột B phải là "Mã số" hoặc "Mã TN".`);
        }
    }

    const examColumns = [];
    for (let index = 5; index < (examRows[1] || []).length; index += 1) {
        const header = normalize(examRows[1][index]);
        if (isBlank(examRows[0]?.[index]) && !header) continue;
        const match = header.match(/^BAI\s*(\d+)$/);
        const number = match ? Number(match[1]) : null;
        const date = isBlank(examRows[0]?.[index]) ? null : parseDate(examRows[0][index], xlsx);
        if (!number || !date && !isBlank(examRows[0]?.[index])) {
            errors.push(`${SCORE_SHEETS.exams}, dòng 2, cột ${index + 1}: tiêu đề phải là "Bài số" và ngày kiểm tra ở dòng 1 phải hợp lệ.`);
            continue;
        }
        if (examColumns.some(column => column.number === number)) {
            errors.push(`${SCORE_SHEETS.exams}, dòng 2, cột ${index + 1}: bài kiểm tra ${number} bị trùng.`);
            continue;
        }
        examColumns.push({ index, number, date });
    }
    if (!examColumns.length) errors.push(`Sheet "${SCORE_SHEETS.exams}" cần có ít nhất một cột bài kiểm tra.`);
    const examStudents = parseStudents(
        examRows,
        2,
        SCORE_SHEETS.exams,
        examColumns,
        errors,
        (value, row, column) => parseScore(value, SCORE_SHEETS.exams, row, column.index + 1, errors)
    );

    const attendanceColumns = [];
    for (let index = 5; index < Math.max(attendanceRows[0]?.length || 0, attendanceRows[1]?.length || 0); index += 1) {
        const rawDate = attendanceRows[0]?.[index];
        const rawLabel = attendanceRows[1]?.[index];
        if (isBlank(rawDate) && isBlank(rawLabel)) continue;
        const date = parseDate(rawDate, xlsx);
        const type = ATTENDANCE_LABELS.get(normalize(rawLabel));
        if (!date || !type) {
            errors.push(`${SCORE_SHEETS.attendance}, cột ${index + 1}: cần ngày hợp lệ ở dòng 1 và ký hiệu buổi T3, T5, Lễ hoặc GL ở dòng 2.`);
            continue;
        }
        const weekday = new Date(`${date}T00:00:00Z`).getUTCDay();
        const expectedType = new Map([
            [0, ['Lễ Chúa Nhật', 'Học Giáo Lý']],
            [2, ['Lễ Thứ 3']],
            [4, ['Lễ Thứ 5']]
        ]).get(weekday) || [];
        if (!expectedType.includes(type)) {
            errors.push(`${SCORE_SHEETS.attendance}, cột ${index + 1}: loại buổi không khớp với ngày ${date}.`);
            continue;
        }
        if (attendanceColumns.some(column => column.date === date && column.type === type)) {
            errors.push(`${SCORE_SHEETS.attendance}, cột ${index + 1}: ngày và loại buổi bị trùng.`);
            continue;
        }
        attendanceColumns.push({ index, date, type });
    }
    if (!attendanceColumns.length) errors.push(`Sheet "${SCORE_SHEETS.attendance}" cần có ít nhất một cột buổi điểm danh.`);
    const attendanceStudents = parseStudents(
        attendanceRows,
        2,
        SCORE_SHEETS.attendance,
        attendanceColumns,
        errors,
        (value, row, column) => {
            if (isBlank(value)) return null;
            const status = ATTENDANCE_STATUSES.get(normalize(value));
            if (!status) {
                errors.push(`${SCORE_SHEETS.attendance}, dòng ${row}, cột ${column.index + 1}: trạng thái phải là S, -, V, P hoặc tên trạng thái hợp lệ.`);
            }
            return status || null;
        }
    );

    const disciplineColumns = [];
    for (let index = 5; index < (disciplineRows[0] || []).length; index += 1) {
        const header = normalize(disciplineRows[0][index]);
        if (!header) continue;
        const match = header.match(/^(?:THANG|T)\s*(\d{1,2})(?:\s+\d{4})?$/);
        const month = match ? Number(match[1]) : null;
        if (!month || month > 12) {
            errors.push(`${SCORE_SHEETS.discipline}, dòng 1, cột ${index + 1}: tiêu đề tháng không hợp lệ.`);
            continue;
        }
        if (disciplineColumns.some(column => column.month === month)) {
            errors.push(`${SCORE_SHEETS.discipline}, dòng 1, cột ${index + 1}: tháng ${month} bị trùng.`);
            continue;
        }
        disciplineColumns.push({ index, month });
    }
    if (!disciplineColumns.length) errors.push(`Sheet "${SCORE_SHEETS.discipline}" cần có ít nhất một cột tháng.`);
    const disciplineStudents = parseStudents(
        disciplineRows,
        1,
        SCORE_SHEETS.discipline,
        disciplineColumns,
        errors,
        (value, row, column) => parseScore(value, SCORE_SHEETS.discipline, row, column.index + 1, errors)
    );

    if (sheetNames.length !== 3 || Object.values(SCORE_SHEETS).some(name => !sheetNames.includes(name))) {
        errors.push(`Workbook phải có đúng 3 sheet: "${SCORE_SHEETS.exams}", "${SCORE_SHEETS.attendance}", "${SCORE_SHEETS.discipline}".`);
    }

    if (academicYear) {
        const match = String(academicYear).match(/^(\d{4})-(\d{4})$/);
        if (!match) {
            errors.push(`Niên khóa "${academicYear}" không đúng định dạng năm-năm.`);
        } else {
            const [startYear, endYear] = [Number(match[1]), Number(match[2])];
            if (endYear !== startYear + 1) errors.push(`Niên khóa "${academicYear}" không hợp lệ.`);
            for (const column of attendanceColumns) {
                const year = Number(column.date.slice(0, 4));
                const month = Number(column.date.slice(5, 7));
                if ((month >= 9 && year !== startYear) || (month < 9 && year !== endYear)) {
                    errors.push(`${SCORE_SHEETS.attendance}, cột ${column.index + 1}: ngày ${column.date} nằm ngoài niên khóa ${academicYear}.`);
                }
            }
            for (const column of examColumns) {
                if (column.date) {
                    const year = Number(column.date.slice(0, 4));
                    const month = Number(column.date.slice(5, 7));
                    if ((month >= 9 && year !== startYear) || (month < 9 && year !== endYear)) {
                        errors.push(`${SCORE_SHEETS.exams}, cột ${column.index + 1}: ngày ${column.date} nằm ngoài niên khóa ${academicYear}.`);
                    }
                }
            }
        }
    }

    return {
        errors,
        exams: { columns: examColumns, students: examStudents },
        attendance: { columns: attendanceColumns, students: attendanceStudents },
        discipline: { columns: disciplineColumns, students: disciplineStudents }
    };
}

module.exports = { parseWorkbook, SCORE_SHEETS };
