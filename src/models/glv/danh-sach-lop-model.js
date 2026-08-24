const pool = require('../../../config/database');

const DanhSachLopModel = {
    async getStudentDetail(idGlv, idTn, yearId) {
        const access = await pool.query(`
            SELECT pl.id_phan_lop, l.ten_lop, k.ten_khoi, c.nien_khoa, pl.trang_thai
            FROM PHAN_LOP pl
            JOIN LOP_HOC l ON l.id_lop = pl.id_lop
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            JOIN CAU_HINH_NAM_HOC c ON c.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
            JOIN PHAN_CONG_GLV pc ON pc.id_lop = pl.id_lop
                AND pc.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
            WHERE pl.id_tn = $1
              AND pl.id_cau_hinh_nam_hoc = $2
              AND pc.id_glv = $3
            LIMIT 1
        `, [idTn, yearId, idGlv]);
        if (!access.rows.length) return null;

        const [student, parents, sacraments] = await Promise.all([
            pool.query(`
                SELECT id_tn, mstn, ten_thanh, ho_va_ten_lot, ten,
                       gioi_tinh, ngay_sinh, dia_chi
                FROM THIEU_NHI
                WHERE id_tn = $1
            `, [idTn]),
            pool.query(`
                SELECT id_phu_huynh, sdt, ten_thanh_ph, ten_ph, moi_quan_he
                FROM PHU_HUYNH
                WHERE id_tn = $1
                ORDER BY id_phu_huynh
            `, [idTn]),
            pool.query(`
                SELECT id_bi_tich, loai_bi_tich, ngay_lanh_nhan
                FROM BI_TICH
                WHERE id_tn = $1
                ORDER BY id_bi_tich
            `, [idTn])
        ]);

        return {
            student: { ...student.rows[0], ...access.rows[0] },
            parents: parents.rows,
            sacraments: sacraments.rows
        };
    },

    async updateStudent(idGlv, idTn, yearId, data) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            const access = await client.query(`
                SELECT pl.id_phan_lop
                FROM PHAN_LOP pl
                JOIN PHAN_CONG_GLV pc ON pc.id_lop = pl.id_lop
                    AND pc.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                WHERE pl.id_tn = $1
                  AND pl.id_cau_hinh_nam_hoc = $2
                  AND pc.id_glv = $3
                LIMIT 1
            `, [idTn, yearId, idGlv]);
            if (!access.rows.length) {
                const error = new Error('Bạn không có quyền sửa học sinh này.');
                error.code = 'FORBIDDEN';
                throw error;
            }

            const gender = ['Nam', 'Nữ'].includes(data.gioi_tinh) ? data.gioi_tinh : null;
            if (!String(data.ten || '').trim()) throw new Error('Tên thiếu nhi không được để trống.');
            await client.query(`
                UPDATE THIEU_NHI
                SET ten_thanh = $1, ho_va_ten_lot = $2, ten = $3,
                    gioi_tinh = $4, ngay_sinh = $5, dia_chi = $6
                WHERE id_tn = $7
            `, [data.ten_thanh || null, data.ho_va_ten_lot || null, String(data.ten).trim(),
                gender, data.ngay_sinh || null, data.dia_chi || null, idTn]);

            const statuses = ['Đang học', 'Chuyển xứ', 'Nghỉ học'];
            if (!statuses.includes(data.trang_thai)) throw new Error('Trạng thái thiếu nhi không hợp lệ.');
            await client.query(`
                UPDATE PHAN_LOP
                SET trang_thai = $1
                WHERE id_phan_lop = $2
            `, [data.trang_thai, access.rows[0].id_phan_lop]);

            await client.query('DELETE FROM PHU_HUYNH WHERE id_tn = $1', [idTn]);
            for (const parent of Array.isArray(data.phu_huynh) ? data.phu_huynh : []) {
                if (String(parent.ten_ph || '').trim() || String(parent.sdt || '').trim()) {
                    await client.query(`
                        INSERT INTO PHU_HUYNH (sdt, id_tn, ten_thanh_ph, ten_ph, moi_quan_he)
                        VALUES ($1, $2, $3, $4, $5)
                    `, [parent.sdt || null, idTn, parent.ten_thanh_ph || null,
                        parent.ten_ph || null, parent.moi_quan_he || null]);
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

    async updateStudentStatus(idGlv, idTn, yearId, status) {
        const statuses = ['Đang học', 'Chuyển xứ', 'Nghỉ học'];
        if (!statuses.includes(status)) throw new Error('Trạng thái thiếu nhi không hợp lệ.');
        const { rows } = await pool.query(`
            UPDATE PHAN_LOP pl
            SET trang_thai = $1
            FROM PHAN_CONG_GLV pc
            WHERE pl.id_tn = $2
              AND pl.id_cau_hinh_nam_hoc = $3
              AND pc.id_glv = $4
              AND pc.id_lop = pl.id_lop
              AND pc.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
            RETURNING pl.trang_thai
        `, [status, idTn, yearId, idGlv]);
        if (!rows.length) {
            const error = new Error('Bạn không có quyền cập nhật học sinh này.');
            error.code = 'FORBIDDEN';
            throw error;
        }
        return rows[0];
    }
};

module.exports = DanhSachLopModel;
