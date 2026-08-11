document.addEventListener("DOMContentLoaded", function () {
  // Dữ liệu giả lập UI
  var mockStudents = [
    { id: "000000", name: "Nguyễn Văn A", class: "1A" },
    { id: "000001", name: "Nguyễn Thị B", class: "1B" },
    { id: "000002", name: "Lê Hoàng C", class: "1A" },
    { id: "000003", name: "Vũ Thị D", class: "1B" },
  ];

  var currentMode = "input"; // "input" | "export" | "manage"

  // 1. Render Bảng Điểm Danh
  function renderAttendance() {
    var head = document.querySelector("#tableAttendance thead");
    var body = document.querySelector("#tableAttendance tbody");

    if (currentMode === "input") {
      head.innerHTML =
        "<tr><th style='text-align:left;'>Tên Thiếu Nhi</th><th>Lớp</th><th>Đi sớm</th><th>Vắng</th><th>Kỷ luật</th></tr>";
      body.innerHTML = mockStudents
        .map(function (s) {
          return (
            "<tr><td style='text-align:left;'>" +
            s.name +
            "</td><td>" +
            s.class +
            "</td><td><input type='text'/></td><td><input type='text'/></td><td><input type='text'/></td></tr>"
          );
        })
        .join("");
    } else {
      head.innerHTML =
        "<tr><th>Mã Thiếu Nhi</th><th>Lớp</th><th style='text-align:left;'>Tên Thiếu Nhi</th><th>Thao tác</th></tr>";
      body.innerHTML = mockStudents
        .map(function (s) {
          return (
            "<tr><td>" +
            s.id +
            "</td><td>" +
            s.class +
            "</td><td style='text-align:left;'>" +
            s.name +
            "</td><td><span class='status-dot'></span></td></tr>"
          );
        })
        .join("");
    }
  }

  // 2. Render Bảng Điểm Kiểm Tra
  function renderTestScore() {
    var head = document.querySelector("#tableTestScore thead");
    var body = document.querySelector("#tableTestScore tbody");

    if (currentMode === "input") {
      head.innerHTML =
        "<tr><th style='text-align:left;'>Tên Thiếu Nhi</th><th>Lớp</th><th>6/9</th><th>13/9</th><th>20/9</th><th>27/9</th></tr>";
      body.innerHTML = mockStudents
        .map(function (s) {
          return (
            "<tr><td style='text-align:left;'>" +
            s.name +
            "</td><td>" +
            s.class +
            "</td><td><input type='number' min='0' max='10'/></td><td><input type='number' min='0' max='10'/></td><td><input type='number' min='0' max='10'/></td><td><input type='number' min='0' max='10'/></td></tr>"
          );
        })
        .join("");
    } else {
      head.innerHTML =
        "<tr><th>Mã Thiếu Nhi</th><th>Lớp</th><th style='text-align:left;'>Tên Thiếu Nhi</th><th>Thao tác</th></tr>";
      body.innerHTML = mockStudents
        .map(function (s) {
          return (
            "<tr><td>" +
            s.id +
            "</td><td>" +
            s.class +
            "</td><td style='text-align:left;'>" +
            s.name +
            "</td><td><span class='status-dot'></span></td></tr>"
          );
        })
        .join("");
    }
  }

  // 3. Render có hiệu ứng mượt (Transition)
  function renderAll() {
    var tables = document.querySelectorAll(".data-table");
    tables.forEach(function (t) {
      t.classList.add("fade-out");
    });

    setTimeout(function () {
      renderAttendance();
      renderTestScore();
      tables.forEach(function (t) {
        t.classList.remove("fade-out");
      });
    }, 150);
  }

  // 4. Sự kiện Chuyển Mode (Nhập điểm / Xuất file / Quản lý)
  var modeBtns = document.querySelectorAll(".mode-btn");
  modeBtns.forEach(function (btn) {
    btn.addEventListener("click", function () {
      modeBtns.forEach(function (b) {
        b.classList.remove("active");
      });
      this.classList.add("active");
      currentMode = this.getAttribute("data-mode");

      var dataContainer = document.getElementById("dataContainer");
      var manageContainer = document.getElementById("manageContainer");
      var pdfBtns = document.querySelectorAll(".btn-pdf");
      var selects = document.querySelectorAll(".custom-select");

      if (currentMode === "manage") {
        dataContainer.classList.add("hidden");
        manageContainer.classList.remove("hidden");
      } else {
        dataContainer.classList.remove("hidden");
        manageContainer.classList.add("hidden");

        pdfBtns.forEach(function (p) {
          p.classList.toggle("hidden", currentMode !== "export");
        });
        selects.forEach(function (s) {
          s.classList.toggle("hidden", currentMode === "export");
        });

        renderAll();
      }
    });
  });

  // 5. Sự kiện Chuyển Sidebar (Điểm danh <-> Điểm kiểm tra)
  var menuAttendance = document.getElementById("menuAttendance");
  var menuTestScore = document.getElementById("menuTestScore");
  var sectionAttendance = document.getElementById("sectionAttendance");
  var sectionTestScore = document.getElementById("sectionTestScore");

  menuAttendance.addEventListener("click", function () {
    menuAttendance.classList.add("active");
    menuTestScore.classList.remove("active");
    sectionAttendance.classList.remove("hidden");
    sectionTestScore.classList.add("hidden");
  });

  menuTestScore.addEventListener("click", function () {
    menuTestScore.classList.add("active");
    menuAttendance.classList.remove("active");
    sectionTestScore.classList.remove("hidden");
    sectionAttendance.classList.add("hidden");
  });

  // 6. Ô tìm kiếm Live Search
  var searchInput = document.getElementById("searchInput");
  if (searchInput) {
    searchInput.addEventListener("input", function (e) {
      var keyword = e.target.value.toLowerCase().trim();
      var activeRows = document.querySelectorAll(
        ".tab-section:not(.hidden) .data-table tbody tr"
      );
      activeRows.forEach(function (row) {
        row.style.display = row.textContent.toLowerCase().includes(keyword)
          ? ""
          : "none";
      });
    });
  }

  // Chạy lần đầu
  renderAll();
});
