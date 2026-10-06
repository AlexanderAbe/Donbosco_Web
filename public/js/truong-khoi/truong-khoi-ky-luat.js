(() => {
    const search = document.getElementById('discipline-search');
    const rows = [...document.querySelectorAll('[data-discipline-row]')];
    const buttons = [...document.querySelectorAll('[data-month-filter]')];
    const empty = document.getElementById('discipline-no-results');
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim().replace(/\s+/g, ' ');
    let selectedMonth = buttons.find(button => button.classList.contains('is-active'))?.dataset.monthFilter || 'all';

    if (!search || !buttons.length) return;

    const applyFilters = () => {
        const keyword = normalize(search.value);
        let visibleCount = 0;
        rows.forEach(row => {
            const matchesMonth = selectedMonth === 'all' || row.dataset.disciplineMonth === selectedMonth;
            const matchesSearch = !keyword || normalize(row.dataset.search).includes(keyword);
            const hidden = !matchesMonth || !matchesSearch;
            row.hidden = hidden;
            row.classList.toggle('pagination-filter-hidden', hidden);
            if (!row.hidden) visibleCount += 1;
        });
        buttons.forEach(button => button.classList.toggle('is-active', button.dataset.monthFilter === selectedMonth));
        empty.hidden = visibleCount > 0;
        document.dispatchEvent(new Event('pagination:refresh'));
    };

    search.addEventListener('input', applyFilters);
    buttons.forEach(button => button.addEventListener('click', () => {
        selectedMonth = selectedMonth === button.dataset.monthFilter
            ? 'all'
            : button.dataset.monthFilter;
        applyFilters();
    }));
    applyFilters();
})();
