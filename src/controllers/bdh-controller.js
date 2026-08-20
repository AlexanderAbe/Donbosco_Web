exports.getDashboard = (req, res) => {
    res.render('bdh/dashboard', { 
        title: 'Ban Điều Hành - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getThieuNhi = (req, res) => {
    res.render('bdh/thieu-nhi', { 
        title: 'Quản lý Thiếu Nhi - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getGlv = (req, res) => {
    res.render('bdh/glv', { 
        title: 'Danh sách Giáo Lý Viên - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getPhanCong = (req, res) => {
    res.render('bdh/phan-cong', { 
        title: 'Phân công - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getKhoi = (req, res) => {
    res.render('bdh/khoi', { 
        title: 'Quản lý Khối - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getLop = (req, res) => {
    res.render('bdh/lop', { 
        title: 'Quản lý Lớp - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getBangDiem = (req, res) => {
    res.render('bdh/bang-diem', { 
        title: 'Bảng điểm - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getBangKhen = (req, res) => {
    res.render('bdh/bang-khen', { 
        title: 'Bằng khen - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};

exports.getChangePassword = (req, res) => {
    res.render('bdh/change-password', { 
        title: 'Đổi mật khẩu - Xứ Đoàn Don Bosco',
        layout: 'layouts/bdh-layout',
        user: req.session.user 
    });
};