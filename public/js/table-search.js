(() => {
    const normalize = value => String(value || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi')
        .trim()
        .replace(/\s+/g, ' ');

    document.querySelectorAll('[data-table-search]').forEach(input => {
        const rowSelector = input.dataset.tableSearch;
        const rows = [...document.querySelectorAll(rowSelector)];
        const groups = input.dataset.searchGroups
            ? [...document.querySelectorAll(input.dataset.searchGroups)]
            : [];
        const empty = input.dataset.searchEmpty
            ? document.querySelector(input.dataset.searchEmpty)
            : null;
        const count = input.dataset.searchCount
            ? document.querySelector(input.dataset.searchCount)
            : null;

        const filterRows = () => {
            const keyword = normalize(input.value);
            let visibleCount = 0;

            rows.forEach(row => {
                const visible = !keyword || normalize(row.dataset.search).includes(keyword);
                row.classList.toggle('search-hidden', !visible);
                if (visible) visibleCount += 1;
            });

            groups.forEach(group => {
                group.classList.toggle(
                    'search-hidden',
                    Boolean(keyword) &&
                        !rows.some(row => group.contains(row) && !row.classList.contains('search-hidden'))
                );
            });

            if (empty) empty.classList.toggle('search-hidden', !keyword || visibleCount > 0);
            if (count) count.textContent = String(visibleCount);
        };

        input.addEventListener('input', filterRows);
        filterRows();
    });
})();
