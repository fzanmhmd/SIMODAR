const monthFilter = document.querySelector("#bulanAdmin");
const searchInput = document.querySelector("#adminSearchInput");
const menuToggle = document.querySelector(".admin-menu-toggle");
const adminSidebar = document.querySelector("#adminSidebar");
const liveClocks = Array.from(document.querySelectorAll("[data-live-clock]"));
const adminToast = document.querySelector("#adminToast");
const searchableAreas = Array.from(document.querySelectorAll("[data-admin-search-area], .admin-panel"));

const showAdminToast = (message) => {
  if (!adminToast || !message) return;

  adminToast.textContent = message;
  adminToast.classList.add("is-visible");
  window.setTimeout(() => adminToast.classList.remove("is-visible"), 3200);
};

monthFilter?.addEventListener("change", () => {
  monthFilter.form?.submit();
});

searchInput?.addEventListener("input", () => {
  const query = searchInput.value.trim().toLowerCase();

  searchableAreas.forEach((area) => {
    const content = area.textContent.toLowerCase();
    const isMatch = !query || content.includes(query);
    area.classList.toggle("is-search-muted", !isMatch);
  });
});

menuToggle?.addEventListener("click", () => {
  const isOpen = document.body.classList.toggle("admin-menu-open");
  menuToggle.setAttribute("aria-expanded", String(isOpen));
});

adminSidebar?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    document.body.classList.remove("admin-menu-open");
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

if (liveClocks.length) {
  const dayNames = [
    "Minggu",
    "Senin",
    "Selasa",
    "Rabu",
    "Kamis",
    "Jumat",
    "Sabtu",
  ];
  const monthNames = [
    "Januari",
    "Februari",
    "Maret",
    "April",
    "Mei",
    "Juni",
    "Juli",
    "Agustus",
    "September",
    "Oktober",
    "November",
    "Desember",
  ];
  const padClock = (value) => String(value).padStart(2, "0");

  const clockStart = Date.now();
  const serverStart = new Date(liveClocks[0].dataset.start).getTime();
  const baseTime = Number.isNaN(serverStart) ? clockStart : serverStart;

  const updateLiveClock = () => {
    const currentTime = new Date(baseTime + Date.now() - clockStart);
    const text = `${dayNames[currentTime.getDay()]}, ${currentTime.getDate()} ${monthNames[currentTime.getMonth()]} ${currentTime.getFullYear()}, ${padClock(currentTime.getHours())}:${padClock(currentTime.getMinutes())}:${padClock(currentTime.getSeconds())}`;

    liveClocks.forEach((clock) => {
      clock.textContent = text;
      clock.setAttribute("datetime", currentTime.toISOString());
    });
  };

  updateLiveClock();
  window.setInterval(updateLiveClock, 1000);
}

document.addEventListener("click", (event) => {
  const addButton = event.target.closest("[data-add-staff-row]");
  const removeButton = event.target.closest("[data-remove-staff-row]");
  const toastButton = event.target.closest("[data-toast-click]");

  if (addButton) {
    const list = addButton.closest("form")?.querySelector("[data-staff-assignment-list]");
    const firstRow = list?.querySelector(".staff-assignment-row");
    if (!list || !firstRow) return;

    const clone = firstRow.cloneNode(true);
    clone.querySelectorAll("select").forEach((select) => {
      select.selectedIndex = 0;
    });
    list.appendChild(clone);
    showAdminToast("Kolom petugas ditambahkan.");
  }

  if (removeButton) {
    const row = removeButton.closest(".staff-assignment-row");
    const list = row?.parentElement;
    if (row && list && list.querySelectorAll(".staff-assignment-row").length > 1) {
      row.remove();
      showAdminToast("Kolom petugas dihapus.");
    }
  }

  if (toastButton) {
    showAdminToast(toastButton.dataset.toastClick);
  }
});

showAdminToast(document.body.dataset.toastMessage);
