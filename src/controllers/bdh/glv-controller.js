const XLSX = require('xlsx');
const GlvModel = require('../../models/bdh/glv-model');
const { getBdhBaseData } = require('../../utils/base-data-helper');
const { logAction } = require('../../utils/logger');

const statuses = ['Đang hoạt động', 'Tạm nghỉ', 'Đã ngưng'];

const getYearId = (value, years) => {
    const id = Number.parseInt(value, 10);
    return years.some(year => year.id_cau_hinh_nam_hoc === id) ? id : years[0]?.id_cau_hinh_nam_hoc || null;
};

const redirect = (res, params, message, isError = false) => {
    const query = new URLSearchParams(params);
    if (message) query.set(isError ? 'error' : 'message', message);
    res.redirect(`/bdh/glv?${query.toString()}`);
};

const getProfileInput = body => ({
    tenThanh: String(body.ten_thanh || '').trim(),
    hoLot: String(body.ho_va_ten_lot || '').trim(),
    ten: String(body.ten || '').trim(),
    ngaySinh: body.ngay_sinh || '',
    gioiTinh: body.gioi_tinh || '',
    sdt: String(body.sdt || '').trim()
});

const parseImportDate = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime()))
        return value.toISOString().slice(0, 10);
    if (typeof value === "number") {
        const date = XLSX.SSF.parse_date_code(value);
        return date
            ? `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
            : "";
    }
    
    const textValue = String(value).trim();
    
    // Tách chuỗi theo các ký tự phân cách phổ biến: /, ., -
    const parts = textValue.split(/[-./]/);
    if (parts.length === 3) {
        let [p1, p2, p3] = parts;
        // Nếu định dạng YYYY-MM-DD
        if (p1.length === 4) {
            return `${p1}-${p2.padStart(2, "0")}-${p3.padStart(2, "0")}`;
        }
        // Nếu định dạng DD/MM/YYYY hoặc D/M/YYYY
        if (p3.length === 4) {
            return `${p3}-${p2.padStart(2, "0")}-${p1.padStart(2, "0")}`;
        }
    }

    const compact = textValue.replace(/[-./]/g, "");
    if (/^\d{8}$/.test(compact)) {
        return `${compact.slice(4, 8)}-${compact.slice(2, 4)}-${compact.slice(0, 2)}`;
    }

    if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) return textValue;
    return "";
};

const getImportValue = (row, names) => {
    const keys = Object.keys(row);
    // Chuẩn hóa danh sách tên cột cần tìm để khớp chính xác không phân biệt khoảng trắng/hoa thường
    const targetNames = names.map(n => n.trim().toLowerCase());
    const foundKey = keys.find(k => targetNames.includes(k.trim().toLowerCase()));
    return foundKey ? row[foundKey] : '';
};

const getImportInput = row => ({
    tenThanh: String(getImportValue(row, ['TEN_THANH', 'TÊN THÁNH', 'TEN THANH'])).trim(),
    hoLot: String(getImportValue(row, ['HO_VA_TEN_LOT', 'HỌ VÀ TÊN LÓT', 'HO VA TEN LOT'])).trim(),
    ten: String(getImportValue(row, ['TEN', 'TÊN'])).trim(),
    ngaySinh: parseImportDate(getImportValue(row, ['NGAY_SINH', 'NGÀY SINH', 'NGAY SINH'])),
    gioiTinh: String(getImportValue(row, ['GIOI_TINH', 'GIỚI TÍNH', 'GIOI TINH'])).trim(),
    sdt: String(getImportValue(row, ['SDT', 'SỐ ĐIỆN THOẠI', 'SO DIEN THOAI'])).trim(),
    trangThai: statuses[0]
});

const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return (
        !Number.isNaN(date.getTime()) &&
        date.toISOString().slice(0, 10) === value &&
        date <= new Date()
    );
};

const validateGlvInput = data => {
    const ten = String(data.ten || '').trim();
    const hoLot = String(data.hoLot || '').trim();
    const tenThanh = String(data.tenThanh || '').trim();
    const sdt = String(data.sdt || '').trim();

    if (!ten || ten.length > 50 || hoLot.length > 100 || tenThanh.length > 50 || sdt.length > 15) {
        return 'Tên, họ tên lót, thánh danh hoặc số điện thoại vượt quá độ dài cho phép.';
    }
    if (data.gioiTinh && !['Nam', 'Nữ'].includes(data.gioiTinh)) return 'Giới tính phải là Nam hoặc Nữ.';
    if (data.trangThai && !statuses.includes(data.trangThai)) return 'Tình trạng GLV không hợp lệ.';
    if (!isValidDate(data.ngaySinh)) return 'Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại.';
    if (!sdt) return 'Số điện thoại là bắt buộc.';
    return null;
};

const GlvController = {
    async getTrangQuanLy(req, res) {
        try {
            const years = await GlvModel.getAcademicYears();
            const yearId = getYearId(req.query.nien_khoa, years);
            const search = String(req.query.search || '').trim();
            const status = statuses.includes(req.query.trang_thai) ? req.query.trang_thai : statuses[0];
            const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 20, 10), 100);
            const requestedPage = Math.max(Number.parseInt(req.query.page, 10) || 1, 1);
            const result = await GlvModel.getAll(search, status, yearId, requestedPage, limit);
            const formattedRows = result.rows.map(glv => {
            let ngaySinhStr = '';
            if (glv.ngay_sinh) {
                const d = new Date(glv.ngay_sinh);
                if (!Number.isNaN(d.getTime())) {
                    const year = d.getFullYear();
                    const month = String(d.getMonth() + 1).padStart(2, '0');
                    const day = String(d.getDate()).padStart(2, '0');
                    ngaySinhStr = `${year}-${month}-${day}`; // Tạo chuỗi chuẩn "2003-02-03"
                }
            }
            return {
                ...glv,
                ngay_sinh: ngaySinhStr // Ghi đè lại thành chuỗi sạch
            };
            });
            const totalPages = Math.max(Math.ceil(result.total / limit), 1);
            const page = Math.min(requestedPage, totalPages);
            const queryString = new URLSearchParams({
                nien_khoa: yearId || '', search, trang_thai: status, limit
            }).toString();

            res.render('bdh/glv', {
                ...getBdhBaseData(req, 'Quản Lý Giáo Lý Viên'),
                years,
                selectedYearId: yearId,
                search,
                selectedStatus: status,
                statuses,
                glvList: formattedRows,
                page,
                limit,
                total: result.total,
                totalPages,
                queryString,
                message: req.query.message || null,
                error: req.query.error || null
            });
        } catch (error) {
            console.error('Lỗi tải trang quản lý GLV:', error);
            res.status(500).send('Lỗi server khi tải trang giáo lý viên.');
        }
    },

    async postUpdate(req, res) {
        const idGlv = Number.parseInt(req.params.id, 10);
        const params = {
            nien_khoa: req.body.nien_khoa || '',
            search: req.body.search || '',
            trang_thai: req.body.trang_thai_filter || ''
        };

        try {
            const data = getProfileInput(req.body);
            const validationError = validateGlvInput({ ...data, trangThai: statuses[0] });
            if (!Number.isInteger(idGlv) || validationError) {
                await logAction(req, `Cập nhật thông tin giáo lý viên (ID: ${req.params.id}) thất bại: ${validationError || 'ID không hợp lệ'}`, 'Thất bại');
                return redirect(res, params, validationError || 'Thông tin GLV không hợp lệ.', true);
            }
            await GlvModel.updateProfile(idGlv, data);

            await logAction(req, `Cập nhật thông tin giáo lý viên thành công (ID: ${idGlv})`, 'Thành công');
            redirect(res, params, 'Đã cập nhật thông tin GLV.');
        } catch (error) {
            console.error('Lỗi cập nhật GLV:', error);
            const errorMessage = error.code === '23505' ? 'Số điện thoại đã tồn tại.' : 'Không thể cập nhật thông tin GLV.';
            await logAction(req, `Cập nhật thông tin giáo lý viên (ID: ${idGlv}) thất bại: ${errorMessage}`, 'Thất bại');
            redirect(res, params, errorMessage, true);
        }
    },

    async postStatus(req, res) {
        const idGlv = Number.parseInt(req.params.id, 10);
        const status = req.body.trang_thai;
        const params = {
            nien_khoa: req.body.nien_khoa || '',
            search: req.body.search || '',
            trang_thai: req.body.trang_thai_filter || ''
        };

        try {
            if (!Number.isInteger(idGlv) || !statuses.includes(status)) {
                await logAction(req, `Cập nhật trạng thái giáo lý viên (ID: ${req.params.id}) thất bại: Trạng thái không hợp lệ`, 'Thất bại');
                return redirect(res, params, 'Trạng thái GLV không hợp lệ.', true);
            }
            await GlvModel.updateStatus(idGlv, status);

            await logAction(req, `Cập nhật trạng thái giáo lý viên thành công (ID: ${idGlv} -> ${status})`, 'Thành công');
            redirect(res, params, 'Đã cập nhật tình trạng GLV.');
        } catch (error) {
            console.error('Lỗi cập nhật tình trạng GLV:', error);
            await logAction(req, `Cập nhật trạng thái giáo lý viên (ID: ${idGlv}) thất bại do lỗi hệ thống`, 'Thất bại');
            redirect(res, params, 'Không thể cập nhật tình trạng GLV.', true);
        }
    },

    async postCreate(req, res) {
        const params = {
            nien_khoa: req.body.nien_khoa || '',
            search: req.body.search || '',
            trang_thai: req.body.trang_thai_filter || statuses[0]
        };

        try {
            const data = { ...getProfileInput(req.body), trangThai: req.body.trang_thai || statuses[0] };
            const validationError = validateGlvInput(data);
            if (validationError) {
                await logAction(req, `Thêm giáo lý viên mới thất bại: ${validationError}`, 'Thất bại');
                return redirect(res, params, validationError, true);
            }
            await GlvModel.create(data);

            await logAction(req, `Thêm giáo lý viên mới thành công (${data.hoLot} ${data.ten})`, 'Thành công');
            redirect(res, params, 'Đã thêm giáo lý viên mới.');
        } catch (error) {
            console.error('Lỗi thêm GLV:', error);
            const errorMessage = error.code === '23505' ? 'Số điện thoại đã tồn tại.' : 'Không thể thêm giáo lý viên.';
            await logAction(req, `Thêm giáo lý viên mới thất bại: ${errorMessage}`, 'Thất bại');
            redirect(res, params, errorMessage, true);
        }
    },

    async postImport(req, res) {
        const params = {
            nien_khoa: req.body.nien_khoa || '',
            search: req.body.search || '',
            trang_thai: req.body.trang_thai_filter || statuses[0]
        };

        try {
            // 1. Kiểm tra file upload từ Multer
            if (!req.file) {
                await logAction(req, `Import Excel giáo lý viên thất bại: Không chọn file`, 'Thất bại');
                return redirect(res, params, 'Vui lòng chọn file Excel.', true);
            }

            // 2. Đọc file Excel từ Buffer
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawRows = XLSX.utils.sheet_to_json(firstSheet, { defval: ''});

            if (!rawRows || !rawRows.length) {
                await logAction(req, `Import Excel giáo lý viên thất bại: File không có dữ liệu`, 'Thất bại');
                return redirect(res, params, 'File Excel không có dữ liệu.', true);
            }

            const dataList = [];

            // 3. Vòng lặp vừa đọc, vừa check dòng trống để break, vừa validate từng dòng giống Thiếu Nhi
            for (const [index, row] of rawRows.entries()) {
                const rowNumber = index + 2;

                // Kiểm tra nếu dòng trống hoàn toàn thì dừng lại mượt mà
                const isRowEmpty = Object.values(row).every(
                    value => value === undefined || value === null || String(value).trim() === ''
                );
                if (isRowEmpty) {
                    break;
                }

                const data = getImportInput(row);
                data.trangThai = statuses[0];

                // Validate từng dòng dữ liệu ngay trong vòng lặp
                const validationError = validateGlvInput(data);
                if (validationError) {
                    const errDetail = `Dòng Excel ${rowNumber}: ${validationError}`;
                    await logAction(req, `Import Excel giáo lý viên thất bại: ${errDetail}`, 'Thất bại');
                    return redirect(res, params, errDetail, true);
                }

                dataList.push(data);
            }

            if (!dataList.length) {
                await logAction(req, `Import Excel giáo lý viên thất bại: File không có dữ liệu hợp lệ`, 'Thất bại');
                return redirect(res, params, 'File Excel không có dữ liệu hợp lệ để import.', true);
            }

            // 4. Lưu dữ liệu xuống Database
            await GlvModel.createBulk(dataList);

            await logAction(req, `Import Excel thành công ${dataList.length} giáo lý viên`, 'Thành công');
            redirect(res, params, `Đã import thành công ${dataList.length} giáo lý viên.`);
        } catch (error) {
            console.error('Lỗi import GLV:', error);
            const errorMessage = error.code === '23505'
                ? 'File có số điện thoại trùng với dữ liệu hiện tại.'
                : (error.message || 'Không thể import file Excel. Hãy kiểm tra đúng mẫu dữ liệu.');
            
            await logAction(req, `Import Excel giáo lý viên thất bại do lỗi hệ thống`, 'Thất bại');
            redirect(res, params, errorMessage, true);
        }
    }
};

module.exports = GlvController;