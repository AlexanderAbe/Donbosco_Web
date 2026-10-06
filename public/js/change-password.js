// Lưu trữ các bộ đếm thời gian (timeout) riêng cho từng ô input để tránh xung đột
        const hideTimeouts = {};

        document.querySelectorAll('.toggle-password').forEach(icon => {
            icon.addEventListener('click', function () {
                const targetId = this.getAttribute('data-target');
                const passwordInput = document.getElementById(targetId);
                
                // Đổi trạng thái type của input
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);

                // Đổi icon con mắt
                this.classList.toggle('fa-eye');
                this.classList.toggle('fa-eye-slash');

                // Xử lý tự động ẩn sau 3 giây
                if (type === 'text') {
                    // Nếu đang có lịch hẹn ẩn trước đó của ô này thì xóa đi
                    if (hideTimeouts[targetId]) {
                        clearTimeout(hideTimeouts[targetId]);
                    }

                    // Đặt lịch hẹn mới sau 3 giây tự động ẩn lại
                    hideTimeouts[targetId] = setTimeout(() => {
                        passwordInput.setAttribute('type', 'password');
                        this.classList.remove('fa-eye-slash');
                        this.classList.add('fa-eye');
                    }, 3000);
                } else {
                    // Nếu người dùng chủ động bấm ẩn lại trước 3 giây
                    if (hideTimeouts[targetId]) {
                        clearTimeout(hideTimeouts[targetId]);
                    }
                }
            });
        });
