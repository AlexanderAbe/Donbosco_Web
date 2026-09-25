const pool = require('../../../config/database');

const LopModel = {
    async getAcademicYears(idGlv) {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getClasses(idGlv, yearId) {
        const { rows } = await pool.query(`
            SELECT l.id_lop, l.ten_lop, l.id_khoi, k.ten_khoi,
                   COUNT(pl.id_tn)::int AS student_count
            FROM PHAN_CONG_TRUONG_KHOI tk
            JOIN LOP_HOC l ON l.id_khoi = tk.id_khoi
                AND l.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            LEFT JOIN PHAN_LOP pl ON pl.id_lop = l.id_lop
                AND pl.id_cau_hinh_nam_hoc = l.id_cau_hinh_nam_hoc
            WHERE tk.id_glv = $1
              AND tk.id_cau_hinh_nam_hoc = $2
            GROUP BY l.id_lop, l.ten_lop, l.id_khoi, k.ten_khoi, k.stt
            ORDER BY l.ten_lop
        `, [idGlv, yearId]);

        for (const classItem of rows) {
            const result = await pool.query(`
                SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                       tn.gioi_tinh, TO_CHAR(tn.ngay_sinh, 'YYYY-MM-DD') AS ngay_sinh, tn.dia_chi, pl.trang_thai
                FROM PHAN_LOP pl
                JOIN THIEU_NHI tn ON tn.id_tn = pl.id_tn
                WHERE pl.id_lop = $1
                  AND pl.id_cau_hinh_nam_hoc = $2
                ORDER BY tn.ten, tn.ho_va_ten_lot, tn.ten_thanh
            `, [classItem.id_lop, yearId]);
            classItem.students = result.rows;
        }
        return rows;
    },

    async createStudent(idGlv, yearId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const classResult = await client.query(`
                SELECT l.id_lop
                FROM LOP_HOC l
                JOIN PHAN_CONG_TRUONG_KHOI tk ON tk.id_khoi = l.id_khoi
                    AND tk.id_cau_hinh_nam_hoc = l.id_cau_hinh_nam_hoc
                WHERE l.id_lop = $1
                  AND l.id_cau_hinh_nam_hoc = $2
                  AND tk.id_glv = $3
            `, [data.id_lop, yearId, idGlv]);
            if (!classResult.rows.length) throw new Error('Lớp không thuộc khối bạn phụ trách.');

            const studentResult = await client.query(`
                INSERT INTO THIEU_NHI (ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn)
                VALUES ($1, $2, $3, $4, $5, $6, NULLIF($7, ''))
                RETURNING id_tn
            `, [data.ten_thanh, data.ho_va_ten_lot, data.ten, data.gioi_tinh,
                data.ngay_sinh, data.dia_chi, data.mstn]);
            const idTn = studentResult.rows[0].id_tn;

            for (const parent of data.parents) {
                await client.query(`
                    INSERT INTO PHU_HUYNH (sdt, id_tn, ten_ph, moi_quan_he)
                    VALUES ($1, $2, $3, $4)
                `, [parent.sdt, idTn, parent.ten_ph, parent.moi_quan_he]);
            }

            for (const sacrament of data.sacraments) {
                await client.query(`
                    INSERT INTO BI_TICH (loai_bi_tich, ngay_lanh_nhan, id_tn)
                    VALUES ($1, $2, $3)
                `, [sacrament.loai_bi_tich, sacrament.ngay_lanh_nhan, idTn]);
            }

            await client.query(`
                INSERT INTO PHAN_LOP (id_tn, id_lop, id_cau_hinh_nam_hoc)
                VALUES ($1, $2, $3)
            `, [idTn, data.id_lop, yearId]);
            await client.query('COMMIT');
            return { id_tn: idTn };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getStudentDetail(idGlv, idTn, yearId) {
        const { rows } = await pool.query(`
            SELECT tn.id_tn, tn.mstn, tn.ten_thanh, tn.ho_va_ten_lot, tn.ten,
                   tn.gioi_tinh, TO_CHAR(tn.ngay_sinh, 'YYYY-MM-DD') AS ngay_sinh, tn.dia_chi, pl.trang_thai,
                   l.id_lop, l.ten_lop, k.ten_khoi
            FROM THIEU_NHI tn
            JOIN PHAN_LOP pl ON pl.id_tn = tn.id_tn
                AND pl.id_cau_hinh_nam_hoc = $2
            JOIN LOP_HOC l ON l.id_lop = pl.id_lop
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            JOIN PHAN_CONG_TRUONG_KHOI tk ON tk.id_khoi = l.id_khoi
                AND tk.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
            WHERE tn.id_tn = $1
              AND tk.id_glv = $3
            LIMIT 1
        `, [idTn, yearId, idGlv]);
        if (!rows.length) return null;

        const [parents, sacraments] = await Promise.all([
            pool.query('SELECT sdt, ten_ph, moi_quan_he FROM PHU_HUYNH WHERE id_tn = $1 ORDER BY id_phu_huynh', [idTn]),
            pool.query('SELECT loai_bi_tich, TO_CHAR(ngay_lanh_nhan, \'YYYY-MM-DD\') AS ngay_lanh_nhan FROM BI_TICH WHERE id_tn = $1 ORDER BY id_bi_tich', [idTn])
        ]);
        return { student: rows[0], parents: parents.rows, sacraments: sacraments.rows };
    },

    async updateStudent(idGlv, idTn, yearId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const access = await client.query(`
                SELECT pl.id_phan_lop
                FROM PHAN_LOP pl
                JOIN LOP_HOC l ON l.id_lop = pl.id_lop
                    AND l.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                JOIN PHAN_CONG_TRUONG_KHOI tk ON tk.id_khoi = l.id_khoi
                    AND tk.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                WHERE pl.id_tn = $1
                  AND pl.id_cau_hinh_nam_hoc = $2
                  AND tk.id_glv = $3
                LIMIT 1
            `, [idTn, yearId, idGlv]);
            if (!access.rows.length) throw new Error('Bạn không có quyền sửa học sinh này.');
            if (!String(data.ten || '').trim()) throw new Error('Tên thiếu nhi không được để trống.');
            if (!['Nam', 'Nữ'].includes(data.gioi_tinh)) throw new Error('Giới tính thiếu nhi không hợp lệ.');

            await client.query(`
                UPDATE THIEU_NHI
                SET ten_thanh = $1, ho_va_ten_lot = $2, ten = $3,
                    gioi_tinh = $4, ngay_sinh = $5, dia_chi = $6
                WHERE id_tn = $7
            `, [data.ten_thanh || null, data.ho_va_ten_lot || null, String(data.ten).trim(),
                data.gioi_tinh, data.ngay_sinh || null, data.dia_chi || null, idTn]);

            const statuses = ['Đang học', 'Chuyển xứ', 'Nghỉ học'];
            if (!statuses.includes(data.trang_thai)) throw new Error('Trạng thái thiếu nhi không hợp lệ.');
            await client.query('UPDATE PHAN_LOP SET trang_thai = $1 WHERE id_phan_lop = $2', [data.trang_thai, access.rows[0].id_phan_lop]);

            await client.query('DELETE FROM PHU_HUYNH WHERE id_tn = $1', [idTn]);
            for (const parent of Array.isArray(data.phu_huynh) ? data.phu_huynh : []) {
                if (String(parent.ten_ph || '').trim() || String(parent.sdt || '').trim()) {
                    await client.query(`
                        INSERT INTO PHU_HUYNH (sdt, id_tn, ten_ph, moi_quan_he)
                        VALUES ($1, $2, $3, $4)
                    `, [parent.sdt || null, idTn, parent.ten_ph || null, parent.moi_quan_he || null]);
                }
            }

            await client.query('DELETE FROM BI_TICH WHERE id_tn = $1', [idTn]);
            for (const sacrament of Array.isArray(data.bi_tich) ? data.bi_tich : []) {
                if (sacrament.loai_bi_tich && sacrament.ngay_lanh_nhan) {
                    await client.query(`
                        INSERT INTO BI_TICH (loai_bi_tich, ngay_lanh_nhan, id_tn)
                        VALUES ($1, $2, $3)
                    `, [sacrament.loai_bi_tich, sacrament.ngay_lanh_nhan, idTn]);
                }
            }

            await client.query('COMMIT');
            return { message: 'Đã cập nhật thông tin thiếu nhi.' };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async updateStatus(idGlv, idTn, yearId, status) {
        const statuses = ['Đang học', 'Chuyển xứ', 'Nghỉ học'];
        if (!statuses.includes(status)) throw new Error('Trạng thái thiếu nhi không hợp lệ.');
        const { rows } = await pool.query(`
            UPDATE PHAN_LOP pl
            SET trang_thai = $1
            FROM PHAN_CONG_TRUONG_KHOI tk
            JOIN LOP_HOC l ON l.id_khoi = tk.id_khoi
                AND l.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
            WHERE pl.id_tn = $2
              AND pl.id_cau_hinh_nam_hoc = $3
              AND pl.id_lop = l.id_lop
              AND tk.id_glv = $4
            RETURNING pl.trang_thai
        `, [status, idTn, yearId, idGlv]);
        if (!rows.length) throw new Error('Bạn không có quyền cập nhật thiếu nhi này.');
        return rows[0];
    },

    async transferStudent(idGlv, idTn, yearId, targetClassId) {
        const { rows } = await pool.query(`
            UPDATE PHAN_LOP pl
            SET id_lop = $1
            WHERE pl.id_tn = $2
              AND pl.id_cau_hinh_nam_hoc = $3
              AND EXISTS (
                  SELECT 1
                  FROM PHAN_CONG_TRUONG_KHOI tk
                  JOIN LOP_HOC source_class ON source_class.id_khoi = tk.id_khoi
                      AND source_class.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
                  JOIN LOP_HOC target_class ON target_class.id_lop = $1
                      AND target_class.id_cau_hinh_nam_hoc = $3
                      AND target_class.id_khoi = tk.id_khoi
                  WHERE tk.id_glv = $4
                    AND tk.id_cau_hinh_nam_hoc = $3
                    AND source_class.id_lop = pl.id_lop
              )
            RETURNING pl.id_lop
        `, [targetClassId, idTn, yearId, idGlv]);
        if (!rows.length) throw new Error('Không thể chuyển thiếu nhi sang lớp đã chọn.');
        return rows[0];
    }
};

module.exports = LopModel;