(() => {
    const modal = document.getElementById('bulk-sacrament-modal');
    const form = document.getElementById('bulk-sacrament-form');
    if (!modal || !form) return;

    // Lấy yearId an toàn từ thuộc tính data- of modal
    const yearId = modal.dataset.yearId || '';

    const close = () => modal.close();
    
    const openBtn = document.getElementById('open-bulk-sacrament');
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.showModal();
            loadStudents();
        });
    }

    const closeBtn = document.getElementById('close-bulk-sacrament');
    if (closeBtn) closeBtn.addEventListener('click', close);

    const cancelBtn = document.getElementById('cancel-bulk-sacrament');
    if (cancelBtn) cancelBtn.addEventListener('click', close);

    const blockSelect = document.getElementById('bulk-sacrament-block');
    const studentList = document.getElementById('bulk-sacrament-students');

    const loadStudents = async () => {
        if (!blockSelect || !blockSelect.value || !studentList) return;
        studentList.textContent = 'Đang tải danh sách...';
        try {
            const response = await fetch(`/truong-khoi/dashboard/sacraments/students?yearId=${yearId}&blockId=${blockSelect.value}`);
            if (!response.ok) throw new Error('Không thể tải dữ liệu');
            const students = await response.json();
            
            studentList.innerHTML = students.length
                ? students.map(student => `<label><input type="checkbox" value="${student.id_tn}" checked> ${student.ho_ten || ('#' + student.id_tn)}</label>`).join('')
                : '<span>Khối chưa có thiếu nhi.</span>';
        } catch (e) {
            studentList.textContent = 'Không thể tải danh sách thiếu nhi.';
        }
    };

    if (blockSelect) {
        blockSelect.addEventListener('change', loadStudents);
    }

    form.addEventListener('submit', async event => {
        event.preventDefault();
        const error = document.getElementById('bulk-sacrament-error');
        if (error) error.textContent = '';
        
        try {
            const response = await fetch('/truong-khoi/dashboard/sacraments/bulk', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    yearId: yearId,
                    blockId: blockSelect ? blockSelect.value : '',
                    sacramentType: document.getElementById('bulk-sacrament-type')?.value || '',
                    receivedDate: document.getElementById('bulk-sacrament-date')?.value || '',
                    studentIds: studentList ? [...studentList.querySelectorAll('input:checked')].map(input => input.value) : []
                })
            });
            const result = await response.json();
            if (!response.ok) {
                if (error) error.textContent = result.error || 'Không thể tạo bí tích.';
                return;
            }
            close();
            window.location.reload();
        } catch (err) {
            if (error) error.textContent = 'Đã xảy ra lỗi kết nối đến máy chủ.';
        }
    });
})();
