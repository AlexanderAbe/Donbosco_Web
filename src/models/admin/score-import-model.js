const pool = require('../../../config/database');

const ScoreImportModel = {
    async getOptions() {
        const { rows: years } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa, COALESCE(so_luong_bai_ktra, 0)::int AS so_luong_bai_ktra
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return years;
    },

    async getClasses(yearId) {
        const { rows } = await pool.query(`
            SELECT id_lop, ten_lop
            FROM LOP_HOC
            WHERE id_cau_hinh_nam_hoc = $1
            ORDER BY ten_lop
        `, [yearId]);
        return rows;
    },

    async getContext(yearId, classId, queryable = pool) {
        const { rows: years } = await queryable.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa, COALESCE(so_luong_bai_ktra, 0)::int AS so_luong_bai_ktra
            FROM CAU_HINH_NAM_HOC
            WHERE id_cau_hinh_nam_hoc = $1
        `, [yearId]);
        const year = years[0];
        if (!year) throw new Error('Không tìm thấy niên khóa đã chọn.');

        const { rows: classes } = await queryable.query(`
            SELECT id_lop, ten_lop
            FROM LOP_HOC
            WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2
        `, [classId, yearId]);
        const classInfo = classes[0];
        if (!classInfo) throw new Error('Lớp không thuộc niên khóa đã chọn.');

        const { rows: students } = await queryable.query(`
            SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                   pl.trang_thai
            FROM PHAN_LOP pl
            JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
            WHERE pl.id_lop = $1 AND pl.id_cau_hinh_nam_hoc = $2
            ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
        `, [classId, yearId]);
        return { year, classInfo, students };
    },

    async getTemplateData(yearId, classId) {
        const context = await this.getContext(yearId, classId);
        const yearMatch = String(context.year.nien_khoa).match(/^(\d{4})-(\d{4})$/);
        if (!yearMatch) throw new Error('Niên khóa không đúng định dạng năm-năm.');
        const startDate = `${yearMatch[1]}-09-01`;
        const endDate = `${yearMatch[2]}-09-01`;
        const [examScores, disciplineScores, attendance] = await Promise.all([
            pool.query(`
                SELECT id_tn, stt_bai_ktra, TO_CHAR(ngay_kiem_tra, 'YYYY-MM-DD') AS ngay_kiem_tra, diem_so
                FROM DIEM_HOC_TAP
                WHERE id_cau_hinh_nam_hoc = $1 AND id_tn IN (
                    SELECT id_tn FROM PHAN_LOP WHERE id_lop = $2 AND id_cau_hinh_nam_hoc = $1
                )
            `, [yearId, classId]),
            pool.query(`
                SELECT id_tn, thang, diem
                FROM DIEM_KY_LUAT
                WHERE id_cau_hinh_nam_hoc = $1 AND id_tn IN (
                    SELECT id_tn FROM PHAN_LOP WHERE id_lop = $2 AND id_cau_hinh_nam_hoc = $1
                )
            `, [yearId, classId]),
            pool.query(`
                SELECT id_tn, TO_CHAR(ngay_diem_danh, 'YYYY-MM-DD') AS ngay_diem_danh,
                       loai_buoi, trang_thai
                FROM DIEM_DANH
                WHERE id_lop = $1
                  AND ngay_diem_danh >= $2::date
                  AND ngay_diem_danh < $3::date
            `, [classId, startDate, endDate])
        ]);
        return {
            ...context,
            examScores: examScores.rows,
            disciplineScores: disciplineScores.rows,
            attendance: attendance.rows
        };
    },

    async importWorkbook(yearId, classId, workbookData) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const context = await this.getContext(yearId, classId, client);
            const errors = [...workbookData.errors];
            const studentByCode = new Map(context.students.map(student => [String(student.mstn || '').trim(), student]));
            const resolveStudents = (sheet, rows) => rows.map(row => {
                const student = studentByCode.get(row.mstn);
                if (!student) {
                    errors.push(`${sheet}, dòng ${row.rowNumber}: mã số "${row.mstn}" không thuộc lớp ${context.classInfo.ten_lop} trong niên khóa ${context.year.nien_khoa}.`);
                    return null;
                }
                return { ...row, id_tn: student.id_tn };
            }).filter(Boolean);

            const examStudents = resolveStudents('Kiểm tra', workbookData.exams.students);
            const attendanceStudents = resolveStudents('Chuyên cần', workbookData.attendance.students);
            const disciplineStudents = resolveStudents('Kỷ luật', workbookData.discipline.students);
            for (const column of workbookData.exams.columns) {
                if (column.number > context.year.so_luong_bai_ktra) {
                    errors.push(`Kiểm tra: bài ${column.number} vượt quá số bài kiểm tra cấu hình (${context.year.so_luong_bai_ktra}).`);
                }
            }

            const yearMatch = String(context.year.nien_khoa).match(/^(\d{4})-(\d{4})$/);
            if (!yearMatch || Number(yearMatch[2]) !== Number(yearMatch[1]) + 1) {
                errors.push(`Niên khóa "${context.year.nien_khoa}" không đúng định dạng năm-năm liên tiếp.`);
            }
            const startYear = yearMatch ? Number(yearMatch[1]) : null;
            const endYear = yearMatch ? Number(yearMatch[2]) : null;

            const attendanceOverrides = new Map();
            for (const student of attendanceStudents) {
                for (let index = 0; index < workbookData.attendance.columns.length; index += 1) {
                    const column = workbookData.attendance.columns[index];
                    attendanceOverrides.set(
                        `${student.id_tn}|${column.date}|${column.type}`,
                        student.values[index]
                    );
                }
            }

            if (yearMatch) {
                const highDisciplineScores = [];
                for (const student of disciplineStudents) {
                    for (let index = 0; index < workbookData.discipline.columns.length; index += 1) {
                        if (student.values[index] === 10) {
                            highDisciplineScores.push({
                                id_tn: student.id_tn,
                                month: workbookData.discipline.columns[index].month,
                                rowNumber: student.rowNumber
                            });
                        }
                    }
                }
                if (highDisciplineScores.length) {
                    const studentIds = [...new Set(highDisciplineScores.map(item => item.id_tn))];
                    const { rows: existingAttendance } = await client.query(`
                        SELECT dd.id_tn, TO_CHAR(dd.ngay_diem_danh, 'YYYY-MM-DD') AS ngay_diem_danh,
                               dd.loai_buoi, dd.trang_thai
                        FROM DIEM_DANH dd
                        JOIN LOP_HOC lop ON lop.id_lop = dd.id_lop
                        WHERE dd.id_tn = ANY($1::int[])
                          AND lop.id_cau_hinh_nam_hoc = $2
                          AND dd.ngay_diem_danh >= make_date($3, 9, 1)
                          AND dd.ngay_diem_danh < make_date($4, 9, 1)
                    `, [studentIds, yearId, startYear, endYear]);
                    const effectiveAttendance = new Map(existingAttendance.map(row => [
                        `${row.id_tn}|${row.ngay_diem_danh}|${row.loai_buoi}`,
                        row.trang_thai
                    ]));
                    for (const [key, status] of attendanceOverrides) {
                        if (status === null) effectiveAttendance.delete(key);
                        else effectiveAttendance.set(key, status);
                    }
                    for (const score of highDisciplineScores) {
                        const scoreYear = score.month >= 9 ? startYear : endYear;
                        const monthAttendance = [...effectiveAttendance].filter(([key]) => {
                            const [idTn, date] = key.split('|');
                            return Number(idTn) === score.id_tn
                                && Number(date.slice(5, 7)) === score.month
                                && Number(date.slice(0, 4)) === scoreYear;
                        }).map(([, status]) => status);
                        if (
                            !monthAttendance.length
                            || monthAttendance.some(status => status !== 'Có mặt' && status !== 'Đi sớm')
                        ) {
                            errors.push(`Kỷ luật, dòng ${score.rowNumber}: 10 điểm chỉ được nhập khi thiếu nhi có ít nhất một buổi điểm danh và tất cả buổi trong tháng ${score.month} đều là có mặt hoặc đi sớm.`);
                        }
                    }
                }
            }

            if (errors.length) {
                const error = new Error('Workbook có dữ liệu không hợp lệ.');
                error.validationErrors = errors;
                throw error;
            }

            const examValues = [];
            const examClears = [];
            const disciplineValues = [];
            const disciplineClears = [];
            const attendanceValues = [];
            const attendanceClears = [];

            for (const student of examStudents) {
                for (let index = 0; index < workbookData.exams.columns.length; index += 1) {
                    const column = workbookData.exams.columns[index];
                    const score = student.values[index];
                    const value = {
                        id_tn: student.id_tn,
                        stt_bai_ktra: column.number,
                        diem_so: score,
                        ngay_kiem_tra: column.date
                    };
                    (score === null ? examClears : examValues).push(value);
                }
            }
            for (const student of disciplineStudents) {
                for (let index = 0; index < workbookData.discipline.columns.length; index += 1) {
                    const column = workbookData.discipline.columns[index];
                    const score = student.values[index];
                    const value = {
                        id_tn: student.id_tn,
                        thang: column.month,
                        diem: score
                    };
                    (score === null ? disciplineClears : disciplineValues).push(value);
                }
            }
            for (const student of attendanceStudents) {
                for (let index = 0; index < workbookData.attendance.columns.length; index += 1) {
                    const column = workbookData.attendance.columns[index];
                    const status = student.values[index];
                    const value = {
                        id_tn: student.id_tn,
                        ngay_diem_danh: column.date,
                        loai_buoi: column.type,
                        trang_thai: status
                    };
                    (status === null ? attendanceClears : attendanceValues).push(value);
                }
            }

            if (examClears.length) {
                await client.query(`
                    DELETE FROM DIEM_HOC_TAP dht
                    USING jsonb_to_recordset($1::jsonb) AS item(id_tn integer, stt_bai_ktra integer)
                    WHERE dht.id_tn = item.id_tn
                      AND dht.id_cau_hinh_nam_hoc = $2
                      AND dht.stt_bai_ktra = item.stt_bai_ktra
                `, [JSON.stringify(examClears), yearId]);
            }
            if (examValues.length) {
                await client.query(`
                    INSERT INTO DIEM_HOC_TAP (id_tn, id_cau_hinh_nam_hoc, stt_bai_ktra, diem_so, ngay_kiem_tra)
                    SELECT item.id_tn, $2, item.stt_bai_ktra, item.diem_so, item.ngay_kiem_tra::date
                    FROM jsonb_to_recordset($1::jsonb) AS item(
                        id_tn integer, stt_bai_ktra integer, diem_so numeric, ngay_kiem_tra text
                    )
                    ON CONFLICT (id_tn, id_cau_hinh_nam_hoc, stt_bai_ktra)
                    DO UPDATE SET diem_so = EXCLUDED.diem_so, ngay_kiem_tra = EXCLUDED.ngay_kiem_tra
                `, [JSON.stringify(examValues), yearId]);
            }

            if (attendanceClears.length) {
                await client.query(`
                    DELETE FROM DIEM_DANH dd
                    USING jsonb_to_recordset($1::jsonb) AS item(
                        id_tn integer, ngay_diem_danh date, loai_buoi text
                    )
                    WHERE dd.id_tn = item.id_tn
                      AND dd.id_lop = $2
                      AND dd.ngay_diem_danh = item.ngay_diem_danh
                      AND dd.loai_buoi = item.loai_buoi::enum_loai_buoi
                `, [JSON.stringify(attendanceClears), classId]);
            }
            if (attendanceValues.length) {
                await client.query(`
                    INSERT INTO DIEM_DANH (id_tn, id_lop, ngay_diem_danh, loai_buoi, trang_thai)
                    SELECT item.id_tn, $2, item.ngay_diem_danh::date,
                           item.loai_buoi::enum_loai_buoi, item.trang_thai::enum_diem_danh
                    FROM jsonb_to_recordset($1::jsonb) AS item(
                        id_tn integer, ngay_diem_danh text, loai_buoi text, trang_thai text
                    )
                    ON CONFLICT (ngay_diem_danh, loai_buoi, id_tn)
                    DO UPDATE SET trang_thai = EXCLUDED.trang_thai, id_lop = EXCLUDED.id_lop
                `, [JSON.stringify(attendanceValues), classId]);
            }

            if (attendanceStudents.length) {
                const attendanceIds = [...new Set(attendanceStudents.map(student => student.id_tn))];
                const months = [...new Set(workbookData.attendance.columns.map(column => Number(column.date.slice(5, 7))))];
                for (const idTn of attendanceIds) {
                    for (const month of months) {
                        const { rows } = await client.query(`
                            SELECT EXISTS (
                                SELECT 1
                                FROM DIEM_DANH dd
                                JOIN LOP_HOC lop ON lop.id_lop = dd.id_lop
                                WHERE dd.id_tn = $1
                                  AND lop.id_cau_hinh_nam_hoc = $2
                                  AND EXTRACT(MONTH FROM dd.ngay_diem_danh) = $3
                            ) AS has_attendance
                        `, [idTn, yearId, month]);
                        if (rows[0].has_attendance) {
                            await client.query('CALL sp_tinh_chuyen_can_thang($1, $2, $3)', [idTn, month, yearId]);
                        } else {
                            await client.query(`
                                DELETE FROM DIEM_CHUYEN_CAN
                                WHERE id_tn = $1
                                  AND thang = $2
                                  AND id_cau_hinh_nam_hoc = $3
                            `, [idTn, month, yearId]);
                        }
                    }
                }
            }

            if (disciplineClears.length) {
                await client.query(`
                    DELETE FROM DIEM_KY_LUAT dkl
                    USING jsonb_to_recordset($1::jsonb) AS item(id_tn integer, thang integer)
                    WHERE dkl.id_tn = item.id_tn
                      AND dkl.id_cau_hinh_nam_hoc = $2
                      AND dkl.thang = item.thang
                `, [JSON.stringify(disciplineClears), yearId]);
            }
            if (disciplineValues.length) {
                await client.query(`
                    INSERT INTO DIEM_KY_LUAT (id_tn, id_cau_hinh_nam_hoc, thang, diem)
                    SELECT item.id_tn, $2, item.thang, item.diem
                    FROM jsonb_to_recordset($1::jsonb) AS item(id_tn integer, thang integer, diem numeric)
                    ON CONFLICT (id_tn, id_cau_hinh_nam_hoc, thang)
                    DO UPDATE SET diem = EXCLUDED.diem
                `, [JSON.stringify(disciplineValues), yearId]);
            }

            await client.query(`
                UPDATE TONG_KET_NAM_HOC
                SET tinh_trang = NULL
                WHERE id_lop = $1 AND id_cau_hinh_nam_hoc = $2
            `, [classId, yearId]);
            await client.query('COMMIT');
            return {
                examScores: examValues.length,
                attendanceEntries: attendanceValues.length,
                disciplineScores: disciplineValues.length
            };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = ScoreImportModel;
