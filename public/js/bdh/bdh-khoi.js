function openEditModal(id, stt, tenKhoi) {
        document.getElementById('edit_id_khoi').value = id;
        document.getElementById('edit_stt').value = stt;
        document.getElementById('edit_ten_khoi').value = tenKhoi;
        
        var editModal = new bootstrap.Modal(document.getElementById('modalSuaKhoi'));
        editModal.show();
    }

    // Lưu lại vị trí cuộn trước khi submit form
    document.addEventListener("DOMContentLoaded", function () {
        // Khôi phục lại vị trí cuộn cũ nếu có lưu trước đó
        const scrollPosition = sessionStorage.getItem("scrollPosition");
        if (scrollPosition) {
            window.scrollTo(0, parseInt(scrollPosition));
            sessionStorage.removeItem("scrollPosition"); // Xóa sau khi dùng xong
        }

        // Bắt sự kiện khi submit các form đổi trạng thái khóa/mở khóa
        const forms = document.querySelectorAll('form[action="/bdh/khoi/toggle"]');
        forms.forEach(form => {
            form.addEventListener("submit", function () {
                // Lưu tọa độ cuộn hiện tại vào bộ nhớ trình duyệt
                sessionStorage.setItem("scrollPosition", window.scrollY);
            });
        });
    });
