document.addEventListener('DOMContentLoaded', () => {
    const alertBoxes = document.querySelectorAll('.alert-toast');

    alertBoxes.forEach(alertBox => {
        dismissToast(alertBox);
    });
});

const dismissToast = toast => {
    setTimeout(() => {
        toast.style.transition = 'opacity 0.5s ease';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
};

window.showAppToast = (message, type = 'error') => {
    const toastTemplate = document.getElementById('app-toast-template');
    const toastTypes = {
        success: 'fa-circle-check',
        error: 'fa-triangle-exclamation',
        warning: 'fa-triangle-exclamation',
        info: 'fa-circle-info'
    };
    const icon = toastTypes[type] ? `fa-solid ${toastTypes[type]}` : `fa-solid ${toastTypes.error}`;
    const toast = toastTemplate.content.firstElementChild.cloneNode(true);
    toast.classList.add(`alert-${toastTypes[type] ? type : 'error'}`);
    toast.querySelector('i').className = icon;
    toast.querySelector('span').textContent = message;
    document.body.appendChild(toast);
    dismissToast(toast);
};
