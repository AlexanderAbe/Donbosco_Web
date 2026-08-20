exports.getDashboard = (req, res) => {
    res.render('truong-khoi/dashboard', { 
        title: 'Tổng Quan Khối - Xứ Đoàn Don Bosco',
        layout: 'layouts/truong-khoi-layout', 
        user: req.session.user 
    });
};

exports.getLop = (req, res) => {
    res.render('truong-khoi/lop', { 
        title: 'Danh Sách Lớp Trong Khối - Xứ Đoàn Don Bosco',
        layout: 'layouts/truong-khoi-layout',
        user: req.session.user 
    });
};

exports.getPhanCongGlv = (req, res) => {
    res.render('truong-khoi/phan-cong-glv', { 
        title: 'Phân Công Giáo Lý Viên - Xứ Đoàn Don Bosco',
        layout: 'layouts/truong-khoi-layout',
        user: req.session.user 
    });
};

exports.getKiemTra = (req, res) => {
    res.render('truong-khoi/kiem-tra', { 
        title: 'Điểm Kiểm Tra Khối - Xứ Đoàn Don Bosco',
        layout: 'layouts/truong-khoi-layout',
        user: req.session.user 
    });
};

exports.getDiemDanh = (req, res) => {
    res.render('truong-khoi/diem-danh', { 
        title: 'Bảng Chuyên Cần Khối - Xứ Đoàn Don Bosco',
        layout: 'layouts/truong-khoi-layout',
        user: req.session.user 
    });
};

exports.getChangePassword = (req, res) => {
    res.render('truong-khoi/change-password', { 
        title: 'Đổi Mật Khẩu - Xứ Đoàn Don Bosco',
        layout: 'layouts/truong-khoi-layout',
        user: req.session.user 
    });
};