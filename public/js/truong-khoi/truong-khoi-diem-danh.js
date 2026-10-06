document.addEventListener('DOMContentLoaded', function () {
        const filterButtons = document.querySelectorAll('.date-filter');
        const groups = document.querySelectorAll('.session-group');
        const search = document.getElementById('attendance-search');
        const empty = document.getElementById('attendance-no-results');
        const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim().replace(/\s+/g, ' ');
        let selectedFilterKey = 'all';

        const updateFilters = () => {
            const keyword = normalize(search?.value.trim());
            let visibleCards = 0;
            filterButtons.forEach((button) => {
                button.classList.toggle(
                    'is-active',
                    selectedFilterKey !== 'all' && button.dataset.filter === selectedFilterKey
                );
            });

            groups.forEach((group) => {
                const matchesDate = selectedFilterKey === 'all' || group.dataset.filterKey === selectedFilterKey;
                group.dataset.paginationVisible = String(matchesDate);
                let groupCards = 0;
                group.querySelectorAll('[data-attendance-card]').forEach((card) => {
                    const matchesSearch = !keyword || normalize(card.dataset.search).includes(keyword);
                    card.hidden = !matchesSearch;
                    card.classList.toggle('pagination-filter-hidden', !matchesSearch);
                    if (matchesSearch) groupCards += 1;
                });
                const shouldShow = matchesDate && groupCards > 0;
                group.hidden = !shouldShow;
                group.classList.toggle('pagination-filter-hidden', !shouldShow);
                if (matchesDate) visibleCards += groupCards;
            });
            if (empty) empty.hidden = visibleCards > 0;
            document.dispatchEvent(new Event('pagination:refresh'));
        };

        filterButtons.forEach((button) => {
            button.addEventListener('click', function () {
                selectedFilterKey = selectedFilterKey === this.dataset.filter
                    ? 'all'
                    : this.dataset.filter;
                updateFilters();
            });
        });

        search?.addEventListener('input', updateFilters);
    });
