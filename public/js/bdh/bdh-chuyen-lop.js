document.addEventListener('DOMContentLoaded', () => {
        const sourceClass = document.getElementById('lop-cu');
        const targetClass = document.getElementById('lop-moi');
        const targetBlock = document.getElementById('khoi-moi');
        const sourceBlock = document.getElementById('khoi-cu');
        const filterForm = document.getElementById('class-filter-form');
        const targetId = document.getElementById('target-class-id');
        const moveForm = document.getElementById('move-form');
        const search = document.getElementById('student-search');
        const selectAll = document.getElementById('select-all');
        const moveButton = document.getElementById('move-button');
        const rows = [...document.querySelectorAll('.student-row')];
        const checkboxes = [...document.querySelectorAll('.student-checkbox')];

        const filterClasses = (blockSelect, classSelect) => {
            const blockId = blockSelect.value;
            [...classSelect.options].forEach(option => {
                const visible = !option.dataset.khoi || !blockId || option.dataset.khoi === blockId;
                option.hidden = !visible;
            });
            if (classSelect.selectedOptions[0]?.hidden) classSelect.value = '';
        };

        const syncBlock = (blockSelect, classSelect) => {
            const selected = classSelect.selectedOptions[0];
            blockSelect.value = selected?.dataset.khoi || '';
            filterClasses(blockSelect, classSelect);
        };

        sourceBlock.addEventListener('change', () => filterClasses(sourceBlock, sourceClass));
        targetBlock.addEventListener('change', () => filterClasses(targetBlock, targetClass));
        sourceClass.addEventListener('change', () => filterForm.submit());
        targetClass.addEventListener('change', () => { targetId.value = targetClass.value; });
        syncBlock(sourceBlock, sourceClass);
        syncBlock(targetBlock, targetClass);

        const updateSelection = () => {
            const visibleRows = rows.filter(row => row.style.display !== 'none');
            const selectedVisible = visibleRows.filter(row => row.querySelector('input').checked);
            const selectedTotal = checkboxes.filter(checkbox => checkbox.checked).length;
            document.getElementById('visible-count').textContent = visibleRows.length;
            selectAll.checked = visibleRows.length > 0 && selectedVisible.length === visibleRows.length;
            selectAll.indeterminate = selectedVisible.length > 0 && selectedVisible.length < visibleRows.length;
            moveButton.disabled = !selectedTotal || !targetClass.value || targetClass.value === sourceClass.value;
        };

        search?.addEventListener('input', () => {
            const term = search.value.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');
            rows.forEach(row => {
                const name = row.dataset.search.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi');
                row.style.display = name.includes(term) ? 'grid' : 'none';
            });
            updateSelection();
        });
        checkboxes.forEach(checkbox => checkbox.addEventListener('change', updateSelection));
        selectAll?.addEventListener('change', () => {
            rows.filter(row => row.style.display !== 'none').forEach(row => { row.querySelector('input').checked = selectAll.checked; });
            updateSelection();
        });
        moveForm?.addEventListener('submit', event => {
            targetId.value = targetClass.value;
            if (!targetClass.value || targetClass.value === sourceClass.value) {
                event.preventDefault();
                window.alert('Vui lòng chọn một lớp chuyển tới khác lớp hiện tại.');
            }
        });
        updateSelection();
    });
