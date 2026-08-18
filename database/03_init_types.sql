-- 1. Giới tính
CREATE TYPE enum_gioi_tinh AS ENUM ('Nam', 'Nữ');

-- 2. Trạng thái điểm danh hàng tuần
CREATE TYPE enum_diem_danh AS ENUM ('Có mặt', 'Đi sớm', 'Vắng phép', 'Vắng không phép');

-- 3. Kết quả tổng kết năm học (Đã gom gọn tất cả giá trị vào một chỗ)
CREATE TYPE enum_ket_qua AS ENUM ('Đạt', 'Chưa đạt', 'Chuyển xứ', 'Nghỉ học', 'Bảo lưu');

-- 4. Mối quan hệ của phụ huynh/người giám hộ với thiếu nhi
CREATE TYPE enum_moi_quan_he AS ENUM ('Cha', 'Mẹ', 'Ông', 'Bà', 'Cô', 'Chú', 'Bác', 'Người giám hộ');

-- 5. Các loại Bí tích
CREATE TYPE enum_bi_tich AS ENUM ('Rửa tội', 'Giải tội', 'Thánh thể', 'Thêm sức');

-- Tạo kiểu dữ liệu Enum cho tên khung xếp loại
CREATE TYPE enum_ten_xep_loai AS ENUM ('Xuất sắc','Giỏi', 'Khá', 'Trung Bình', 'Yếu');