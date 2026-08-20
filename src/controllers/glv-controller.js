exports.getDashboard = (req, res) => {
    res.render('glv/dashboard', { 
        title: 'Lớp Của Tôi - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout', 
        user: req.session.user
    });
};

exports.getDanhSachLop = (req, res) => {
    res.render('glv/danh-sach-lop', { 
        title: 'Danh sách thiếu nhi - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout',
        user: req.session.user 
    });
};

exports.getBangDiem = (req, res) => {
    res.render('glv/bang-diem', { 
        title: 'Bảng điểm lớp học - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout',
        user: req.session.user 
    });
};

exports.getKiemTra = (req, res) => {
    res.render('glv/kiem-tra', { 
        title: 'Nhập điểm kiểm tra - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout',
        user: req.session.user 
    });
};

exports.getDiemDanh = (req, res) => {
    res.render('glv/diem-danh', { 
        title: 'Điểm danh thiếu nhi - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout',
        user: req.session.user 
    });
};

exports.getKyLuat = (req, res) => {
    res.render('glv/ky-luat', { 
        title: 'Theo dõi kỷ luật - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout',
        user: req.session.user 
    });
};

exports.getChangePassword = (req, res) => {
    res.render('glv/change-password', { 
        title: 'Đổi mật khẩu - Xứ Đoàn Don Bosco',
        layout: 'layouts/glv-layout',
        user: req.session.user 
    });
};