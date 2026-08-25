const pool = require('../../../config/database');

const GlvModel = {
    async create(data) {
        const { rows } = await pool.query(`
            INSERT INTO GLV (ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt, trang_thai)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING id_glv
        `, [data.tenThanh, data.hoLot, data.ten, data.ngaySinh || null, data.gioiTinh || null, data.sdt, data.trangThai]);
        return rows[0];
    },

    async createBulk(list) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query(`
                    INSERT INTO GLV (ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt, trang_thai)
                    SELECT item.ten_thanh, item.ho_lot, item.ten, item.ngay_sinh::date,
                           item.gioi_tinh, item.sdt, item.trang_thai
                    FROM jsonb_to_recordset($1::jsonb) AS item(
                        ten_thanh text, ho_lot text, ten text, ngay_sinh text,
                        gioi_tinh text, sdt text, trang_thai text
                    )
                `, [JSON.stringify(list.map(data => ({
                    ten_thanh: data.tenThanh,
                    ho_lot: data.hoLot,
                    ten: data.ten,
                    ngay_sinh: data.ngaySinh || null,
                    gioi_tinh: data.gioiTinh || null,
                    sdt: data.sdt,
                    trang_thai: data.trangThai
                })))]);
            await client.query('COMMIT');
            return list.length;
        } catch (error) {
            await client.query('ROLLBACK');
            throw error;
        } finally {
            client.release();
        }
    },

    async getAcademicYears() {
        const { rows } = await pool.query(`
            SELECT id_cau_hinh_nam_hoc, nien_khoa
            FROM CAU_HINH_NAM_HOC
            ORDER BY nien_khoa DESC
        `);
        return rows;
    },

    async getAll(search, status, yearId, page = 1, limit = 20) {
        const values = [yearId];
        const conditions = [];

        if (status && ['Đang hoạt động', 'Tạm nghỉ', 'Đã ngưng'].includes(status)) {
            values.push(status);
            conditions.push(`g.trang_thai = $${values.length}`);
        }

        if (search) {
            values.push(`%${search}%`);
            conditions.push(`(
                CONCAT_WS(' ', g.ten_thanh, g.ho_va_ten_lot, g.ten) ILIKE $${values.length}
                OR g.ten_thanh ILIKE $${values.length}
                OR g.sdt ILIKE $${values.length}
                OR COALESCE(k.ten_khoi, '') ILIKE $${values.length}
            )`);
        }

        const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT
                g.id_glv,
                g.ten_thanh,
                g.ho_va_ten_lot,
                g.ten,
                CONCAT_WS(' ', g.ten_thanh, g.ho_va_ten_lot, g.ten) AS ho_ten,
                g.ngay_sinh,
                g.gioi_tinh,
                g.sdt,
                g.trang_thai,
                COUNT(*) OVER()::int AS filtered_total,
                STRING_AGG(DISTINCT k.ten_khoi, ', ' ORDER BY k.ten_khoi) AS khoi_phu_trach
            FROM GLV g
            LEFT JOIN (
                SELECT pc.id_glv, pc.id_cau_hinh_nam_hoc, l.id_khoi
                FROM PHAN_CONG_GLV pc
                JOIN LOP_HOC l ON l.id_lop = pc.id_lop
                UNION
                SELECT pk.id_glv, pk.id_cau_hinh_nam_hoc, pk.id_khoi
                FROM PHAN_CONG_TRUONG_KHOI pk
            ) kp ON kp.id_glv = g.id_glv
                AND ($1::int IS NULL OR kp.id_cau_hinh_nam_hoc = $1)
            LEFT JOIN KHOI k ON k.id_khoi = kp.id_khoi
            ${whereClause}
            GROUP BY g.id_glv, g.ten_thanh, g.ho_va_ten_lot, g.ten,
                     g.ngay_sinh, g.gioi_tinh, g.sdt, g.trang_thai
            ORDER BY g.ten ASC, g.ho_va_ten_lot ASC, g.ten_thanh ASC
            LIMIT $${values.length + 1} OFFSET $${values.length + 2}
        `;
        const { rows } = await pool.query(query, [...values, limit, (page - 1) * limit]);
        return { rows, total: rows[0]?.filtered_total || 0 };
    },

    async updateProfile(idGlv, data) {
        const { rows } = await pool.query(`
            UPDATE GLV
            SET ten_thanh = $1,
                ho_va_ten_lot = $2,
                ten = $3,
                ngay_sinh = $4,
                gioi_tinh = $5,
                sdt = $6
            WHERE id_glv = $7
            RETURNING *
        `, [data.tenThanh, data.hoLot, data.ten, data.ngaySinh || null, data.gioiTinh || null, data.sdt || null, idGlv]);
        return rows[0];
    },

    async updateStatus(idGlv, status) {
        const { rows } = await pool.query(`
            UPDATE GLV
            SET trang_thai = $1
            WHERE id_glv = $2
            RETURNING id_glv, trang_thai
        `, [status, idGlv]);
        return rows[0];
    }
};

module.exports = GlvModel;
