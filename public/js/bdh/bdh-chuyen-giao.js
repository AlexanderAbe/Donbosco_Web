const lockForm = document.getElementById('lock-form');
	const transferForm = document.getElementById('transfer-form');
	const newYearSelect = document.getElementById('nien-khoa-moi');
	const transferButton = document.getElementById('transfer-button');
	const canTransfer = transferForm.dataset.canTransfer === 'true';
	const confirmationModal = document.getElementById('confirmation-modal');
	const modalTitle = document.getElementById('modal-title');
	const modalMessage = document.getElementById('modal-message');
	const modalCancel = document.getElementById('modal-cancel');
	const modalClose = document.getElementById('modal-close');
	const modalConfirm = document.getElementById('modal-confirm');
	let pendingForm = null;
	let allowSubmit = false;

	const closeConfirmationModal = () => {
		confirmationModal.close();
		pendingForm = null;
	};

	const openConfirmationModal = (title, message, form) => {
		modalTitle.textContent = title;
		modalMessage.textContent = message;
		pendingForm = form;
		confirmationModal.showModal();
	};

	lockForm?.addEventListener('submit', event => {
		if (allowSubmit) {
			allowSubmit = false;
			return;
		}
		event.preventDefault();
		openConfirmationModal(
			'Khóa niên khóa',
			`Sau khi khóa niên khóa ${lockForm.dataset.yearName}, toàn bộ dữ liệu sẽ không thể chỉnh sửa. Bạn có chắc chắn muốn tiếp tục không?`,
			lockForm
		);
	});

	newYearSelect.addEventListener('change', () => {
		transferButton.disabled = !canTransfer || !newYearSelect.value;
	});

	transferForm.addEventListener('submit', event => {
		if (allowSubmit) {
			allowSubmit = false;
			return;
		}
		if (!newYearSelect.value) {
			event.preventDefault();
			return;
		}

		const oldYear = transferForm.dataset.oldYear;
		const newYear = newYearSelect.options[newYearSelect.selectedIndex].text.trim();
		event.preventDefault();
		openConfirmationModal(
			'Xác nhận chuyển giao',
			`Bạn đang chuyển giao thiếu nhi từ niên khóa ${oldYear} sang niên khóa ${newYear}. Thiếu nhi lên lớp sẽ lên khối tiếp theo, thiếu nhi ở lại lớp sẽ ở lại khối. Bạn có chắc chắn muốn tiếp tục không?`,
			transferForm
		);
	});

	modalCancel.addEventListener('click', closeConfirmationModal);
	modalClose.addEventListener('click', closeConfirmationModal);
	confirmationModal.addEventListener('click', event => {
		if (event.target === confirmationModal) closeConfirmationModal();
	});
	modalConfirm.addEventListener('click', () => {
		if (!pendingForm) return;
		const form = pendingForm;
		allowSubmit = true;
		closeConfirmationModal();
		form.requestSubmit();
	});
