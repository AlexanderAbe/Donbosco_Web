(() => {
		const openModal = modal => {
			modal.classList.add('is-open');
			modal.setAttribute('aria-hidden', 'false');
		};
		const closeModal = modal => {
			modal.classList.remove('is-open');
			modal.setAttribute('aria-hidden', 'true');
		};
		const detailModal = document.getElementById('glv-detail-modal');
		const editModal = document.getElementById('glv-edit-modal');
		const detailFields = ['name', 'saint', 'phone', 'birth', 'gender', 'khoi', 'status'];
		const formatBirthDate = value => {
			if (!value) return '';
			// Lấy chuỗi chuyển thành dạng chữ, cắt bỏ phần giờ giấc (nếu có chữ T)
			const datePart = String(value).split('T')[0];
			const parts = datePart.split('-');
			
			if (parts.length === 3) {
				// parts[0] là năm, parts[1] là tháng, parts[2] là ngày
				return `${parts[2]}/${parts[1]}/${parts[0]}`;
			}
			return value;
		};

		document.getElementById('open-create-glv').addEventListener('click', () => openModal(document.getElementById('glv-create-modal')));
		document.getElementById('open-import-glv').addEventListener('click', () => openModal(document.getElementById('glv-import-modal')));

		document.querySelectorAll('.view-glv-btn').forEach(button => {
			button.addEventListener('click', () => {
				detailFields.forEach(field => {
					const value = field === 'birth'
						? formatBirthDate(button.dataset[field])
						: button.dataset[field];
					document.getElementById(`detail-${field}`).textContent = value || 'Chưa cập nhật';
				});
				openModal(detailModal);
			});
		});

		document.querySelectorAll('.edit-glv-btn').forEach(button => {
			button.addEventListener('click', () => {
				const form = document.getElementById('glv-edit-form');
				form.action = `/bdh/glv/${button.dataset.id}/update`;
				document.getElementById('edit-saint').value = button.dataset.saint;
				document.getElementById('edit-last-name').value = button.dataset.lastName;
				document.getElementById('edit-first-name').value = button.dataset.firstName;
				document.getElementById('edit-birth').value = button.dataset.birth;
				document.getElementById('edit-gender').value = button.dataset.gender;
				document.getElementById('edit-phone').value = button.dataset.phone;
				openModal(editModal);
			});
		});

		document.querySelectorAll('.close-glv-modal').forEach(button => {
			button.addEventListener('click', () => closeModal(button.closest('.glv-modal')));
		});
		document.querySelectorAll('.glv-modal').forEach(modal => {
			modal.addEventListener('click', event => {
				if (event.target === modal) closeModal(modal);
			});
		});
		document.addEventListener('keydown', event => {
			if (event.key === 'Escape') document.querySelectorAll('.glv-modal.is-open').forEach(closeModal);
		});
	})();
