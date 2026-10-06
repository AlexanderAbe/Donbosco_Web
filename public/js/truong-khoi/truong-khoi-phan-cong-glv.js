(() => {
    const yearId = document.querySelector('.tk-class-page')?.dataset.yearId || '';
    const modal = document.getElementById('glv-detail-modal');
    const content = document.getElementById('glv-detail-content');
    const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
    
    document.getElementById('close-glv-detail')?.addEventListener('click', () => modal.close());
    
    document.querySelectorAll('.detail-button').forEach(button => button.addEventListener('click', async () => {
        modal.showModal(); 
        content.textContent = 'Đang tải dữ liệu...';
        
        try { 
            const response = await fetch(`/truong-khoi/phan-cong-glv/${button.dataset.id}/detail?nien_khoa=${yearId}`); 
            const data = await response.json(); 
            if (!response.ok) throw new Error(data.error); 
            
            document.getElementById('glv-detail-title').textContent = [data.ten_thanh, data.ho_va_ten_lot, data.ten].filter(Boolean).join(' '); 
            
            let formattedDob = '-';
            if (data.ngay_sinh) {
                const dateStr = String(data.ngay_sinh).slice(0, 10);
                const parts = dateStr.split('-');
                if (parts.length === 3) {
                    formattedDob = `${parts[2]}/${parts[1]}/${parts[0]}`;
                }
            }

            content.innerHTML = `
                <div class="detail-grid">
                    <div><span>Ngày sinh</span><strong>${esc(formattedDob)}</strong></div>
                    <div><span>Giới tính</span><strong>${esc(data.gioi_tinh || '-')}</strong></div>
                    <div><span>Số điện thoại</span><strong>${esc(data.sdt || '-')}</strong></div>
                    <div><span>Tình trạng</span><strong>${esc(data.trang_thai || '-')}</strong></div>
                    <div><span>Lớp đang dạy</span><strong>${esc(data.ten_lop ? `${data.ten_khoi} - ${data.ten_lop}` : 'Chưa phân công')}</strong></div>
                </div>`; 
        } catch (error) { 
            content.textContent = error.message || 'Không thể tải thông tin GLV.'; 
        }
    }));
})();
