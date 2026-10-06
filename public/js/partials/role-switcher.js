document.addEventListener('DOMContentLoaded', function() {
            const iconBtn = document.getElementById('mobileSwitchBtn');
            const dropdown = document.getElementById('mobileSwitchDropdown');

            if (iconBtn && dropdown) {
                iconBtn.addEventListener('click', function(e) {
                    e.stopPropagation();
                    dropdown.classList.toggle('show');
                });

                // Bấm ra chỗ khác trên màn hình thì tự động đóng menu lại
                document.addEventListener('click', function(e) {
                    if (!dropdown.contains(e.target) && !iconBtn.contains(e.target)) {
                        dropdown.classList.remove('show');
                    }
                });
            }
        });
