(() => {
    const tabList = document.querySelector('.glv-dashboard [role="tablist"]');
    if (!tabList) return;

    const tabs = [...tabList.querySelectorAll('[role="tab"]')];

    const activateTab = (tab, moveFocus = false) => {
        tabs.forEach(item => {
            const isActive = item === tab;
            item.classList.toggle('is-active', isActive);
            item.setAttribute('aria-selected', String(isActive));
            item.tabIndex = isActive ? 0 : -1;
            const panel = document.getElementById(item.getAttribute('aria-controls'));
            if (panel) panel.hidden = !isActive;
        });
        if (moveFocus) tab.focus();
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab));
        tab.addEventListener('keydown', event => {
            let nextIndex;
            if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length;
            else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length;
            else if (event.key === 'Home') nextIndex = 0;
            else if (event.key === 'End') nextIndex = tabs.length - 1;
            else return;

            event.preventDefault();
            activateTab(tabs[nextIndex], true);
        });
    });
})();
