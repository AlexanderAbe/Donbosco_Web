const DashboardModel = require('../../models/admin/dashboard-model');
const LogModel = require('../../models/admin/logs-model');
const { getAdminBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger');

exports.getDashboard = async (req, res) => {
    try {
        const [statsResult, logsResult] = await Promise.allSettled([
            DashboardModel.getDashboardStats(),
            LogModel.getRecentLogs(5)
        ]);
        if (statsResult.status === 'rejected') throw statsResult.reason;

        const recentLogs = logsResult.status === 'fulfilled' ? logsResult.value : [];
        const recentLogsError = logsResult.status === 'rejected'
            ? 'Không thể tải nhật ký gần đây. Vui lòng mở trang nhật ký để thử lại.'
            : null;
        if (logsResult.status === 'rejected') {
            console.error('Lỗi tải logs gần đây:', logsResult.reason);
        }

        res.render('admin/dashboard', {
            ...getAdminBaseData(req, 'Quản Trị Hệ Thống'),
            stats: statsResult.value,
            recentLogs,
            recentLogsError
        });
    } catch (error) {
        console.error('Lỗi Dashboard:', error);
        res.status(500).send('Lỗi máy chủ');
    }
};

exports.getAllLogs = async (req, res) => {
    const rawPage = Number.parseInt(req.query.page, 10);
    const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 1;
    const fromDate = typeof req.query.from === 'string' ? req.query.from : '';
    const toDate = typeof req.query.to === 'string' ? req.query.to : '';
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';

    let limit = Number.parseInt(req.query.limit, 10);
    if (![20, 50, 100].includes(limit)) {
        const ua = req.headers['user-agent'] || '';
        const isMobile = /mobile|android|iphone|ipad/i.test(ua);
        limit = isMobile ? 20 : 50;
    }

    const isValidDate = value => {
        if (!value) return true;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
        const date = new Date(`${value}T00:00:00Z`);
        return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    };
    const filterError = !isValidDate(fromDate) || !isValidDate(toDate) || (fromDate && toDate && fromDate > toDate)
        ? 'Khoảng ngày lọc không hợp lệ. Vui lòng kiểm tra ngày bắt đầu và ngày kết thúc.'
        : null;
    const paginationQuery = new URLSearchParams({ limit: String(limit), from: fromDate, to: toDate, search }).toString();

    try {
        const result = filterError
            ? { logs: [], totalRecords: 0, totalPages: 1, currentPage: 1 }
            : await LogModel.getLogsWithPagination(page, limit, fromDate, toDate, search);

        return res.render('admin/logs', {
            ...getAdminBaseData(req, 'Nhật ký hệ thống'),
            logs: result.logs,
            currentPage: result.currentPage,
            totalPages: result.totalPages,
            totalRecords: result.totalRecords,
            limit,
            fromDate,
            toDate,
            search,
            paginationQuery,
            logsError: filterError,
            success: req.query.success || null,
            error: req.query.error || null
        });
    } catch (error) {
        console.error('Lỗi trang Logs:', error);
        return res.status(500).render('admin/logs', {
            ...getAdminBaseData(req, 'Nhật ký hệ thống'),
            logs: [],
            currentPage: page,
            totalPages: 1,
            totalRecords: 0,
            limit,
            fromDate,
            toDate,
            search,
            paginationQuery,
            logsError: 'Không thể tải nhật ký. Vui lòng thử lại sau.',
            success: null,
            error: null
        });
    }
};

exports.clearAllLogs = async (req, res) => {
    try {
        await LogModel.clearAllLogs(req.session.user?.id_tk);
        return res.redirect('/admin/logs?success=' + encodeURIComponent('Đã xóa toàn bộ nhật ký hoạt động.'));
    } catch (error) {
        console.error('Lỗi xóa toàn bộ logs:', error);
        await logAction(req, `Xóa toàn bộ nhật ký hoạt động thất bại: ${error.message || 'Không thể xóa nhật ký.'}`, 'Thất bại');
        return res.redirect('/admin/logs?error=' + encodeURIComponent('Không thể xóa nhật ký hoạt động.'));
    }
};