const xlsx = require("xlsx");
const ThieuNhiModel = require("../../models/bdh/thieu-nhi-model");
const { getBdhBaseData } = require("../../utils/base-data-helper");
const { logAction } = require("../../utils/logger");
const validGenders = ["Nam", "Nữ"];
const sacramentColumns = [
  ["Rửa tội", ["NGÀY RỬA TỘI", "NGAY RUA TOI"]],
  [
    "Xưng tội & Rước lễ",
    [
      "NGÀY XƯNG TỘI RƯỚC LỄ",
      "NGÀY RƯỚC LỄ",
      "NGAY XUNG TOI RUOC LE",
      "NGAY RUOC LE",
    ],
  ],
  ["Thêm sức", ["NGÀY THÊM SỨC", "NGAY THEM SUC"]],
];
const getCell = (row, names) => {
  const key = Object.keys(row).find((item) =>
    names.includes(item.trim().toUpperCase()),
  );
  return key ? row[key] : "";
};
const parseImportDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime()))
    return value.toISOString().slice(0, 10);
  if (typeof value === "number") {
    const date = xlsx.SSF.parse_date_code(value);
    return date
      ? `${date.y}-${String(date.m).padStart(2, "0")}-${String(date.d).padStart(2, "0")}`
      : "";
  }
  const textValue = String(value || "")
    .trim()
    .replace(/[./]/g, "-");
  const compact = textValue.replace(/-/g, "");
  if (/^\d{8}$/.test(compact))
    return `${compact.slice(4)}-${compact.slice(2, 4)}-${compact.slice(0, 2)}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(textValue)) return textValue;
  return "";
};
const isValidDate = (value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value &&
    date <= new Date()
  );
};
const text = (value) => String(value ?? "").trim();
const getYearId = (value, years) => {
  const requestedId = Number.parseInt(value, 10);
  return years.some((year) => year.id_cau_hinh_nam_hoc === requestedId)
    ? requestedId
    : years[0]?.id_cau_hinh_nam_hoc || null;
};
const getPositiveInt = (value) => {
  const id = Number.parseInt(value, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};
const buildQuery = ({ yearId, khoiId, lopId, gender, search, page, limit }) => {
  const params = new URLSearchParams();
  if (yearId) params.set("nien_khoa", yearId);
  if (khoiId) params.set("id_khoi", khoiId);
  if (lopId) params.set("id_lop", lopId);
  if (gender) params.set("gioi_tinh", gender);
  if (search) params.set("search", search);
  if (page > 1) params.set("page", page);
  params.set("limit", limit);
  return params.toString();
};
const ThieuNhiController = {
  async getTrangQuanLy(req, res) {
    try {
      const years = await ThieuNhiModel.getAcademicYears();
      const yearId = getYearId(req.query.nien_khoa, years);
      const khoiId = getPositiveInt(req.query.id_khoi);
      const lopId = getPositiveInt(req.query.id_lop);
      const gender = validGenders.includes(req.query.gioi_tinh)
        ? req.query.gioi_tinh
        : "";
      const search = String(req.query.search || "").trim();
      const limit = Math.min(
        Math.max(getPositiveInt(req.query.limit) || 20, 10),
        100,
      );
      const requestedPage = Math.max(getPositiveInt(req.query.page) || 1, 1);
      const [khoiList, lopList, result] = await Promise.all([
        ThieuNhiModel.getKhoiList(),
        yearId ? ThieuNhiModel.getLopList(yearId) : Promise.resolve([]),
        yearId
          ? ThieuNhiModel.getPageData({
              yearId,
              khoiId,
              lopId,
              gender,
              search,
              page: requestedPage,
              limit,
            })
          : Promise.resolve({ rows: [], total: 0 }),
      ]);
      const formattedStudents = result.rows.map(item => {
        let ngaySinhDisplay = 'Chưa cập nhật';
        
        if (item.ngay_sinh) {
            // item.ngay_sinh lúc này đã là chuỗi 'YYYY-MM-DD' do PostgreSQL TO_CHAR trả về
            const parts = item.ngay_sinh.split('-');
            if (parts.length === 3) {
                const [year, month, day] = parts;
                ngaySinhDisplay = `${day}/${month}/${year}`;
            }
        }

        return {
            ...item,
            ngay_sinh: item.ngay_sinh || '', // Dùng chuẩn YYYY-MM-DD để đưa vào thuộc tính/input sửa
            ngay_sinh_hien_thi: ngaySinhDisplay // Dùng để hiển thị dạng DD/MM/YYYY ra bảng
        };
    });
      const totalPages = Math.max(Math.ceil(result.total / limit), 1);
      const page = Math.min(requestedPage, totalPages);
      const query = { yearId, khoiId, lopId, gender, search, page, limit };
      res.render("bdh/thieu-nhi", {
        ...getBdhBaseData(req, "Quản Lý Thiếu Nhi"),
        years,
        selectedYearId: yearId,
        khoiList,
        lopList,
        selectedKhoiId: khoiId,
        selectedLopId: lopId,
        selectedGender: gender,
        search,
        students: formattedStudents,
        total: result.total,
        page,
        limit,
        totalPages,
        queryString: buildQuery(query),
      });
    } catch (error) {
      console.error("Lỗi tải trang quản lý thiếu nhi:", error);
      res.status(500).send("Lỗi server khi tải trang thiếu nhi.");
    }
  },
  async getDetail(req, res) {
    try {
      const idTn = getPositiveInt(req.params.id);
      const yearId = getPositiveInt(req.query.nien_khoa);
      if (!idTn)
        return res.status(400).json({ error: "Mã thiếu nhi không hợp lệ." });
      const detail = await ThieuNhiModel.getDetail(idTn, yearId);
      if (!detail)
        return res.status(404).json({ error: "Không tìm thấy thiếu nhi." });
      res.json(detail);
    } catch (error) {
      console.error("Lỗi lấy chi tiết thiếu nhi:", error);
      res.status(500).json({ error: error.message });
    }
  },
  async importExcel(req, res) {
    try {
      // 1. Kiểm tra file upload từ Multer
      if (!req.file) {
        await logAction(
          req,
          `Import Excel thiếu nhi thất bại: Không chọn file`,
          "Thất bại",
        );
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn file Excel cần import!",
        });
      }
      // 2. Lấy id cấu hình năm học (nien_khoa) từ form gửi lên
      const years = await ThieuNhiModel.getAcademicYears();
      const yearId = getYearId(req.body.nien_khoa, years);
      if (!yearId) {
        await logAction(
          req,
          `Import Excel thiếu nhi thất bại: Niên khóa không hợp lệ`,
          "Thất bại",
        );
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn niên khóa hợp lệ để import!",
        });
      }
      const idLop = getPositiveInt(req.body.id_lop);
      const lopList = await ThieuNhiModel.getLopList(yearId);
      if (!idLop || !lopList.some((lop) => lop.id_lop === idLop)) {
        await logAction(
          req,
          `Import Excel thiếu nhi thất bại: Lớp học không hợp lệ`,
          "Thất bại",
        );
        return res.status(400).json({
          success: false,
          message: "Vui lòng chọn lớp hợp lệ để import!",
        });
      }
      // 3. Đọc file Excel trực tiếp từ Buffer (vì dùng memoryStorage)
      const workbook = xlsx.read(req.file.buffer, {
        type: "buffer",
        cellDates: true,
      });
      const sheetName = workbook.SheetNames[0];
      let sheetData = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], {
        defval: "",
      });
      if (!sheetData || sheetData.length === 0) {
        await logAction(
          req,
          `Import Excel thiếu nhi thất bại: File Excel không có dữ liệu`,
          "Thất bại",
        );
        return res.status(400).json({
          success: false,
          message: "File Excel không có dữ liệu hoặc định dạng không đúng!",
        });
      }
      const danhSach = [];
      for (const [index, row] of sheetData.entries()) {
        const rowNumber = index + 2;
        const isRowEmpty = Object.values(row).every(
          (value) => value === undefined || value === null || String(value).trim() === ""
        );
        if (isRowEmpty) {
          // Gặp dòng trống hoàn toàn thì dừng vòng lặp mượt mà tại đây, không quét tiếp nữa
          break;
        }
        const ngaySinh = parseImportDate(
          getCell(row, ["NGÀY SINH", "NGAY SINH"]),
        );
        const gioiTinh = text(getCell(row, ["GIỚI TÍNH", "GIOI TINH"]));
        const item = {
          mstn: text(getCell(row, ["MSTN"])) || null,
          tenThanh: text(getCell(row, ["TÊN THÁNH", "TEN THANH"])),
          hoVaTenLot: text(getCell(row, ["HỌ VÀ TÊN LÓT", "HO VA TEN LOT"])),
          ten: text(getCell(row, ["TÊN", "TEN"])),
          gioiTinh: validGenders.includes(gioiTinh) ? gioiTinh : "",
          ngaySinh,
          diaChi: text(getCell(row, ["ĐỊA CHỈ", "DIA CHI"])),
          idLop,
          phuHuynh: [],
          biTich: [],
        };
        for (let parentNumber = 1; parentNumber <= 2; parentNumber++) {
          const sdt = text(
            getCell(row, [
              `SĐT PHỤ HUYNH ${parentNumber}`,
              `SDT PHU HUYNH ${parentNumber}`,
            ]),
          );
          const tenPhuHuynh = text(
            getCell(row, [
              `TÊN PHỤ HUYNH ${parentNumber}`,
              `TEN PHU HUYNH ${parentNumber}`,
            ]),
          );
          const moiQuanHe =
            text(
              getCell(row, [
                `QUAN HỆ PH ${parentNumber}`,
                `QUAN HE PH ${parentNumber}`,
              ]),
            ) || "Cha/Mẹ";
          // Kiểm tra nếu có SĐT hoặc Tên phụ huynh thì thêm vào danh sách
          if (sdt || tenPhuHuynh) {
            item.phuHuynh.push({ sdt, tenPhuHuynh, moiQuanHe });
          }
        }
        for (const [loaiBiTich, columns] of sacramentColumns) {
          const rawDate = getCell(row, columns);
          if (rawDate !== "")
            item.biTich.push({
              loaiBiTich,
              ngayLanhNhan: parseImportDate(rawDate),
            });
        }
        const validationError = !item.ten
          ? "Thiếu tên."
          : !isValidDate(item.ngaySinh)
            ? "Ngày sinh không hợp lệ hoặc lớn hơn ngày hiện tại."
            : !validGenders.includes(item.gioiTinh)
              ? "Giới tính phải là Nam hoặc Nữ."
              : item.phuHuynh.length < 1
                ? "Phải có ít nhất 1 phụ huynh."
                : item.phuHuynh.some(
                      (parent) =>
                        !parent.tenPhuHuynh || !/^\d{9,15}$/.test(parent.sdt),
                    )
                  ? "Mỗi phụ huynh phải có tên và số điện thoại từ 9 đến 15 chữ số."
                  : item.biTich.some(
                        (sacrament) => !isValidDate(sacrament.ngayLanhNhan),
                      )
                    ? "Ngày bí tích không hợp lệ hoặc lớn hơn ngày hiện tại."
                    : null;
        if (validationError) {
          const errMessage = `Dòng Excel ${rowNumber}: ${validationError}`;
          await logAction(
            req,
            `Import Excel thiếu nhi thất bại: ${errMessage}`,
            "Thất bại",
          );
          throw new Error(errMessage);
        }
        danhSach.push(item);
      }
      // 5. Gọi hàm import trong Model
      const result = await ThieuNhiModel.importExcelData(danhSach, yearId);
      await logAction(
        req,
        `Import Excel thành công ${result.count} thiếu nhi vào lớp (ID: ${idLop})`,
        "Thành công",
      );
      return res.status(200).json({
        success: true,
        message: `Import thành công ${result.count} thiếu nhi!`,
      });
    } catch (error) {
      console.error("Lỗi import Excel thiếu nhi:", error);
      await logAction(
        req,
        `Import Excel thiếu nhi thất bại: ${error.message || "Lỗi hệ thống"}`,
        "Thất bại",
      );
      return res.status(500).json({
        success: false,
        message: error.message || "Lỗi server khi xử lý file Excel.",
      });
    }
  },
};
module.exports = ThieuNhiController;
