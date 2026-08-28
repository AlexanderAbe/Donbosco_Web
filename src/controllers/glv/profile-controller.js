const ProfileModel = require('../../models/glv/profile-model');

const ProfileController = {
    // 1. Hiển thị trang thông tin cá nhân
    async getProfile(req, res) {
        try {
            const id_glv = req.session.user?.id_glv;

            if (!id_glv) {
                return res.redirect('/auth/login');
            }

            const glv = await ProfileModel.getGlvById(id_glv);

            if (!glv) {
                return res.status(404).send('Không tìm thấy thông tin giáo lý viên');
            }

            // Xử lý định dạng ngày sinh chuẩn xác, tránh lệch múi giờ UTC
            let ngaySinhStr = '';
            if (glv.ngay_sinh) {
                const d = new Date(glv.ngay_sinh);
                if (!Number.isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    ngaySinhStr = `${year}-${month}-${day}`;
                }
            }
            glv.ngay_sinh_formatted = ngaySinhStr;

            res.render('glv/profile', {
                glv,
                success: req.query.success,
                error: req.query.error
            });
        } catch (error) {
            console.error('Lỗi tải trang profile:', error);
            res.status(500).send('Lỗi máy chủ');
        }
    },

    // 2. Xử lý cập nhật thông tin cá nhân
    async updateProfile(req, res) {
        const id_glv = req.session.user?.id_glv;

        try {
            if (!id_glv) {
                return res.redirect('/auth/login');
            }

            const { ten_thanh, ho_va_ten_lot, ten, ngay_sinh, gioi_tinh, sdt } = req.body;

            // Gọi model cập nhật (id_glv chỉ dùng trong điều kiện WHERE, không bị sửa)
            await ProfileModel.updateGlvProfile(id_glv, {
                ten_thanh,
                ho_va_ten_lot,
                ten,
                ngay_sinh,
                gioi_tinh,
                sdt
            });

            // Cập nhật lại số điện thoại hoặc họ tên trong session nếu hệ thống của bạn lưu trên session
            if (req.session.user) {
                req.session.user.sdt = sdt;
                req.session.user.ho_ten = `${ho_va_ten_lot} ${ten}`;
            }

            return res.redirect('/glv/profile?success=' + encodeURIComponent('Cập nhật thông tin thành công!'));
        } catch (error) {
            console.error('Lỗi cập nhật profile:', error);
            return res.redirect('/glv/profile?error=' + encodeURIComponent('Có lỗi xảy ra khi cập nhật thông tin!'));
        }
    }
};

module.exports = ProfileController;