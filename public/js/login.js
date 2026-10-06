const togglePassword = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('password');
        let hideTimeout = null;

        togglePassword.addEventListener('click', function () {
            // Kiểm tra xem input đang là password hay text
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);

            // Đổi icon con mắt mở / nhắm
            this.classList.toggle('fa-eye');
            this.classList.toggle('fa-eye-slash');

            // Nếu vừa chuyển sang hiện mật khẩu (type === 'text'), đặt đếm ngược 3 giây tự ẩn lại
            if (type === 'text') {
                // Xóa timeout cũ nếu người dùng bấm liên tục
                if (hideTimeout) clearTimeout(hideTimeout);

                hideTimeout = setTimeout(() => {
                    passwordInput.setAttribute('type', 'password');
                    togglePassword.classList.remove('fa-eye-slash');
                    togglePassword.classList.add('fa-eye');
                }, 3000); // 3000ms = 3 giây (bạn có thể thay đổi số này)
            } else {
                // Nếu người dùng bấm chủ động ẩn đi trước 3 giây thì hủy lệnh đếm ngược
                if (hideTimeout) clearTimeout(hideTimeout);
            }
        });
