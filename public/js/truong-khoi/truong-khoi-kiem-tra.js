(() => {
    const search = document.getElementById('score-search');
    const rows = [...document.querySelectorAll('[data-score-row]')];
    const buttons = [...document.querySelectorAll('[data-exam-filter]')];
    const empty = document.getElementById('score-no-results');
    const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim().replace(/\s+/g, ' ');
    let selectedExam = document.querySelector('.tk-class-page').dataset.selectedExam;

    const applyFilters = () => {
        const keyword = normalize(search.value);
        let visibleCount = 0;
        rows.forEach(row => {
            const matchesExam = selectedExam === 'all' || row.dataset.examNumber === selectedExam;
            const matchesSearch = !keyword || normalize(row.dataset.search).includes(keyword);
            const hidden = !matchesExam || !matchesSearch;
            row.hidden = hidden;
            row.classList.toggle('pagination-filter-hidden', hidden);
            if (!row.hidden) visibleCount += 1;
        });
        buttons.forEach(button => button.classList.toggle('is-active', button.dataset.examFilter === selectedExam));
        empty.hidden = visibleCount > 0;
        document.dispatchEvent(new Event('pagination:refresh'));
    };

    search.addEventListener('input', applyFilters);
    buttons.forEach(button => button.addEventListener('click', () => {
        selectedExam = selectedExam === button.dataset.examFilter
            ? 'all'
            : button.dataset.examFilter;
        applyFilters();
    }));
    applyFilters();
})();
