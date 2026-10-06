const searchInput = document.getElementById('search-glv-input');
    if (searchInput) {
        searchInput.addEventListener('input', function(e) {
            const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim();
            const keyword = normalize(e.target.value);
            const items = document.querySelectorAll('#glv-checkbox-grid .checkbox-item');
            
            items.forEach(item => {
                const name = normalize(item.getAttribute('data-name'));
                if (name && name.includes(keyword)) {
                    item.style.display = 'flex';
                } else {
                    item.style.display = 'none';
                }
            });
        });
    }
