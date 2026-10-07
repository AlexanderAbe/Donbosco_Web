// Lưu trữ các bộ đếm thời gian (timeout) riêng cho từng ô input để tránh xung đột
const hideTimeouts = {};

document.querySelectorAll(".toggle-password").forEach((button) => {
  button.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const passwordInput = document.getElementById(targetId);
    const icon = this.querySelector("i"); // Lấy thẻ i bên trong button

    if (!passwordInput || !icon) return;

    // Đổi trạng thái type của input
    const isPassword = passwordInput.getAttribute("type") === "password";
    const newType = isPassword ? "text" : "password";
    passwordInput.setAttribute("type", newType);

    // Đổi icon con mắt
    icon.classList.toggle("fa-eye");
    icon.classList.toggle("fa-eye-slash");

    // Xử lý tự động ẩn sau 3 giây khi chuyển sang hiển thị text
    if (newType === "text") {
      // Nếu đang có lịch hẹn ẩn trước đó của ô này thì xóa đi
      if (hideTimeouts[targetId]) {
        clearTimeout(hideTimeouts[targetId]);
      }

      // Đặt lịch hẹn mới sau 3 giây tự động ẩn lại
      hideTimeouts[targetId] = setTimeout(() => {
        passwordInput.setAttribute("type", "password");
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
        delete hideTimeouts[targetId];
      }, 3000);
    } else {
      // Nếu người dùng chủ động bấm ẩn lại trước 3 giây
      if (hideTimeouts[targetId]) {
        clearTimeout(hideTimeouts[targetId]);
        delete hideTimeouts[targetId];
      }
    }
  });
});
