document.addEventListener('DOMContentLoaded', function() {
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const glvSidebar = document.getElementById('glvSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const dropdownToggles = document.querySelectorAll('.dropdown-toggle');


    function toggleSidebar() {
        if (glvSidebar && sidebarOverlay) {
            glvSidebar.classList.toggle('open');
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
    dropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', function() {
            const parentItem = this.parentElement;
            parentItem.classList.toggle('active');
        });
    });

});