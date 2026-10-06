document.addEventListener('DOMContentLoaded', function() {
    // 1. Xử lý đóng/mở Sidebar chung cho mọi loại giao diện (trên mobile/tablet)
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    
    // Tìm bất kỳ sidebar nào có mặt trên trang (tkSidebar, glvSidebar, bdhSidebar, adminSidebar)
    const sidebar = document.querySelector('.tk-sidebar, .glv-sidebar, .bdh-sidebar, .admin-sidebar');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');

    function toggleSidebar() {
        if (sidebar && sidebarOverlay) {
            sidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('show');
        }
    }

    if (menuToggleBtn) {
        menuToggleBtn.addEventListener('click', toggleSidebar);
    }
    if (closeSidebarBtn) {
        closeSidebarBtn.addEventListener('click', toggleSidebar);
    }
    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', toggleSidebar);
    }

    // 2. Xử lý hiệu ứng Accordion (Mở/Thu gọn menu con)
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            // Dùng .closest('.menu-item') để tìm chính xác thẻ li cha chứa menu
            const parentItem = this.closest('.menu-item');
            if (parentItem) {
                parentItem.classList.toggle('active');
            }
        });
    });
});