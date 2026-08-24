const pool = require('../../../config/database');

const validGenders = ['Nam', 'Nữ'];

const ThieuNhiModel = {
    async getAcademicYears() {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getKhoiList() {
        const { rows } = await pool.query(`
            SELECT id_khoi, stt, ten_khoi
            FROM KHOI
            WHERE is_active = TRUE
            ORDER BY stt ASC, ten_khoi ASC
        `);
        return rows;
    },

    async getLopList(yearId) {
        const { rows } = await pool.query(`
            SELECT l.id_lop, l.ten_lop, l.id_khoi, k.ten_khoi, k.stt
            FROM LOP_HOC l
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE l.id_cau_hinh_nam_hoc = $1
            ORDER BY k.stt ASC, l.ten_lop ASC
        `, [yearId]);
        return rows;
    },

    async getPageData({ yearId, khoiId, lopId, gender, search, page, limit }) {
        const values = [yearId];
        const conditions = ['pl.id_cau_hinh_nam_hoc = $1'];

        if (khoiId) {
            values.push(khoiId);
            conditions.push(`l.id_khoi = $${values.length}`);
        }
        if (lopId) {
            values.push(lopId);
            conditions.push(`pl.id_lop = $${values.length}`);
        }
        if (validGenders.includes(gender)) {
            values.push(gender);
            conditions.push(`tn.gioi_tinh = $${values.length}`);
        }
        if (search) {
            values.push(`%${search}%`);
            conditions.push(`(
                CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) ILIKE $${values.length}
                OR tn.mstn ILIKE $${values.length}
                OR tn.gioi_tinh::TEXT ILIKE $${values.length}
                OR COALESCE(l.ten_lop, '') ILIKE $${values.length}
                OR COALESCE(k.ten_khoi, '') ILIKE $${values.length}
                OR EXISTS (
                    SELECT 1 FROM PHU_HUYNH ph
                    WHERE ph.id_tn = tn.id_tn
                      AND (ph.sdt ILIKE $${values.length} OR ph.ten_ph ILIKE $${values.length})
                )
            )`);
        }

        const countQuery = `
            SELECT COUNT(DISTINCT tn.id_tn)::int AS total
            FROM THIEU_NHI tn
            JOIN PHAN_LOP pl ON pl.id_tn = tn.id_tn
            JOIN LOP_HOC l ON l.id_lop = pl.id_lop
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE ${conditions.join(' AND ')}
        `;
        const countResult = await pool.query(countQuery, values);
        const total = countResult.rows[0].total;

        const offset = (page - 1) * limit;
        const listValues = [...values, limit, offset];
        const query = `
            SELECT
                tn.id_tn,
                tn.ten_thanh,
                tn.ho_va_ten_lot,
                tn.ten,
                CONCAT_WS(' ', tn.ten_thanh, tn.ho_va_ten_lot, tn.ten) AS ho_ten,
                tn.gioi_tinh,
                tn.ngay_sinh,
                tn.dia_chi,
                tn.mstn,
                l.id_lop,
                l.ten_lop,
                k.id_khoi,
                k.ten_khoi,
                pl.trang_thai,
                COUNT(*) OVER()::int AS filtered_total
            FROM THIEU_NHI tn
            JOIN PHAN_LOP pl ON pl.id_tn = tn.id_tn
            JOIN LOP_HOC l ON l.id_lop = pl.id_lop
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE ${conditions.join(' AND ')}
            ORDER BY k.stt ASC, l.ten_lop ASC, tn.ten ASC, tn.ho_va_ten_lot ASC
            LIMIT $${listValues.length - 1} OFFSET $${listValues.length}
        `;
        const { rows } = await pool.query(query, listValues);
        return { rows, total };
    },

    async getDetail(idTn, yearId) {
        const studentResult = await pool.query(`
            SELECT id_tn, ten_thanh, ho_va_ten_lot, ten,
                   CONCAT_WS(' ', ho_va_ten_lot, ten) AS ho_ten,
                   gioi_tinh, ngay_sinh, dia_chi, mstn
            FROM THIEU_NHI
            WHERE id_tn = $1
        `, [idTn]);

        if (!studentResult.rows.length) return null;

        const [classHistory, scores] = await Promise.all([
            pool.query(`
                SELECT c.nien_khoa, l.ten_lop, k.ten_khoi, pl.trang_thai
                FROM PHAN_LOP pl
                JOIN CAU_HINH_NAM_HOC c ON c.id_cau_hinh_nam_hoc = pl.id_cau_hinh_nam_hoc
                JOIN LOP_HOC l ON l.id_lop = pl.id_lop
                JOIN KHOI k ON k.id_khoi = l.id_khoi
                WHERE pl.id_tn = $1
                ORDER BY c.nien_khoa DESC
            `, [idTn]),
            pool.query(`
                SELECT c.nien_khoa, l.ten_lop, k.ten_khoi,
                       tk.diem_hoc_tap, tk.diem_chuyen_can, tk.diem_ky_luat,
                       tk.diem_tong, tk.tinh_trang, pl.trang_thai
                FROM TONG_KET_NAM_HOC tk
                LEFT JOIN CAU_HINH_NAM_HOC c ON c.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
                LEFT JOIN LOP_HOC l ON l.id_lop = tk.id_lop
                LEFT JOIN KHOI k ON k.id_khoi = l.id_khoi
                LEFT JOIN PHAN_LOP pl ON pl.id_tn = tk.id_tn
                    AND pl.id_lop = tk.id_lop
                    AND pl.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
                WHERE tk.id_tn = $1
                ORDER BY c.nien_khoa DESC NULLS LAST
            `, [idTn])
        ]);

        return {
            student: studentResult.rows[0],
            classHistory: classHistory.rows,
            scores: scores.rows,
            selectedYearId: yearId
        };
    },

    async importExcelData(danhSach, yearId) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            let importedCount = 0;

            for (const item of danhSach) {
                // Kiểm tra bắt buộc ngày sinh không được null/trống
                if (!item.ngaySinh || isNaN(new Date(item.ngaySinh).getTime())) {
                    throw new Error(`Thiếu hoặc sai định dạng ngày sinh cho thiếu nhi: ${item.hoVaTenLot} ${item.ten}`);
                }

                let idTn;
                
                // 1. Kiểm tra thiếu nhi qua MSTN
                if (item.mstn) {
                    const checkExist = await client.query(
                        `SELECT id_tn FROM THIEU_NHI WHERE mstn = $1`,
                        [item.mstn]
                    );
                    if (checkExist.rows.length > 0) {
                        idTn = checkExist.rows[0].id_tn;
                        await client.query(`
                            UPDATE THIEU_NHI 
                            SET ten_thanh = $1, ho_va_ten_lot = $2, ten = $3, gioi_tinh = $4, ngay_sinh = $5, dia_chi = $6
                            WHERE id_tn = $7
                        `, [item.tenThanh, item.hoVaTenLot, item.ten, item.gioiTinh, item.ngaySinh, item.diaChi, idTn]);
                    }
                }

                // 2. Insert mới nếu chưa có
                if (!idTn) {
                    const insertTnResult = await client.query(`
                        INSERT INTO THIEU_NHI (ten_thanh, ho_va_ten_lot, ten, gioi_tinh, ngay_sinh, dia_chi, mstn)
                        VALUES ($1, $2, $3, $4, $5, $6, $7)
                        RETURNING id_tn
                    `, [
                        item.tenThanh || null, 
                        item.hoVaTenLot || null, 
                        item.ten || null, 
                        item.gioiTinh || 'Nam', 
                        item.ngaySinh, 
                        item.diaChi || null, 
                        item.mstn || null 
                    ]);
                    
                    idTn = insertTnResult.rows[0].id_tn;
                }

                // 3. Xử lý Phân lớp
                if (item.idLop) {
                    const checkPhanLop = await client.query(`
                        SELECT id_phan_lop FROM PHAN_LOP 
                        WHERE id_tn = $1 AND id_cau_hinh_nam_hoc = $2
                    `, [idTn, yearId]);

                    if (checkPhanLop.rows.length > 0) {
                        await client.query(`
                            UPDATE PHAN_LOP SET id_lop = $1 
                            WHERE id_tn = $2 AND id_cau_hinh_nam_hoc = $3
                        `, [item.idLop, idTn, yearId]);
                    } else {
                        await client.query(`
                            INSERT INTO PHAN_LOP (id_tn, id_lop, id_cau_hinh_nam_hoc)
                            VALUES ($1, $2, $3)
                        `, [idTn, item.idLop, yearId]);
                    }
                }

                // 4. Xử lý danh sách Phụ huynh (Duyệt qua mảng phuHuynh)
                if (item.phuHuynh && item.phuHuynh.length > 0) {
                    for (const ph of item.phuHuynh) {
                        const checkPh = await client.query(`
                            SELECT id_phu_huynh FROM PHU_HUYNH WHERE id_tn = $1 AND sdt = $2
                        `, [idTn, ph.sdt || '']);

                        if (checkPh.rows.length > 0) {
                            await client.query(`
                                UPDATE PHU_HUYNH 
                                SET ten_thanh_ph = $1, ten_ph = $2, moi_quan_he = $3
                                WHERE id_phu_huynh = $4
                            `, [ph.tenThanhPhuHuynh, ph.tenPhuHuynh, ph.moiQuanHe, checkPh.rows[0].id_phu_huynh]);
                        } else {
                            await client.query(`
                                INSERT INTO PHU_HUYNH (sdt, id_tn, ten_thanh_ph, ten_ph, moi_quan_he)
                                VALUES ($1, $2, $3, $4, $5)
                            `, [ph.sdt || null, idTn, ph.tenThanhPhuHuynh || null, ph.tenPhuHuynh || null, ph.moiQuanHe]);
                        }
                    }
                }

                // 5. Xử lý danh sách Bí tích (Duyệt qua mảng biTich)
                if (item.biTich && item.biTich.length > 0) {
                    for (const bt of item.biTich) {
                        const checkBt = await client.query(`
                            SELECT id_bi_tich FROM BI_TICH WHERE id_tn = $1 AND loai_bi_tich = $2
                        `, [idTn, bt.loaiBiTich]);

                        if (checkBt.rows.length > 0) {
                            await client.query(`
                                UPDATE BI_TICH 
                                SET ngay_lanh_nhan = $1
                                WHERE id_bi_tich = $2
                            `, [bt.ngayLanhNhan, checkBt.rows[0].id_bi_tich]);
                        } else {
                            await client.query(`
                                INSERT INTO BI_TICH (loai_bi_tich, ngay_lanh_nhan, id_tn)
                                VALUES ($1, $2, $3)
                            `, [bt.loaiBiTich, bt.ngayLanhNhan, idTn]);
                        }
                    }
                }

                importedCount++;
            }

            await client.query('COMMIT');
            return { success: true, count: importedCount };
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = ThieuNhiModel;