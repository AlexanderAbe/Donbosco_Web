const LogModel = require('../models/admin/logs-model'); // Trỏ đường dẫn tới file model của bạn

/**
 * Hàm ghi log tiện ích
 * @param {Object} req - Request object để lấy thông tin session/user
 * @param {string} action - Mô tả hành động
 * @param {string} status - Trạng thái (Mặc định: Thành công)
 * @param {number|null} [explicitIdTk=null] - Truyền trực tiếp id_tk nếu muốn ép buộc (dùng cho lúc đăng nhập thất bại)
 */
async function logAction(req, action, status = 'Thành công', explicitIdTk = null) {
    try {
        // Nếu có truyền explicitIdTk trực tiếp, dùng nó. Nếu không, lấy từ session.
        const id_tk = (explicitIdTk !== null && explicitIdTk !== undefined)
            ? explicitIdTk 
            : (req.session && req.session.user && req.session.user.id_tk ? req.session.user.id_tk : null);
        
        // Gọi model để lưu vào DB
        await LogModel.createLog(id_tk, action, status);
    } catch (err) {
        console.error('❌ Lỗi tại logger helper:', err);
    }
}

/**
 * So sánh dữ liệu cũ và mới để ghi log thay đổi
 * @param {Object} oldObj - Dữ liệu cũ lấy từ DB
 * @param {Object} newObj - Dữ liệu mới từ req.body
 * @param {Array} fields - Danh sách các trường cần so sánh
 */
function getChangeLog(oldObj, newObj, fields) {
    let changes = [];
    fields.forEach(field => {
        // So sánh bằng chuỗi để tránh sai lệch kiểu dữ liệu (số vs chữ)
        if (newObj.hasOwnProperty(field) && String(oldObj[field] || '') !== String(newObj[field] || '')) {
            changes.push(`${field}: [${oldObj[field] || 'Trống'}] -> [${newObj[field]}]`);
        }
    });
    return changes.length > 0 ? changes.join(' | ') : null;
}

// Xuất cả 2 hàm để phòng trường hợp nơi khác dùng getChangeLog
module.exports = { logAction, getChangeLog };