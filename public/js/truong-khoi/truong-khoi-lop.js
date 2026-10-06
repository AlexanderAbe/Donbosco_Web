(() => {
    const pageData = document.getElementById('page-data');
    const yearId = pageData?.dataset.year || '';
    const classes = JSON.parse(pageData?.dataset.classes || '[]');

    let currentStudentId;
    let currentStudentData;
    const open = id => document.getElementById(id).showModal();
    const close = id => document.getElementById(id).close();
    const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    const fullName = student => [student.ten_thanh, student.ho_va_ten_lot, student.ten].filter(Boolean).join(' ');
    const formatDateVN = value => {
        if (!value) return '';
        const parts = String(value).slice(0, 10).split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
    };
    const modal = document.getElementById('detail-modal');
    const detailContent = document.getElementById('detail-content');
    const editButton = document.getElementById('modal-edit');
    const saveButton = document.getElementById('modal-save');
    const dateInput = value => value ? String(value).slice(0, 10) : '';
    const formRow = (label, value, name, type = 'text') => `<label class="detail-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}"></label>`;
    
    const createModal = document.getElementById('create-student-modal');
    const createForm = document.getElementById('create-student-form');
    const toast = document.getElementById('tk-toast');

    const showToast = message => {
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i><span>${esc(message)}</span>`;
        toast.hidden = false;
        window.setTimeout(() => { toast.hidden = true; }, 2600);
    };

    document.querySelectorAll('[data-close]').forEach(button => button.addEventListener('click', () => close(button.dataset.close)));
    modal.querySelectorAll('.modal-close, .modal-cancel').forEach(button => button.addEventListener('click', () => modal.close()));
    document.getElementById('open-create-student')?.addEventListener('click', () => createModal.showModal());

    const renderEdit = data => {
        const s = data.student;
        detailContent.innerHTML = `<form class="detail-form" id="student-edit-form">
            <section class="detail-section"><h3>Thông tin cơ bản</h3><div class="detail-grid">
                <div class="detail-field"><span>Mã số thiếu nhi</span><strong>${esc(s.mstn || '-')}</strong></div>
                ${formRow('Thánh danh', s.ten_thanh, 'ten_thanh')}${formRow('Họ và tên lót', s.ho_va_ten_lot, 'ho_va_ten_lot')}${formRow('Tên', s.ten, 'ten')}${formRow('Ngày sinh', dateInput(s.ngay_sinh), 'ngay_sinh', 'date')}
                <label class="detail-field"><span>Giới tính</span><select name="gioi_tinh"><option ${s.gioi_tinh === 'Nam' ? 'selected' : ''}>Nam</option><option ${s.gioi_tinh === 'Nữ' ? 'selected' : ''}>Nữ</option></select></label>${formRow('Địa chỉ', s.dia_chi, 'dia_chi')}
                <label class="detail-field"><span>Trạng thái</span><select name="trang_thai"><option ${s.trang_thai === 'Đang học' ? 'selected' : ''}>Đang học</option><option ${s.trang_thai === 'Chuyển xứ' ? 'selected' : ''}>Chuyển xứ</option><option ${s.trang_thai === 'Nghỉ học' ? 'selected' : ''}>Nghỉ học</option></select></label>
            </div></section>
            <section class="detail-section"><h3>Phụ huynh</h3><div id="edit-parents-list">${data.parents.map(parent => `<div class="repeat-row parent-row">${formRow('Họ tên', parent.ten_ph, 'ten_ph')}${formRow('Quan hệ', parent.moi_quan_he, 'moi_quan_he')}${formRow('SĐT', parent.sdt, 'sdt')}<button type="button" data-remove>Xóa</button></div>`).join('')}</div><button class="add-row" type="button" data-add="parent">Thêm phụ huynh</button></section>
            <section class="detail-section"><h3>Bí tích</h3><div id="edit-sacraments-list">${data.sacraments.map(item => `<div class="repeat-row sacrament-row"><label>Loại bí tích<select name="loai_bi_tich"><option ${item.loai_bi_tich === 'Rửa tội' ? 'selected' : ''}>Rửa tội</option><option ${item.loai_bi_tich === 'Xưng tội & Rước lễ' ? 'selected' : ''}>Xưng tội & Rước lễ</option><option ${item.loai_bi_tich === 'Thêm sức' ? 'selected' : ''}>Thêm sức</option></select></label>${formRow('Ngày lãnh nhận', dateInput(item.ngay_lanh_nhan), 'ngay_lanh_nhan', 'date')}<button type="button" data-remove>Xóa</button></div>`).join('')}</div><button class="add-row" type="button" data-add="sacrament">Thêm bí tích</button></section>
        </form>`;
        detailContent.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => button.parentElement.remove()));
        detailContent.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
            const parent = button.dataset.add === 'parent';
            const container = document.getElementById(parent ? 'edit-parents-list' : 'edit-sacraments-list');
            const template = parent
                ? `<div class="repeat-row parent-row">${formRow('Họ tên', '', 'ten_ph')}${formRow('Quan hệ', '', 'moi_quan_he')}${formRow('SĐT', '', 'sdt')}<button type="button" data-remove>Xóa</button></div>`
                : `<div class="repeat-row sacrament-row"><label>Loại bí tích<select name="loai_bi_tich"><option>Rửa tội</option><option>Xưng tội & Rước lễ</option><option>Thêm sức</option></select></label>${formRow('Ngày lãnh nhận', '', 'ngay_lanh_nhan', 'date')}<button type="button" data-remove>Xóa</button></div>`;
            container.insertAdjacentHTML('beforeend', template);
            container.lastElementChild.querySelector('[data-remove]').addEventListener('click', event => event.currentTarget.parentElement.remove());
        }));
    };
    
    createForm?.addEventListener('submit', async event => {
        event.preventDefault();
        const formData = new FormData(createForm);
        const parents = [1, 2].map(index => {
            return Object.fromEntries(
                [...createForm.querySelectorAll(`[data-parent="${index}"]`)]
                .map(input => [input.dataset.field, input.value.trim()])
            );
        }).filter(parent => parent.ten_ph || parent.sdt);

        const sacraments = [1, 2, 3].map(index => {
            return Object.fromEntries(
                [...createForm.querySelectorAll(`[data-sacrament="${index}"]`)]
                .map(input => [input.dataset.field, input.value])
            );
        }).filter(item => item.loai_bi_tich && item.ngay_lanh_nhan);

        const payload = Object.fromEntries(formData.entries()); 
        payload.parents = parents; 
        payload.sacraments = sacraments;

        const error = document.getElementById('create-student-error'); 
        error.textContent = '';
        
        const response = await fetch('/truong-khoi/lop/create', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(payload) 
        });
        
        if (!response.ok) { 
            const resData = await response.json();
            error.textContent = resData.error || 'Không thể thêm thiếu nhi.'; 
            return; 
        }
        window.location.reload();
    });

    document.querySelectorAll('.detail-button').forEach(button => button.addEventListener('click', async () => {
        open('detail-modal');
        const content = document.getElementById('detail-content');
        currentStudentId = button.dataset.id;
        editButton.hidden = false;
        saveButton.hidden = true;
        content.textContent = 'Đang tải dữ liệu...';
        try {
            const response = await fetch(`/truong-khoi/lop/${button.dataset.id}/detail?nien_khoa=${yearId}`);
            const data = await response.json();
            if (!response.ok) throw new Error(data.error);
            currentStudentData = data;
            
            const s = data.student;
            document.getElementById('detail-title').textContent = fullName(s);
            
            const parentsHtml = data.parents && data.parents.length
                ? `<div class="detail-grid">${data.parents.map(parent => `<div><span>${esc(parent.moi_quan_he || 'Mối quan hệ')}</span><strong>${esc(parent.ten_ph || '-')}</strong><small>${esc(parent.sdt || 'Chưa có số điện thoại')}</small></div>`).join('')}</div>`
                : '<p class="muted">Chưa có thông tin phụ huynh.</p>';
            const sacramentsHtml = data.sacraments && data.sacraments.length
                ? `<div class="detail-grid">${data.sacraments.map(item => `<div><span>${esc(item.loai_bi_tich || 'Bí tích')}</span><strong>${esc(formatDateVN(item.ngay_lanh_nhan) || 'Chưa cập nhật')}</strong></div>`).join('')}</div>`
                : '<p>Chưa có thông tin bí tích.</p>';

            // Nếu bạn cũng muốn phần Modal chi tiết hiển thị ngày sinh theo dạng DD/MM/YYYY, có thể đổi ở đây luôn:
            let detailDob = '-';
            if (s.ngay_sinh) {
                const parts = String(s.ngay_sinh).slice(0, 10).split('-');
                if (parts.length === 3) detailDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
            }

            content.innerHTML = `
                <section class="detail-section">
                    <h3>Thông tin cơ bản</h3>
                    <div class="detail-grid">
                        <div><span>Mã số thiếu nhi</span><strong>${esc(s.mstn || '-')}</strong></div>
                        <div><span>Ngày sinh</span><strong>${esc(detailDob)}</strong></div>
                        <div><span>Giới tính</span><strong>${esc(s.gioi_tinh || '-')}</strong></div>
                        <div><span>Lớp</span><strong>${esc(`${s.ten_khoi} - ${s.ten_lop}`)}</strong></div>
                        <div><span>Địa chỉ</span><strong>${esc(s.dia_chi || '-')}</strong></div>
                        <div><span>Trạng thái</span><strong>${esc(s.trang_thai || '-')}</strong></div>
                    </div>
                </section>
                <section class="detail-section">
                    <h3>Phụ huynh</h3>
                    ${parentsHtml}
                </section>
                <section class="detail-section">
                    <h3>Bí tích</h3>
                    ${sacramentsHtml}
                </section>
            `;
        } catch (error) { 
            content.textContent = error.message || 'Không thể tải thông tin.'; 
        }
    }));

    editButton.addEventListener('click', () => {
        renderEdit(currentStudentData);
        editButton.hidden = true;
        saveButton.hidden = false;
    });

    saveButton.addEventListener('click', async () => {
        const form = document.getElementById('student-edit-form');
        const payload = Object.fromEntries(new FormData(form));
        payload.yearId = yearId;
        payload.phu_huynh = [...detailContent.querySelectorAll('.parent-row')].map(item => Object.fromEntries([...item.querySelectorAll('input')].map(input => [input.name, input.value])));
        payload.bi_tich = [...detailContent.querySelectorAll('.sacrament-row')].map(item => Object.fromEntries([...item.querySelectorAll('input, select')].map(input => [input.name, input.value])));
        const response = await fetch(`/truong-khoi/lop/${currentStudentId}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const result = await response.json();
            alert(result.error || 'Không thể lưu thông tin.');
            return;
        }
        currentStudentData = await (await fetch(`/truong-khoi/lop/${currentStudentId}/detail?nien_khoa=${yearId}`)).json();
        detailContent.innerHTML = '';
        editButton.hidden = false;
        saveButton.hidden = true;
        modal.querySelector('.modal-close')?.focus();
        window.location.reload();
    });

    document.querySelectorAll('.status-button').forEach(button => button.addEventListener('click', () => {
        currentStudentId = button.dataset.id;
        document.getElementById('status-value').value = button.dataset.status;
        document.getElementById('status-error').textContent = '';
        open('status-modal');
    }));
    
    document.getElementById('save-status').addEventListener('click', async () => {
        const response = await fetch(`/truong-khoi/lop/${currentStudentId}/status`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ yearId, trang_thai: document.getElementById('status-value').value }) 
        });
        if (!response.ok) { 
            const resData = await response.json();
            document.getElementById('status-error').textContent = resData.error; 
            return; 
        }
        window.location.reload();
    });

    document.querySelectorAll('.transfer-button').forEach(button => button.addEventListener('click', () => {
        currentStudentId = button.dataset.id;
        const target = document.getElementById('target-class');
        target.innerHTML = classes.filter(item => String(item.id_lop) !== button.dataset.class).map(item => `<option value="${item.id_lop}">${esc(item.ten_lop)}</option>`).join('');
        document.getElementById('transfer-error').textContent = target.options.length ? '' : 'Không có lớp khác trong khối để chuyển.';
        open('transfer-modal');
    }));
    
    document.getElementById('save-transfer').addEventListener('click', async () => {
        const target = document.getElementById('target-class');
        if (!target.value) return;
        const response = await fetch(`/truong-khoi/lop/${currentStudentId}/transfer`, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ yearId, targetClassId: target.value }) 
        });
        if (!response.ok) { 
            const resData = await response.json();
            document.getElementById('transfer-error').textContent = resData.error; 
            return; 
        }
        close('transfer-modal');
        showToast('Chuyển lớp thành công.');
        window.setTimeout(() => window.location.reload(), 900);
    });

    const studentSearch = document.getElementById('student-search');
    const classFilterButtons = document.querySelectorAll('[data-class-filter]');
    const classPanels = document.querySelectorAll('[data-class-panel]');
    const allStudentsPanel = document.getElementById('all-students-panel');
    const classGrid = document.querySelector('.class-grid');
    const filterEmpty = document.getElementById('class-filter-empty');
    const normalizeSearch = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const updateClassFilter = () => {
        const keyword = normalizeSearch(studentSearch?.value.trim());
        const selectedClass = document.querySelector('[data-class-filter].is-active')?.dataset.classFilter || 'all';
        const showAll = selectedClass === 'all';
        const activePanel = showAll
            ? allStudentsPanel
            : [...classPanels].find(panel => panel.dataset.classId === selectedClass);
        if (allStudentsPanel) {
            allStudentsPanel.dataset.paginationVisible = String(showAll);
            allStudentsPanel.hidden = !showAll;
        }
        if (classGrid) classGrid.hidden = showAll;

        allStudentsPanel?.querySelectorAll('[data-student-row]').forEach(row => {
            const matchesSearch = !keyword || normalizeSearch(row.dataset.search).includes(keyword);
            row.classList.toggle('pagination-filter-hidden', !matchesSearch);
        });

        classPanels.forEach(panel => {
            const matchesClass = selectedClass === 'all' || panel.dataset.classId === selectedClass;
            panel.dataset.paginationVisible = String(!showAll && matchesClass);

            panel.querySelectorAll('[data-student-row]').forEach(row => {
                const matchesSearch = !keyword || normalizeSearch(row.dataset.search).includes(keyword);
                row.classList.toggle('pagination-filter-hidden', !matchesSearch);
            });

            panel.hidden = showAll || !matchesClass;
        });

        const visibleStudents = [...(activePanel?.querySelectorAll('[data-student-row]') || [])]
            .filter(row => !row.classList.contains('pagination-filter-hidden')).length;
        if (filterEmpty) {
            filterEmpty.hidden = visibleStudents > 0;
            filterEmpty.classList.toggle('pagination-filter-hidden', visibleStudents > 0);
        }
        document.dispatchEvent(new Event('pagination:refresh'));
    };

    studentSearch?.addEventListener('input', updateClassFilter);
    classFilterButtons.forEach(button => button.addEventListener('click', () => {
        classFilterButtons.forEach(item => item.classList.toggle('is-active', item === button));
        updateClassFilter();
    }));

    updateClassFilter();
})();
