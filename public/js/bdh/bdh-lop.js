(() => {
		const modal = document.getElementById('class-modal');
		const form = document.getElementById('class-form');
		const modalTitle = document.getElementById('modal-title');
		const classId = document.getElementById('class-id');
		const className = document.getElementById('class-name');
		const classKhoi = document.getElementById('class-khoi');
		const classYear = document.getElementById('class-year');

		const closeModal = () => {
			modal.classList.remove('is-open');
			modal.setAttribute('aria-hidden', 'true');
		};

		document.getElementById('open-create-modal')?.addEventListener('click', () => {
			form.action = '/bdh/lop/create';
			modalTitle.textContent = 'Thêm lớp mới';
			classId.value = '';
			className.value = '';
			classKhoi.selectedIndex = 0;
			classYear.value = classYear.dataset.selectedYear;
			modal.classList.add('is-open');
			modal.setAttribute('aria-hidden', 'false');
			className.focus();
		});

		document.querySelectorAll('.edit-class-btn').forEach(button => {
			button.addEventListener('click', () => {
				form.action = '/bdh/lop/update';
				modalTitle.textContent = 'Cập nhật thông tin lớp';
				classId.value = button.dataset.id;
				className.value = button.dataset.name;
				classKhoi.value = button.dataset.khoi;
				classYear.value = button.dataset.year;
				modal.classList.add('is-open');
				modal.setAttribute('aria-hidden', 'false');
				className.focus();
			});
		});

		document.getElementById('close-modal').addEventListener('click', closeModal);
		modal.addEventListener('click', event => {
			if (event.target === modal) closeModal();
		});
		document.addEventListener('keydown', event => {
			if (event.key === 'Escape') closeModal();
		});
	})();
