login.html

| Class                    | Chức năng                                                      |
| ------------------------ | -------------------------------------------------------------- |
| `.login-page`            | Class của `body`, dùng để định dạng toàn bộ trang đăng nhập.   |
| `.login-card`            | Khung chính chứa logo và form đăng nhập.                       |
| `.logo-wrapper`          | Khung chứa logo.                                               |
| `.login-form`            | Form đăng nhập, chứa số điện thoại, mật khẩu và nút đăng nhập. |
| `.form-group`            | Nhóm một trường nhập liệu gồm label và input.                  |
| `.input-wrapper`         | Khung bao quanh icon và ô nhập liệu.                           |
| `.input-icon`            | Định dạng icon bên trong ô nhập liệu.                          |
| `.forgot-pass-container` | Khung chứa liên kết quên mật khẩu.                             |
| `.forgot-link`           | Link "Quên mật khẩu?".                                         |
| `.btn-login`             | Nút đăng nhập.                                                 |

| ID          | Chức năng             |
| ----------- | --------------------- |
| `#phone`    | Ô nhập số điện thoại. |
| `#password` | Ô nhập mật khẩu.      |


dashboard.html
| Class                   | Chức năng                                                                 |
| ----------------------- | ------------------------------------------------------------------------- |
| `.dashboard-page`       | Class của `body`, dùng để định dạng toàn bộ dashboard.                    |
| `.app-container`        | Container chính bao bọc toàn bộ ứng dụng.                                 |
| `.header`               | Header của dashboard.                                                     |
| `.header-left`          | Phần bên trái của header, chứa logo và thông tin giáo xứ.                 |
| `.logo-circle`          | Khung tròn chứa logo.                                                     |
| `.church-info`          | Hiển thị tên xứ đoàn và giáo xứ.                                          |
| `.header-center`        | Phần giữa header, chứa các nút chuyển chế độ.                             |
| `.mode-switch-group`    | Nhóm các nút chuyển chế độ.                                               |
| `.mode-btn`             | Nút chuyển giữa các chế độ `Nhập điểm`, `Xuất file`, `Quản lý Thiếu Nhi`. |
| `.active`               | Đánh dấu phần tử đang được chọn/đang hoạt động.                           |
| `.header-right`         | Phần bên phải header.                                                     |
| `.switch-btn`           | Nút `switch` ở bên phải header.                                           |
| `.main-body`            | Chứa sidebar và nội dung chính.                                           |
| `.sidebar`              | Thanh menu bên trái.                                                      |
| `.nav-menu`             | Khu vực menu điều hướng chính.                                            |
| `.nav-item`             | Một mục trong menu sidebar.                                               |
| `.bottom-menu`          | Khu vực menu phía dưới sidebar.                                           |
| `.bottom-link`          | Link ở cuối sidebar như đổi mật khẩu, đăng xuất.                          |
| `.content-area`         | Khu vực chứa nội dung chính.                                              |
| `.content-card`         | Card chính chứa search bar và dữ liệu.                                    |
| `.search-container`     | Container của thanh tìm kiếm.                                             |
| `.search-input-wrapper` | Khung chứa input tìm kiếm và nút search.                                  |
| `.search-btn-icon`      | Nút tìm kiếm bằng icon.                                                   |
| `.tab-section`          | Một section/tab hiển thị một loại dữ liệu.                                |
| `.hidden`               | Ẩn phần tử khỏi giao diện.                                                |
| `.table-header-action`  | Khu vực tiêu đề bảng và các nút điều khiển.                               |
| `.header-controls`      | Chứa các control như xuất PDF và chọn ngày.                               |
| `.btn-pdf`              | Nút xuất dữ liệu ra PDF.                                                  |
| `.custom-select`        | Dropdown chọn tháng/năm.                                                  |
| `.data-table`           | Style chung cho các bảng dữ liệu.                                         |
| `.action-circle`        | Vòng tròn dùng cho thao tác trên từng dòng dữ liệu.                       |

| ID                   | Chức năng                                          |
| -------------------- | -------------------------------------------------- |
| `#menuAttendance`    | Menu chuyển sang tab **Điểm danh**.                |
| `#menuTestScore`     | Menu chuyển sang tab **Điểm kiểm tra**.            |
| `#searchInput`       | Ô nhập từ khóa tìm kiếm.                           |
| `#dataContainer`     | Container chứa các section dữ liệu chính.          |
| `#sectionAttendance` | Section hiển thị dữ liệu **Điểm danh**.            |
| `#pdfBtnAttendance`  | Nút xuất PDF của tab Điểm danh.                    |
| `#dateAttendance`    | Dropdown chọn thời gian của tab Điểm danh.         |
| `#tableAttendance`   | Bảng dữ liệu Điểm danh.                            |
| `#sectionTestScore`  | Section hiển thị dữ liệu **Điểm kiểm tra**.        |
| `#pdfBtnTest`        | Nút xuất PDF của tab Điểm kiểm tra.                |
| `#dateTest`          | Dropdown chọn thời gian của tab Điểm kiểm tra.     |
| `#tableTestScore`    | Bảng dữ liệu Điểm kiểm tra.                        |
| `#manageContainer`   | Container hiển thị nội dung **Quản lý Thiếu Nhi**. |

| Attribute            | Chức năng                              |
| -------------------- | -------------------------------------- |
| `data-mode="input"`  | Xác định chế độ **Nhập điểm**.         |
| `data-mode="export"` | Xác định chế độ **Xuất file**.         |
| `data-mode="manage"` | Xác định chế độ **Quản lý Thiếu Nhi**. |
