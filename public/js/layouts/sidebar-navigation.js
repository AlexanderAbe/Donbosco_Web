document.addEventListener('DOMContentLoaded', function() {
    const normalizePath = path => path.replace(/\/+$/, '') || '/';
    const currentPath = normalizePath(window.location.pathname);
    const matchesRoute = (path, route) => path === route || path.startsWith(`${route}/`);

    document.querySelectorAll('.sidebar-menu .dropdown-toggle').forEach(toggle => {
        toggle.setAttribute('aria-expanded', 'false');
    });

    document.querySelectorAll('.sidebar-menu a[href]').forEach(link => {
        const linkPath = normalizePath(new URL(link.href, window.location.origin).pathname);
        if (linkPath !== currentPath) {
            return;
        }

        link.classList.add('is-active');
        link.setAttribute('aria-current', 'page');
    });

    document.querySelectorAll('.sidebar-menu > .menu-item').forEach(menuItem => {
        const standaloneLink = menuItem.querySelector(':scope > .menu-link');
        if (standaloneLink) {
            const linkPath = normalizePath(standaloneLink.dataset.activeExact ||
                new URL(standaloneLink.href, window.location.origin).pathname);
            menuItem.classList.toggle('active', linkPath === currentPath);
        }

        const dropdownToggle = menuItem.querySelector(':scope > .dropdown-toggle');
        if (!dropdownToggle) {
            return;
        }

        const configuredPrefixes = (menuItem.dataset.activePrefixes || '')
            .split(/\s+/)
            .filter(Boolean)
            .map(normalizePath);
        const submenuPrefixes = Array.from(menuItem.querySelectorAll('.submenu a[href]'), link =>
            normalizePath(new URL(link.href, window.location.origin).pathname)
        );
        const isActive = [...configuredPrefixes, ...submenuPrefixes]
            .some(prefix => matchesRoute(currentPath, prefix));

        menuItem.classList.toggle('active', isActive);
        dropdownToggle.setAttribute('aria-expanded', String(isActive));
    });

    document.querySelectorAll('.sidebar-menu > .menu-item > .dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function() {
            const menuItem = this.closest('.menu-item');
            const menu = menuItem && menuItem.parentElement;
            if (!menuItem || !menu) {
                return;
            }

            const shouldOpen = !menuItem.classList.contains('active');
            menu.querySelectorAll(':scope > .menu-item.active').forEach(activeItem => {
                if (activeItem !== menuItem) {
                    activeItem.classList.remove('active');
                    const activeToggle = activeItem.querySelector(':scope > .dropdown-toggle');
                    if (activeToggle) {
                        activeToggle.setAttribute('aria-expanded', 'false');
                    }
                }
            });

            if (shouldOpen) {
                menu.querySelectorAll(':scope > .menu-item > .menu-link.is-active').forEach(link => {
                    link.classList.remove('is-active');
                    link.closest('.menu-item').classList.remove('active');
                });
            } else {
                menu.querySelectorAll(':scope > .menu-item > .menu-link').forEach(link => {
                    const linkPath = normalizePath(link.dataset.activeExact ||
                        new URL(link.href, window.location.origin).pathname);
                    if (linkPath === currentPath) {
                        link.classList.add('is-active');
                        link.closest('.menu-item').classList.add('active');
                    }
                });
            }

            menuItem.classList.toggle('active', shouldOpen);
            this.setAttribute('aria-expanded', String(shouldOpen));
        });
    });
});
