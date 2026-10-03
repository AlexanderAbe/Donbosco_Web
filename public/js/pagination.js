(() => {
    const visibleToFilter = row => (
        !row.hidden
        && !row.classList.contains('search-hidden')
        && !row.classList.contains('pagination-filter-hidden')
        && row.closest('[data-pagination-group]')?.dataset.paginationVisible !== 'false'
    );

    const getPageNumbers = (currentPage, totalPages) => {
        const pages = new Set([1, totalPages]);
        if (currentPage <= 2) {
            pages.add(2);
            pages.add(3);
        } else if (currentPage >= totalPages - 1) {
            pages.add(totalPages - 2);
            pages.add(totalPages - 1);
        } else {
            pages.add(currentPage - 1);
            pages.add(currentPage);
            pages.add(currentPage + 1);
        }
        const sortedPages = [...pages].filter(page => page >= 1 && page <= totalPages).sort((a, b) => a - b);

        return sortedPages.flatMap((page, index) => {
            const previous = sortedPages[index - 1];
            return previous && page - previous > 1
                ? [{ ellipsis: true }, { page }]
                : [{ page }];
        });
    };

    document.querySelectorAll('[data-pagination]').forEach(component => {
        let config;
        try {
            config = JSON.parse(component.dataset.paginationConfig);
        } catch (error) {
            console.error('Cấu hình phân trang không hợp lệ:', error);
            return;
        }

        const rows = config.mode === 'client' ? [...document.querySelectorAll(config.rows)] : [];
        const groups = config.groups ? [...document.querySelectorAll(config.groups)] : [];
        const desktop = component.querySelector('[data-pagination-desktop]');
        const previous = component.querySelector('[data-pagination-previous]');
        const next = component.querySelector('[data-pagination-next]');
        const pageInput = component.querySelector('[data-pagination-page-input]');
        const pageSizeSelect = component.querySelector('[data-pagination-size]');
        const pagesLabel = component.querySelector('[data-pagination-pages]');
        const startLabel = component.querySelector('[data-pagination-start]');
        const endLabel = component.querySelector('[data-pagination-end]');
        const totalLabel = component.querySelector('[data-pagination-total]');
        let currentPage = Math.max(Number(config.currentPage) || 1, 1);
        let filteredRows = [];

        const updatePageSize = pageSize => {
            const selectedPageSize = Number(pageSize);
            if (!Number.isInteger(selectedPageSize) || selectedPageSize < 1) return;
            if (config.mode === 'server') {
                const params = new URLSearchParams(window.location.search);
                params.set('page', '1');
                params.set('limit', String(selectedPageSize));
                window.location.assign(`${window.location.pathname}?${params.toString()}`);
                return;
            }
            config.pageSize = selectedPageSize;
            currentPage = 1;
            render();
        };

        const goToPage = page => {
            const targetPage = Math.min(Math.max(Number(page) || 1, 1), config.totalPages);
            if (config.mode === 'server') {
                const params = new URLSearchParams(window.location.search);
                params.set('page', String(targetPage));
                params.set('limit', String(config.pageSize));
                window.location.assign(`${window.location.pathname}?${params.toString()}`);
                return;
            }
            currentPage = targetPage;
            render();
        };

        const renderControls = () => {
            desktop.replaceChildren();
            const createButton = (label, page, { disabled = false, active = false, ariaLabel } = {}) => {
                const button = document.createElement('button');
                button.type = 'button';
                button.textContent = label;
                button.disabled = disabled;
                if (ariaLabel) button.setAttribute('aria-label', ariaLabel);
                if (active) button.setAttribute('aria-current', 'page');
                button.addEventListener('click', () => goToPage(page));
                return button;
            };

            desktop.append(createButton('← Trang trước', currentPage - 1, {
                disabled: currentPage <= 1,
                ariaLabel: 'Trang trước'
            }));
            getPageNumbers(config.totalPages === 0 ? 1 : currentPage, config.totalPages).forEach(item => {
                if (item.ellipsis) {
                    const span = document.createElement('span');
                    span.className = 'pagination-ellipsis';
                    span.textContent = '…';
                    desktop.append(span);
                } else {
                    desktop.append(createButton(String(item.page), item.page, {
                        active: item.page === currentPage,
                        ariaLabel: `Trang ${item.page}`
                    }));
                }
            });
            desktop.append(createButton('Trang sau →', currentPage + 1, {
                disabled: currentPage >= config.totalPages,
                ariaLabel: 'Trang sau'
            }));
        };

        const renderPageSizes = () => {
            const pageSizes = [...new Set([10, 20, 25, 50, 100, config.pageSize])]
                .filter(size => size > 0)
                .sort((a, b) => a - b);
            pageSizeSelect.replaceChildren();
            pageSizes.forEach(size => {
                const option = document.createElement('option');
                option.value = String(size);
                option.textContent = String(size);
                option.selected = size === config.pageSize;
                pageSizeSelect.append(option);
            });
        };

        const updateGroups = () => {
            groups.forEach(group => {
                const hasVisibleRow = rows.some(row => (
                    group.contains(row)
                    && visibleToFilter(row)
                    && !row.classList.contains('pagination-page-hidden')
                ));
                const hidden = group.dataset.paginationVisible === 'false' || !hasVisibleRow;
                group.hidden = hidden;
                group.classList.toggle('pagination-filter-hidden', hidden);
            });
        };

        const render = () => {
            if (config.mode === 'client') {
                filteredRows = rows.filter(visibleToFilter);
                config.totalItems = filteredRows.length;
                config.totalPages = Math.max(Math.ceil(config.totalItems / config.pageSize), 1);
                currentPage = Math.min(currentPage, config.totalPages);
                const firstVisibleIndex = (currentPage - 1) * config.pageSize;
                const visiblePageRows = new Set(filteredRows.slice(firstVisibleIndex, firstVisibleIndex + config.pageSize));

                rows.forEach(row => {
                    row.classList.toggle('pagination-page-hidden', !visiblePageRows.has(row) && visibleToFilter(row));
                });
                updateGroups();
            }

            const start = config.totalItems === 0 ? 0 : (currentPage - 1) * config.pageSize + 1;
            const end = Math.min(currentPage * config.pageSize, config.totalItems);
            startLabel.textContent = String(start);
            endLabel.textContent = String(end);
            totalLabel.textContent = String(config.totalItems);
            pagesLabel.textContent = String(config.totalPages);
            pageInput.max = String(config.totalPages);
            pageInput.value = String(currentPage);
            pageSizeSelect.value = String(config.pageSize);
            component.hidden = config.totalItems === 0;
            renderControls();
        };

        previous.addEventListener('click', () => goToPage(currentPage - 1));
        next.addEventListener('click', () => goToPage(currentPage + 1));
        pageInput.addEventListener('change', () => {
            const requestedPage = Number(pageInput.value);
            if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > config.totalPages) {
                pageInput.value = String(currentPage);
                pageInput.setAttribute('aria-invalid', 'true');
                return;
            }
            pageInput.removeAttribute('aria-invalid');
            goToPage(requestedPage);
        });
        pageInput.addEventListener('input', () => pageInput.removeAttribute('aria-invalid'));
        pageInput.addEventListener('keydown', event => {
            if (event.key === 'Enter') {
                event.preventDefault();
                pageInput.dispatchEvent(new Event('change'));
            }
        });
        pageSizeSelect.addEventListener('change', () => updatePageSize(pageSizeSelect.value));

        if (config.mode === 'client') {
            document.addEventListener('input', event => {
                if (event.target.matches('input[type="search"]')) {
                    currentPage = 1;
                    window.setTimeout(render, 0);
                }
            });
            document.addEventListener('pagination:refresh', () => {
                currentPage = 1;
                render();
            });
        }
        renderPageSizes();
        render();
    });
})();
