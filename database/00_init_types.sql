-- 1. Giới tính
CREATE TYPE enum_gioi_tinh AS ENUM ('Nam', 'Nữ');

-- 2. Trạng thái điểm danh hàng tuần
CREATE TYPE enum_diem_danh AS ENUM ('Có mặt', 'Đi sớm', 'Vắng phép', 'Vắng không phép');

-- 3. Kết quả tổng kết năm học
CREATE TYPE enum_ket_qua AS ENUM ('Lên lớp', 'Ở lại lớp');

-- 4. Trạng thái học tập của thiếu nhi theo niên khóa
CREATE TYPE enum_trang_thai_tn AS ENUM ('Đang học', 'Chuyển xứ', 'Nghỉ học');

-- 5. Mối quan hệ của phụ huynh/người giám hộ với thiếu nhi
CREATE TYPE enum_moi_quan_he AS ENUM ('Cha', 'Mẹ', 'Ông', 'Bà', 'Cô', 'Chú', 'Bác', 'Người giám hộ');

-- 5. Các loại Bí tích
CREATE TYPE enum_bi_tich AS ENUM ('Rửa tội', 'Xưng tội & Rước lễ', 'Thêm sức');

-- Tạo kiểu dữ liệu Enum cho tên khung xếp loại
CREATE TYPE enum_ten_xep_loai AS ENUM ('Xuất sắc','Giỏi', 'Khá', 'Trung Bình', 'Yếu');

CREATE TYPE trang_thai_enum AS ENUM ('Đang hoạt động', 'Đã khóa');

-- 7. Trạng thái hoạt động của giáo lý viên
CREATE TYPE enum_trang_thai_glv AS ENUM ('Đang hoạt động', 'Tạm nghỉ', 'Đã ngưng');

CREATE TYPE enum_loai_buoi AS ENUM ('Lễ Thứ 3', 'Lễ Thứ 5', 'Lễ Chúa Nhật', 'Học Giáo Lý');