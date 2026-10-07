document.addEventListener('DOMContentLoaded', function() {
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const glvSidebar = document.getElementById('glvSidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
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

});