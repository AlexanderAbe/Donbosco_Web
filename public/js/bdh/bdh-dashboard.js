document.addEventListener('DOMContentLoaded', function () {
    const btnOpenModal = document.getElementById('btnOpenModal');
    const selectEl = document.getElementById('selectNienKhoa');
    const textTarget = document.getElementById('selectedNienKhoaText');
    const btnConfirmSubmit = document.getElementById('btnConfirmSubmit');
    const formNienKhoa = document.getElementById('formNienKhoa');

    // Khởi tạo Bootstrap Modal (yêu cầu trang có nhúng Bootstrap JS)
    const myModal = new bootstrap.Modal(document.getElementById('confirmNienKhoaModal'));

    // Khi người dùng bấm nút "Áp dụng"
    btnOpenModal.addEventListener('click', function () {
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        
        // Đưa tên niên khóa vào trong text của Modal
        textTarget.textContent = selectedOption.text.trim();

        // Hiển thị Modal lên
        myModal.show();
    });

    // Khi người dùng bấm nút "Xác nhận" bên trong Modal
    btnConfirmSubmit.addEventListener('click', function () {
        formNienKhoa.submit(); // Tiến hành gửi form đi
    });
});
