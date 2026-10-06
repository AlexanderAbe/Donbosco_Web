(() => {
    const yearId = document.querySelector('.class-page')?.dataset.yearId || '';
    const modal = document.getElementById('student-modal');
    const body = document.getElementById('modal-body');
    const title = document.getElementById('modal-title');
    const editButton = document.getElementById('modal-edit');
    const saveButton = document.getElementById('modal-save');
    let currentId = null;
    let currentData = null;
    let statusStudentId = null;
    const statusModal = document.getElementById('status-modal');
    const statusValue = document.getElementById('status-value');
    const statusError = document.getElementById('status-error');

    const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
    
    // Helper format YYYY-MM-DD sang DD/MM/YYYY cho phần xem chi tiết
    const formatDateVN = value => {
        if (!value) return '';
        const parts = String(value).slice(0, 10).split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : '';
    };

    // Helper giữ nguyên YYYY-MM-DD để đổ vào ô <input type="date"> khi sửa
    const dateInput = value => value ? String(value).slice(0, 10) : '';
    const row = (label, value, name, type = 'text') => `<label class="detail-field"><span>${label}</span><input name="${name}" type="${type}" value="${esc(value)}"></label>`;

    const renderView = data => {
        const s = data.student;
        title.textContent = [s.ten_thanh, s.ho_va_ten_lot, s.ten].filter(Boolean).join(' ');
        body.innerHTML = `
            <section class="detail-section"><h3>Thông tin cơ bản</h3><div class="detail-grid">
                <div class="detail-field"><span>Mã số thiếu nhi</span><strong>${esc(s.mstn || '-')}</strong></div>
                <div class="detail-field"><span>Ngày sinh</span><strong>${esc(formatDateVN(s.ngay_sinh) || '-')}</strong></div>
                <div class="detail-field"><span>Thánh danh</span><strong>${esc(s.ten_thanh || '-')}</strong></div>
                <div class="detail-field"><span>Giới tính</span><strong>${esc(s.gioi_tinh || '-')}</strong></div>
                <div class="detail-field"><span>Địa chỉ</span><strong>${esc(s.dia_chi || '-')}</strong></div>
                <div class="detail-field"><span>Lớp</span><strong>${esc(`${s.ten_khoi} - ${s.ten_lop}`)}</strong></div>
                <div class="detail-field"><span>Trạng thái</span><strong>${esc(s.trang_thai || '-')}</strong></div>
            </div></section>
            <section class="detail-section"><h3>Phụ huynh</h3>${data.parents.length ? data.parents.map(parent => `<p>${esc(parent.ten_ph)} · ${esc(parent.moi_quan_he || '-')} · ${esc(parent.sdt || '-')}</p>`).join('') : '<p>Chưa có thông tin.</p>'}</section>
            <section class="detail-section"><h3>Bí tích</h3>${data.sacraments.length ? data.sacraments.map(item => `<p>${esc(item.loai_bi_tich)} · ${esc(formatDateVN(item.ngay_lanh_nhan))}</p>`).join('') : '<p>Chưa có thông tin.</p>'}</section>`;
    };

    const renderEdit = data => {
        const s = data.student;
        body.innerHTML = `<form class="detail-form" id="student-edit-form">
            <section class="detail-section"><h3>Thông tin cơ bản</h3><div class="detail-grid">
                <div class="detail-field"><span>Mã số thiếu nhi</span><strong>${esc(s.mstn || '-')}</strong></div>
                ${row('Thánh danh', s.ten_thanh, 'ten_thanh')}${row('Họ và tên lót', s.ho_va_ten_lot, 'ho_va_ten_lot')}${row('Tên', s.ten, 'ten')}${row('Ngày sinh', dateInput(s.ngay_sinh), 'ngay_sinh', 'date')}
                <label class="detail-field"><span>Giới tính</span><select name="gioi_tinh"><option ${s.gioi_tinh === 'Nam' ? 'selected' : ''}>Nam</option><option ${s.gioi_tinh === 'Nữ' ? 'selected' : ''}>Nữ</option></select></label>${row('Địa chỉ', s.dia_chi, 'dia_chi')}
                <label class="detail-field"><span>Trạng thái</span><select name="trang_thai"><option ${s.trang_thai === 'Đang học' ? 'selected' : ''}>Đang học</option><option ${s.trang_thai === 'Chuyển xứ' ? 'selected' : ''}>Chuyển xứ</option><option ${s.trang_thai === 'Nghỉ học' ? 'selected' : ''}>Nghỉ học</option></select></label>
            </div></section>
            <section class="detail-section"><h3>Phụ huynh</h3><div id="parents-list">${data.parents.map(parent => `<div class="repeat-row parent-row">${row('Họ tên', parent.ten_ph, 'ten_ph')}${row('Quan hệ', parent.moi_quan_he, 'moi_quan_he')}${row('SĐT', parent.sdt, 'sdt')}<button type="button" data-remove>Xóa</button></div>`).join('')}</div><button class="add-row" type="button" data-add="parent" aria-label="Thêm phụ huynh"><i class="fa-solid fa-plus"></i> Thêm phụ huynh</button></section>
            <section class="detail-section"><h3>Bí tích</h3><div id="sacraments-list">${data.sacraments.map(item => `<div class="repeat-row sacrament-row"><label>Loại bí tích<select name="loai_bi_tich"><option ${item.loai_bi_tich === 'Rửa tội' ? 'selected' : ''}>Rửa tội</option><option ${item.loai_bi_tich === 'Xưng tội & Rước lễ' ? 'selected' : ''}>Xưng tội & Rước lễ</option><option ${item.loai_bi_tich === 'Thêm sức' ? 'selected' : ''}>Thêm sức</option></select></label>${row('Ngày lãnh nhận', dateInput(item.ngay_lanh_nhan), 'ngay_lanh_nhan', 'date')}<span></span><span></span><button type="button" data-remove>Xóa</button></div>`).join('')}</div><button class="add-row" type="button" data-add="sacrament" aria-label="Thêm bí tích"><i class="fa-solid fa-plus"></i> Thêm bí tích</button></section>
        </form>`;
        body.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => button.parentElement.remove()));
        body.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
            const container = document.getElementById(button.dataset.add === 'parent' ? 'parents-list' : 'sacraments-list');
            const template = button.dataset.add === 'parent' ? '<div class="repeat-row parent-row"><label>Họ tên<input name="ten_ph"></label><label>Quan hệ<input name="moi_quan_he"></label><label>SĐT<input name="sdt"></label><button type="button" data-remove>Xóa</button></div>' : '<div class="repeat-row sacrament-row"><label>Loại bí tích<select name="loai_bi_tich"><option>Rửa tội</option><option>Xưng tội & Rước lễ</option><option>Thêm sức</option></select></label><label>Ngày lãnh nhận<input name="ngay_lanh_nhan" type="date"></label><span></span><span></span><button type="button" data-remove>Xóa</button></div>';
            container.insertAdjacentHTML('beforeend', template);
            container.lastElementChild.querySelector('[data-remove]').addEventListener('click', event => event.target.parentElement.remove());
        }));
    };

    document.querySelectorAll('[data-student-id]').forEach(button => button.addEventListener('click', async () => {
        currentId = button.dataset.studentId; modal.showModal(); body.innerHTML = '<p>Đang tải dữ liệu...</p>';
        try { const response = await fetch(`/glv/danh-sach-lop/${currentId}/detail?nien_khoa=${encodeURIComponent(yearId)}`); if (!response.ok) throw new Error(); currentData = await response.json(); renderView(currentData); } catch { body.innerHTML = '<p class="detail-error">Không thể tải thông tin.</p>'; }
    }));
    editButton.addEventListener('click', () => { renderEdit(currentData); editButton.hidden = true; saveButton.hidden = false; });
    saveButton.addEventListener('click', async () => { const form = document.getElementById('student-edit-form'); const data = Object.fromEntries(new FormData(form)); data.yearId = yearId; data.phu_huynh = [...body.querySelectorAll('.parent-row')].map(item => Object.fromEntries([...item.querySelectorAll('input')].map(input => [input.name, input.value]))); data.bi_tich = [...body.querySelectorAll('.sacrament-row')].map(item => Object.fromEntries([...item.querySelectorAll('input, select')].map(input => [input.name, input.value]))); const response = await fetch(`/glv/danh-sach-lop/${currentId}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }); if (!response.ok) { const result = await response.json(); alert(result.error || 'Không thể lưu.'); return; } currentData = await (await fetch(`/glv/danh-sach-lop/${currentId}/detail?nien_khoa=${encodeURIComponent(yearId)}`)).json(); renderView(currentData); editButton.hidden = false; saveButton.hidden = true; });
    document.querySelectorAll('.modal-close, #modal-cancel').forEach(button => button.addEventListener('click', () => modal.close()));
    document.querySelectorAll('.status-button').forEach(button => button.addEventListener('click', () => {
        statusStudentId = button.dataset.statusId;
        statusValue.value = button.dataset.currentStatus;
        statusError.hidden = true;
        statusModal.showModal();
    }));
    document.querySelectorAll('.status-modal-close').forEach(button => button.addEventListener('click', () => statusModal.close()));
    document.getElementById('status-save').addEventListener('click', async () => {
        const response = await fetch(`/glv/danh-sach-lop/${statusStudentId}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ yearId: yearId, trang_thai: statusValue.value })
        });
        if (!response.ok) {
            const result = await response.json();
            statusError.textContent = result.error || 'Không thể cập nhật trạng thái.';
            statusError.hidden = false;
            return;
        }
        statusModal.close();
        window.location.reload();
    });
})();
