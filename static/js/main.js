const loader = document.querySelector("#loader");
const passwordInput = document.querySelector("#password");
const togglePassword = document.querySelector("#togglePassword");
const requestButton = document.querySelector("#requestButton");
const checkRequestButton = document.querySelector("#checkRequestButton");

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

const now = new Date();
const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const todayLabel = document.querySelector("#todayLabel");
const previousMonthLabel = document.querySelector("#previousMonthLabel");
const currentMonthLabel = document.querySelector("#currentMonthLabel");
const scheduleRows = document.querySelector("#scheduleRows");

function formatDate(date) {
  return `${date.getDate()} ${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

window.addEventListener("load", () => {
  window.setTimeout(() => {
    loader?.classList.add("is-hidden");
  }, 900);
});

if (todayLabel) {
  todayLabel.textContent = formatDate(now);
}

if (previousMonthLabel) {
  previousMonthLabel.textContent = `Rekap ${monthNames[previousMonth.getMonth()]} ${previousMonth.getFullYear()}`;
}

if (currentMonthLabel) {
  currentMonthLabel.textContent = `Kegiatan mobile unit ${monthNames[now.getMonth()]} ${now.getFullYear()}`;
}

if (scheduleRows) {
  const places = [
    "Mandiri Inhealth",
    "SMA 12 Jakarta",
    "Universitas Nasional",
    "Kantor Kecamatan Pasar Minggu",
    "RSUD Pasar Rebo",
    "Mall Pelayanan Publik",
    "PT Astra Komponen",
    "Gedung PMI Kota",
  ];

  scheduleRows.innerHTML = places
    .map((place, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), Math.min(4 + index * 3, 28));
      return `
        <tr>
          <td>${index + 1}</td>
          <td>${place}</td>
          <td>${formatDate(date)}</td>
        </tr>
      `;
    })
    .join("");
}

togglePassword?.addEventListener("click", () => {
  const isHidden = passwordInput.type === "password";
  passwordInput.type = isHidden ? "text" : "password";
  togglePassword.setAttribute("aria-label", isHidden ? "Sembunyikan password" : "Tampilkan password");
});

requestButton?.addEventListener("click", (event) => {
  event.preventDefault();
  window.location.assign("/pengajuan");
});

checkRequestButton?.addEventListener("click", (event) => {
  event.preventDefault();
  window.location.assign("/cek-pengajuan");
});
