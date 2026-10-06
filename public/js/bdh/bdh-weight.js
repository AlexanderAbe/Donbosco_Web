document.addEventListener('DOMContentLoaded', () => {
        // Lấy tất cả các thẻ input, select có thuộc tính required
        const requiredInputs = document.querySelectorAll('input[required], select[required], textarea[required]');

        requiredInputs.forEach(input => {
            // Khi người dùng bấm Lưu mà để trống (gây ra lỗi invalid)
            input.addEventListener('invalid', (e) => {
                e.target.setCustomValidity('Vui lòng không để trống trường này!');
            });

            // Khi người dùng bắt đầu gõ lại, xóa thông báo lỗi đi để form cho phép submit
            input.addEventListener('input', (e) => {
                e.target.setCustomValidity('');
            });
        });
    });
