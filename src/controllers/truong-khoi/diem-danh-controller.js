const { getTruongKhoiBaseData } = require('../../utils/base-data-helper');
const LopModel = require('../../models/truong-khoi/lop-model');
const DiemDanhModel = require('../../models/truong-khoi/diem-danh-model');
const { getCurrentYear } = require('../../utils/current-year-helper');

const normalizeStatus = (value = '') => {
    const status = (value || '').trim();
    if (status === 'Vắng phép' || status === 'Vắng có phép') return 'Vắng có phép';
    return status;
};

const formatDateKey = (value) => {
    if (!value) return 'unknown';
    return new Date(value).toISOString().slice(0, 10);
};

const formatDateVi = (value, options = {}) => {
    if (!value) return '-';
    return new Date(value).toLocaleDateString('vi-VN', options);
};

const buildAttendanceReport = (attendance = []) => {
    const normalized = [...attendance]
        .map((item) => ({
            ...item,
            _status: normalizeStatus(item.trang_thai),
            _fullName: [item.ten_thanh, item.ho_va_ten_lot, item.ten].filter(Boolean).join(' '),
            _dateKey: formatDateKey(item.ngay_diem_danh),
            _dateLabel: formatDateVi(item.ngay_diem_danh, { day: '2-digit', month: '2-digit', year: 'numeric' }),
            _dateGroupLabel: formatDateVi(item.ngay_diem_danh, { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })
        }))
        .sort((a, b) => {
            const nameA = (a.ten || '').trim().toLowerCase();
            const nameB = (b.ten || '').trim().toLowerCase();
            if (nameA !== nameB) return nameA.localeCompare(nameB, 'vi');

            const hoA = (a.ho_va_ten_lot || '').trim().toLowerCase();
            const hoB = (b.ho_va_ten_lot || '').trim().toLowerCase();
            return hoA.localeCompare(hoB, 'vi');
        });

    const summaryMap = new Map();
    normalized.forEach((item) => {
        const sessionKey = `${item._dateKey}|${item.loai_buoi || 'Buổi'}|${item.ten_lop || 'Chưa có lớp'}`;
        const current = summaryMap.get(sessionKey) || {
            dateKey: item._dateKey,
            dateLabel: item._dateLabel,
            loai_buoi: item.loai_buoi || 'Chưa xác định',
            ten_lop: item.ten_lop || 'Chưa có lớp',
            total: 0,
            'Đi sớm': 0,
            'Có mặt': 0,
            'Vắng có phép': 0,
            'Vắng không phép': 0
        };

        current.total += 1;
        current[item._status] = (current[item._status] || 0) + 1;
        summaryMap.set(sessionKey, current);
    });

    const summaryRows = [...summaryMap.values()].sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));

    const groupsByDate = new Map();
    normalized.forEach((item) => {
        if (!groupsByDate.has(item._dateKey)) {
            groupsByDate.set(item._dateKey, {
                dateKey: item._dateKey,
                label: item._dateGroupLabel,
                items: []
            });
        }

        groupsByDate.get(item._dateKey).items.push(item);
    });

    const dateGroups = [...groupsByDate.values()].sort((a, b) => new Date(b.dateKey) - new Date(a.dateKey));

    const stats = {
        total: normalized.length,
        present: normalized.filter((item) => ['Có mặt', 'Đi sớm'].includes(item._status)).length,
        excused: normalized.filter((item) => item._status === 'Vắng có phép').length,
        absent: normalized.filter((item) => item._status === 'Vắng không phép').length
    };

    return { attendance: normalized, summaryRows, dateGroups, stats };
};

const DiemDanhController = {
    async getPage(req, res) {
        try {
            const years = await LopModel.getAcademicYears(req.session.user.id_glv);
            const { selectedYearId } = getCurrentYear(years, req.session);
            const rawAttendance = selectedYearId
                ? await DiemDanhModel.getPageData(req.session.user.id_glv, selectedYearId)
                : [];

            const attendanceData = buildAttendanceReport(rawAttendance);

            return res.render('truong-khoi/diem-danh', {
                ...getTruongKhoiBaseData(req, 'Chi tiết điểm danh'),
                title: 'Quản lý điểm danh',
                selectedYearId,
                attendance: attendanceData.attendance,
                attendanceSummary: attendanceData.summaryRows,
                dateGroups: attendanceData.dateGroups,
                attendanceStats: attendanceData.stats
            });
        } catch (error) {
            console.error('Lỗi tải trang điểm danh:', error);
            return res.status(500).send('Lỗi server khi tải trang điểm danh.');
        }
    }
};

module.exports = DiemDanhController;
