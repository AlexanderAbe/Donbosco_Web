document.addEventListener('DOMContentLoaded', function() {
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const adminSidebar = document.getElementById('adminSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    function toggleSidebar() {
        if (adminSidebar && sidebarOverlay) {
            adminSidebar.classList.toggle('open');
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

    // Xử lý hiệu ứng Accordion menu con
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const parentItem = this.parentElement;
            parentItem.classList.toggle('active');
        });
    });
});