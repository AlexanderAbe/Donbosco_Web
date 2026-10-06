(() => {
    const yearId = document.querySelector('.tn-page')?.dataset.yearId || '';
    // --- XỬ LÝ MODAL CHI TIẾT ---
    const modalDetail = document.getElementById('student-modal');
    const detail = document.getElementById('student-detail');
    const editButton = document.getElementById('modal-edit');
    const saveButton = document.getElementById('modal-save');
    let currentStudentId = null;
    let currentStudentData = null;
    
    // --- XỬ LÝ MODAL IMPORT ---
    const modalImport = document.getElementById('import-modal');
    const btnOpenImport = document.getElementById('btnOpenImport');
    
    const closeAllModals = () => {
        modalDetail.classList.remove('is-open');
        modalDetail.setAttribute('aria-hidden', 'true');
        modalImport.classList.remove('is-open');
        modalImport.setAttribute('aria-hidden', 'true');
    };

    modalDetail.querySelectorAll('.modal-close, .modal-cancel').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Mở Modal Import
    btnOpenImport.addEventListener('click', () => {
        modalImport.classList.add('is-open');
        modalImport.setAttribute('aria-hidden', 'false');
    });

    // Đóng Modal khi bấm nút đóng hoặc hủy
    document.querySelectorAll('.modal-close, .modal-close-import').forEach(button => {
        button.addEventListener('click', closeAllModals);
    });

    // Đóng Modal khi click ra ngoài vùng chứa
    window.addEventListener('click', event => {
        if (event.target === modalDetail || event.target === modalImport) {
            closeAllModals();
        }
    });

    // Đóng Modal bằng phím Escape
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape') closeAllModals();
    });

    // Xử lý gửi Form Import bằng Fetch API
    document.getElementById('formImportExcel').addEventListener('submit', async function(e) {
        e.preventDefault();
        const btnSubmit = document.getElementById('btnSubmitImport');
        const originalText = btnSubmit.innerText;
        
        btnSubmit.innerText = 'Đang xử lý...';
        btnSubmit.disabled = true;

        try {
            const response = await fetch('/bdh/thieu-nhi/import', {
                method: 'POST',
                body: new FormData(this)
            });
            const result = await response.json();
            
            if (result.success) {
                alert(result.message);
                location.reload();
            } else {
                alert('Lỗi: ' + result.message);
            }
        } catch (error) {
            console.error('Lỗi upload:', error);
            alert('Đã xảy ra lỗi kết nối đến server.');
        } finally {
            btnSubmit.innerText = originalText;
            btnSubmit.disabled = false;
        }
    });

    // --- XỬ LÝ XEM CHI TIẾT Thiếu nhi ---
    const date = value => {
        if (!value) return 'Chưa cập nhật';
        const rawString = value instanceof Date ? value.toISOString() : String(value);
        const datePart = rawString.split('T')[0]; // Lấy phần YYYY-MM-DD
        const parts = datePart.split('-');
        if (parts.length === 3) {
            const [year, month, day] = parts;
            return `${day}/${month}/${year}`;
        }
        return value;
    };
    const dateInput = value => value ? String(value).slice(0, 10) : '';
    const formRow = (label, value, name, type = 'text') => `<label class="detail-field"><span>${label}</span><input name="${name}" type="${type}" value="${String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]))}"></label>`;

    const renderEdit = data => {
        const s = data.student;
        detail.innerHTML = `<form class="detail-form" id="student-edit-form">
            <section class="detail-section"><h3>Thông tin cơ bản</h3><div class="detail-grid">
                <div class="detail-field"><span>Mã số thiếu nhi</span><strong>${s.mstn || '-'}</strong></div>
                ${formRow('Thánh danh', s.ten_thanh, 'ten_thanh')}${formRow('Họ và tên lót', s.ho_va_ten_lot, 'ho_va_ten_lot')}${formRow('Tên', s.ten, 'ten')}${formRow('Ngày sinh', dateInput(s.ngay_sinh), 'ngay_sinh', 'date')}
                <label class="detail-field"><span>Giới tính</span><select name="gioi_tinh"><option ${s.gioi_tinh === 'Nam' ? 'selected' : ''}>Nam</option><option ${s.gioi_tinh === 'Nữ' ? 'selected' : ''}>Nữ</option></select></label>${formRow('Địa chỉ', s.dia_chi, 'dia_chi')}
                <label class="detail-field"><span>Trạng thái</span><select name="trang_thai"><option ${s.trang_thai === 'Đang học' ? 'selected' : ''}>Đang học</option><option ${s.trang_thai === 'Chuyển xứ' ? 'selected' : ''}>Chuyển xứ</option><option ${s.trang_thai === 'Nghỉ học' ? 'selected' : ''}>Nghỉ học</option></select></label>
            </div></section>
            <section class="detail-section"><h3>Phụ huynh</h3><div id="edit-parents-list">${data.parents.map(parent => `<div class="repeat-row parent-row">${formRow('Họ tên', parent.ten_ph, 'ten_ph')}${formRow('Quan hệ', parent.moi_quan_he, 'moi_quan_he')}${formRow('SĐT', parent.sdt, 'sdt')}<button type="button" data-remove>Xóa</button></div>`).join('')}</div><button class="add-row" type="button" data-add="parent">Thêm phụ huynh</button></section>
            <section class="detail-section"><h3>Bí tích</h3><div id="edit-sacraments-list">${data.sacraments.map(item => `<div class="repeat-row sacrament-row"><label>Loại bí tích<select name="loai_bi_tich"><option ${item.loai_bi_tich === 'Rửa tội' ? 'selected' : ''}>Rửa tội</option><option ${item.loai_bi_tich === 'Xưng tội & Rước lễ' ? 'selected' : ''}>Xưng tội & Rước lễ</option><option ${item.loai_bi_tich === 'Thêm sức' ? 'selected' : ''}>Thêm sức</option></select></label>${formRow('Ngày lãnh nhận', dateInput(item.ngay_lanh_nhan), 'ngay_lanh_nhan', 'date')}<button type="button" data-remove>Xóa</button></div>`).join('')}</div><button class="add-row" type="button" data-add="sacrament">Thêm bí tích</button></section>
        </form>`;
        detail.querySelectorAll('[data-remove]').forEach(button => button.addEventListener('click', () => button.parentElement.remove()));
        detail.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
            const parent = button.dataset.add === 'parent';
            const container = document.getElementById(parent ? 'edit-parents-list' : 'edit-sacraments-list');
            const template = parent
                ? `<div class="repeat-row parent-row">${formRow('Họ tên', '', 'ten_ph')}${formRow('Quan hệ', '', 'moi_quan_he')}${formRow('SĐT', '', 'sdt')}<button type="button" data-remove>Xóa</button></div>`
                : `<div class="repeat-row sacrament-row"><label>Loại bí tích<select name="loai_bi_tich"><option>Rửa tội</option><option>Xưng tội & Rước lễ</option><option>Thêm sức</option></select></label>${formRow('Ngày lãnh nhận', '', 'ngay_lanh_nhan', 'date')}<button type="button" data-remove>Xóa</button></div>`;
            container.insertAdjacentHTML('beforeend', template);
            container.lastElementChild.querySelector('[data-remove]').addEventListener('click', event => event.currentTarget.parentElement.remove());
        }));
    };

    document.querySelectorAll('.detail-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.detail-tab').forEach(item => {
                const isActive = item === tab;
                item.classList.toggle('is-active', isActive);
                item.setAttribute('aria-selected', String(isActive));
            });
            document.querySelectorAll('.detail-panel').forEach(panel => {
                panel.hidden = panel.id !== tab.dataset.tab;
                panel.classList.toggle('is-active', panel.id === tab.dataset.tab);
            });
        });
    });

    document.querySelectorAll('.view-student').forEach(button => {
        button.addEventListener('click', async () => {
            currentStudentId = button.dataset.id;
            editButton.hidden = false;
            saveButton.hidden = true;
            modalDetail.classList.add('is-open');
            modalDetail.setAttribute('aria-hidden', 'false');
            detail.innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
            try {
                const response = await fetch(`/bdh/thieu-nhi/${button.dataset.id}/detail?nien_khoa=${encodeURIComponent(yearId)}`);
                if (!response.ok) throw new Error();
                const data = await response.json();
                currentStudentData = data;
                const s = data.student;
                const historyByYear = new Map();
                data.classHistory.forEach(item => {
                    historyByYear.set(item.nien_khoa, { ...item });
                });
                data.scores.forEach(item => {
                    const history = historyByYear.get(item.nien_khoa) || {};
                    historyByYear.set(item.nien_khoa, { ...history, ...item });
                });
                const yearHistory = [...historyByYear.values()];
                const parents = data.parents || [];
                const sacraments = data.sacraments || [];
                
                detail.innerHTML = `
                    <div class="detail-panel is-active" id="detail-basic" role="tabpanel">
                        <div class="detail-section">
                            <h3>Thông tin cơ bản</h3>
                            <div class="detail-grid">
                                <div><span>Họ và tên</span><strong>${s.ho_ten || '-'}</strong></div>
                                <div><span>Thánh danh</span><strong>${s.ten_thanh || '-'}</strong></div>
                                <div><span>Ngày sinh</span><strong>${date(s.ngay_sinh)}</strong></div>
                                <div><span>Giới tính</span><strong>${s.gioi_tinh || '-'}</strong></div>
                                <div><span>Mã thiếu nhi</span><strong>${s.mstn || '-'}</strong></div>
                                <div><span>Địa chỉ</span><strong>${s.dia_chi || '-'}</strong></div>
                            </div>
                        </div>
                        <div class="detail-section">
                            <h3>Phụ huynh</h3>
                            ${parents.length ? `<div class="detail-grid">${parents.map(parent => `<div><span>${parent.moi_quan_he || 'Mối quan hệ'}</span><strong>${parent.ten_ph || '-'}</strong><small>${parent.sdt || 'Chưa có số điện thoại'}</small></div>`).join('')}</div>` : '<p class="muted">Chưa có thông tin phụ huynh.</p>'}
                        </div>
                        <div class="detail-section">
                            <h3>Bí tích</h3>
                            ${sacraments.length ? `<div class="detail-grid">${sacraments.map(sacrament => `<div><span>${sacrament.loai_bi_tich || 'Bí tích'}</span><strong>${date(sacrament.ngay_lanh_nhan)}</strong></div>`).join('')}</div>` : '<p class="muted">Chưa có thông tin bí tích.</p>'}
                        </div>
                    </div>
                    <div class="detail-panel" id="detail-history" role="tabpanel" hidden>
                        <div class="detail-section">
                            <h3>Lịch sử lớp học và điểm</h3>
                            ${yearHistory.length ? `<div class="score-table"><table><thead><tr><th>Niên khóa</th><th>Lớp</th><th>Học tập</th><th>Chuyên cần</th><th>Kỷ luật</th><th>Tổng</th></tr></thead><tbody>${yearHistory.map(item => `<tr><td>${item.nien_khoa || '-'}</td><td>${item.ten_khoi && item.ten_lop ? `${item.ten_khoi} - ${item.ten_lop}` : item.ten_lop || item.ten_khoi || '-'}</td><td>${item.diem_hoc_tap ?? '-'}</td><td>${item.diem_chuyen_can ?? '-'}</td><td>${item.diem_ky_luat ?? '-'}</td><td>${item.diem_tong ?? '-'}</td></tr>`).join('')}</tbody></table></div>` : '<p class="muted">Chưa có dữ liệu.</p>'}
                        </div>
                    </div>
                `;
            } catch (error) {
                detail.innerHTML = '<p class="error-message">Không thể tải thông tin chi tiết.</p>';
            }
        });
    });

    editButton.addEventListener('click', () => {
        renderEdit(currentStudentData);
        editButton.hidden = true;
        saveButton.hidden = false;
    });

    saveButton.addEventListener('click', async () => {
        const form = document.getElementById('student-edit-form');
        const payload = Object.fromEntries(new FormData(form));
        payload.yearId = yearId;
        payload.phu_huynh = [...detail.querySelectorAll('.parent-row')].map(item => Object.fromEntries([...item.querySelectorAll('input')].map(input => [input.name, input.value])));
        payload.bi_tich = [...detail.querySelectorAll('.sacrament-row')].map(item => Object.fromEntries([...item.querySelectorAll('input, select')].map(input => [input.name, input.value])));
        const response = await fetch(`/bdh/thieu-nhi/${currentStudentId}/update`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (!response.ok) {
            const result = await response.json();
            alert(result.error || 'Không thể lưu thông tin.');
            return;
        }
        location.reload();
    });

    // --- LỌC KHỐI - LỚP ---
    const khoi = document.getElementById('tn-khoi');
    const lop = document.getElementById('tn-lop');
    
    if (khoi && lop) {
        khoi.addEventListener('change', () => {
            [...lop.options].forEach(option => {
                option.hidden = option.value && khoi.value && option.dataset.khoi !== khoi.value;
            });
            if (lop.selectedOptions[0]?.hidden) lop.value = '';
        });
        khoi.dispatchEvent(new Event('change'));
    }
})();
