const pool = require('../../../config/database');

const PhanCongGlvModel = {
    async getPageData(idGlv, yearId) {
        // 1. Lấy danh sách lớp thuộc các khối mà Trưởng khối này phụ trách
        const { rows: classes } = await pool.query(`
            SELECT l.id_lop, l.ten_lop, k.ten_khoi, k.id_khoi
            FROM PHAN_CONG_TRUONG_KHOI tk
            JOIN LOP_HOC l ON l.id_khoi = tk.id_khoi
                AND l.id_cau_hinh_nam_hoc = tk.id_cau_hinh_nam_hoc
            JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE tk.id_glv = $1 AND tk.id_cau_hinh_nam_hoc = $2
            ORDER BY l.ten_lop
        `, [idGlv, yearId]);

        // Nếu khối không có lớp nào thì trả về mảng trống
        if (!classes.length) {
            return { classes: [], glvList: [] };
        }

        // Lấy danh sách id_khoi mà trưởng khối này quản lý
        const khoiIds = [...new Set(classes.map(c => c.id_khoi))];

        // 2. Lấy danh sách GLV chỉ thuộc phạm vi các khối mà trưởng khối quản lý
        // (Bao gồm GLV đã được phân công vào lớp thuộc khối HOẶC các GLV thuộc phạm vi khối đó)
        const { rows: glvList } = await pool.query(`
            SELECT DISTINCT g.id_glv, g.ten_thanh, g.ho_va_ten_lot, g.ten, 
                   TO_CHAR(g.ngay_sinh, 'YYYY-MM-DD') AS ngay_sinh,
                   g.gioi_tinh, g.sdt, g.trang_thai,
                   pc.id_lop AS assigned_class_id
            FROM GLV g
            LEFT JOIN PHAN_CONG_GLV pc ON pc.id_glv = g.id_glv AND pc.id_cau_hinh_nam_hoc = $1
            LEFT JOIN LOP_HOC l ON l.id_lop = pc.id_lop
            WHERE g.trang_thai = 'Đang hoạt động'
              AND (
                  l.id_khoi = ANY($2::int[])
                  -- Nếu hệ thống của bạn có bảng liên kết GLV trực tiếp với khối (ví dụ: PHAN_CONG_KHOI_GLV), 
                  -- bạn có thể mở rộng điều kiện OR ở đây để lấy cả những GLV chưa phân công lớp nhưng thuộc khối quản lý.
              )
            ORDER BY g.ten, g.ho_va_ten_lot, g.ten_thanh
        `, [yearId, khoiIds]);

        return { classes, glvList };
    },

    async getDetail(idGlv, yearId, teacherId) {
        // Sử dụng TO_CHAR cho hàm lấy chi tiết
        const { rows } = await pool.query(`
            SELECT g.id_glv, g.ten_thanh, g.ho_va_ten_lot, g.ten, 
                   TO_CHAR(g.ngay_sinh, 'YYYY-MM-DD') AS ngay_sinh,
                   g.gioi_tinh, g.sdt, g.trang_thai, l.ten_lop, k.ten_khoi
            FROM GLV g
            LEFT JOIN PHAN_CONG_GLV pc ON pc.id_glv = g.id_glv
                AND pc.id_cau_hinh_nam_hoc = $2
            LEFT JOIN LOP_HOC l ON l.id_lop = pc.id_lop
            LEFT JOIN KHOI k ON k.id_khoi = l.id_khoi
            WHERE g.id_glv = $1
              AND EXISTS (
                  SELECT 1 FROM PHAN_CONG_TRUONG_KHOI tk
                  WHERE tk.id_glv = $3
                    AND tk.id_cau_hinh_nam_hoc = $2
              )
            LIMIT 1
        `, [idGlv, yearId, teacherId]);
        return rows[0] || null;
    },

    async saveAll(teacherId, yearId, assignments) {
        // assignments nhận vào dạng object: { [id_glv]: id_lop }
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            // Đảm bảo assignments tồn tại và là object hợp lệ
            const entries = assignments && typeof assignments === 'object' ? Object.entries(assignments) : [];

            for (const [glvIdKey, lopIdVal] of entries) {
                const idGlv = Number.parseInt(glvIdKey, 10);
                const classId = lopIdVal ? Number.parseInt(lopIdVal, 10) : null;

                // Bỏ qua nếu id_glv không phải là số hợp lệ
                if (!idGlv || Number.isNaN(idGlv)) {
                    continue;
                }

                // Nếu có chọn lớp, kiểm tra xem lớp đó có thuộc khối do Trưởng khối phụ trách hay không
                if (classId) {
                    const { rows: checkRows } = await client.query(`
                        SELECT 1 
                        FROM LOP_HOC l
                        JOIN PHAN_CONG_TRUONG_KHOI tk ON tk.id_khoi = l.id_khoi 
                            AND tk.id_cau_hinh_nam_hoc = l.id_cau_hinh_nam_hoc
                        WHERE l.id_lop = $1 
                          AND tk.id_glv = $2 
                          AND tk.id_cau_hinh_nam_hoc = $3
                    `, [classId, teacherId, yearId]);

                    if (!checkRows.length) {
                        throw new Error(`Lớp ID ${classId} không thuộc khối bạn phụ trách.`);
                    }
                }

                // Xóa phân công cũ của GLV này trong năm học hiện tại
                await client.query(`
                    DELETE FROM PHAN_CONG_GLV 
                    WHERE id_glv = $1 AND id_cau_hinh_nam_hoc = $2
                `, [idGlv, yearId]);

                // Nếu có chọn lớp mới thì thêm bản ghi phân công mới
                if (classId) {
                    await client.query(`
                        INSERT INTO PHAN_CONG_GLV (id_glv, id_lop, id_cau_hinh_nam_hoc)
                        VALUES ($1, $2, $3)
                    `, [idGlv, classId, yearId]);
                }
            }

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    }
};

module.exports = PhanCongGlvModel;