document.addEventListener('DOMContentLoaded', () => {
        const requiredInputs = document.querySelectorAll('input[required], select[required]');
        requiredInputs.forEach(input => {
            input.addEventListener('invalid', (e) => {
                e.target.setCustomValidity('Vui lòng không để trống trường này!');
            });
            input.addEventListener('input', (e) => {
                e.target.setCustomValidity('');
            });
        });
    });

    // Mở Modal và đổ dữ liệu động ra các ô input
    function openYearConfig(button) {
        // Lấy dữ liệu JSON từ thuộc tính data-group của nút được bấm
        const groupData = JSON.parse(button.getAttribute('data-group'));
        
        // Gán tên niên khóa và ID ẩn vào form
        document.getElementById('modalNienKhoaTitle').textContent = groupData.nien_khoa;
        document.getElementById('modal_id_cau_hinh_nam_hoc').value = groupData.id_cau_hinh_nam_hoc;

        // Render danh sách các mức học lực để chỉnh sửa điểm Min - Max
        const container = document.getElementById('rankingInputsContainer');
        container.innerHTML = '';

        groupData.details.forEach(item => {
            const rowDiv = document.createElement('div');
            rowDiv.style.cssText = "display: flex; gap: 12px; align-items: center; margin-bottom: 12px; background: #f9fafb; padding: 12px; border-radius: 8px; border: 1px solid #e5e7eb;";
            
            rowDiv.innerHTML = `
                <div style="flex: 1.2; font-weight: 600; color: #1f2937; font-size: 14px;">
                    <i class="fa-solid fa-award" style="color: #4f46e5; margin-right: 6px;"></i> ${item.ten_xep_loai}
                    <input type="hidden" name="rankings[${item.id_khung_xep_loai}][id]" value="${item.id_khung_xep_loai}">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 11px; color: #6b7280; display: block; margin-bottom: 2px; font-weight: 500;">Điểm Min</label>
                    <input type="number" step="0.1" min="0" max="10" name="rankings[${item.id_khung_xep_loai}][min]" value="${item.min}" required class="form-control" style="margin-top:0; padding: 6px 10px;">
                </div>
                <div style="flex: 1;">
                    <label style="font-size: 11px; color: #6b7280; display: block; margin-bottom: 2px; font-weight: 500;">Điểm Max</label>
                    <input type="number" step="0.1" min="0" max="10" name="rankings[${item.id_khung_xep_loai}][max]" value="${item.max}" required class="form-control" style="margin-top:0; padding: 6px 10px;">
                </div>
            `;
            container.appendChild(rowDiv);
        });

        // Hiển thị modal
        document.getElementById('yearConfigModal').style.display = 'flex';
    }

    // Đóng Modal
    function closeYearConfigModal() {
        document.getElementById('yearConfigModal').style.display = 'none';
    }

    // Đóng khi bấm ra ngoài vùng nền mờ
    window.onclick = function(event) {
        const modal = document.getElementById('yearConfigModal');
        if (event.target === modal) {
            closeYearConfigModal();
        }
    }
