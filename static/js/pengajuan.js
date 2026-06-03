const form = document.querySelector("[data-submission-form]");
const institutionSearch = document.querySelector("#instansiSearch");
const institutionOptions = document.querySelector("#institutionOptions");
const institutionNotFound = document.querySelector("#instansiTidakAda");
const newLocationBlock = document.querySelector("#newLocationBlock");
const newInstitutionInput = document.querySelector("#instansiBaru");
const addressInput = document.querySelector("#lokasi");
const latitudeInput = document.querySelector("#latitude");
const longitudeInput = document.querySelector("#longitude");
const mapPin = document.querySelector("#mapPin");
const mapsFrame = document.querySelector("#mapsFrame");
const mapsLink = document.querySelector("#mapsLink");
const mapStatus = document.querySelector("#mapStatus");
const showAddressMapButton = document.querySelector("#showAddressMap");
const useMyLocationButton = document.querySelector("#useMyLocation");
const startTimeInput = document.querySelector("#jamMulai");
const endTimeInput = document.querySelector("#jamSelesai");
const formToast = document.querySelector("#formToast");
const copyCodeButton = document.querySelector("[data-copy-code]");

const registeredInstitutions = {
  "Mandiri Inhealth": {
    address: "Menara Mandiri Inhealth, Jl. Prof. Dr. Satrio, Jakarta Selatan",
    lat: -6.22449,
    lng: 106.82331,
  },
  "SMA 12 Jakarta": {
    address: "SMA Negeri 12 Jakarta, Jl. Pertanian, Duren Sawit, Jakarta Timur",
    lat: -6.23217,
    lng: 106.91573,
  },
  "Universitas Nasional": {
    address: "Universitas Nasional, Jl. Sawo Manila, Pejaten, Jakarta Selatan",
    lat: -6.28068,
    lng: 106.83229,
  },
  "Kantor Kecamatan Pasar Minggu": {
    address: "Kantor Kecamatan Pasar Minggu, Jakarta Selatan",
    lat: -6.28384,
    lng: 106.84491,
  },
  "PT Astra Komponen": {
    address: "Kawasan Industri Sunter, Jakarta Utara",
    lat: -6.13836,
    lng: 106.88204,
  },
};

const institutionNames = Object.keys(registeredInstitutions);

const defaultMapPoint = {
  lat: -6.2088,
  lng: 106.8456,
};

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;
let toastTimer;
let invalidToastQueued = false;

function showToast(message, type = "error") {
  if (!formToast) {
    return;
  }

  window.clearTimeout(toastTimer);
  formToast.textContent = message;
  formToast.classList.remove("is-error", "is-success");
  formToast.classList.add(`is-${type}`, "is-visible");

  toastTimer = window.setTimeout(() => {
    formToast.classList.remove("is-visible");
  }, 4600);
}

async function copyText(value) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const helper = document.createElement("textarea");
  helper.value = value;
  helper.setAttribute("readonly", "");
  helper.style.position = "fixed";
  helper.style.left = "-9999px";
  document.body.appendChild(helper);
  helper.select();
  document.execCommand("copy");
  helper.remove();
}

function setMapStatus(message, type = "info") {
  if (!mapStatus) {
    return;
  }

  mapStatus.textContent = message;
  mapStatus.classList.remove("map-status--info", "map-status--success", "map-status--error");
  mapStatus.classList.add(`map-status--${type}`);
  mapStatus.setAttribute("role", type === "error" ? "alert" : "status");
  mapStatus.setAttribute("aria-live", type === "error" ? "assertive" : "polite");
}

function fieldName(field) {
  if (!field) {
    return "Field";
  }

  const label = field.id ? document.querySelector(`label[for="${field.id}"]`) : null;

  if (label) {
    return label.textContent.replace("*", "").trim();
  }

  return field.placeholder || field.name || "Field wajib";
}

function normalizeTimeValue(field) {
  const rawValue = field.value.trim();
  const digits = rawValue.replace(/\D/g, "").slice(0, 4);

  if (!rawValue) {
    return;
  }

  if (/^\d{1,2}:\d{1,2}$/.test(rawValue)) {
    const [hours, minutes] = rawValue.split(":");
    field.value = `${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}`;
    return;
  }

  if (digits.length === 3) {
    field.value = `0${digits.slice(0, 1)}:${digits.slice(1)}`;
    return;
  }

  if (digits.length === 4) {
    field.value = `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
}

function minutesFromTime(value) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function validateTimeFields() {
  [startTimeInput, endTimeInput].forEach((field) => {
    if (!field) {
      return;
    }

    if (!field.value) {
      field.setCustomValidity("");
      return;
    }

    field.setCustomValidity(timePattern.test(field.value) ? "" : "Gunakan format 24 jam 00:00 sampai 23:59.");
  });

  if (
    startTimeInput?.value &&
    endTimeInput?.value &&
    timePattern.test(startTimeInput.value) &&
    timePattern.test(endTimeInput.value) &&
    minutesFromTime(endTimeInput.value) <= minutesFromTime(startTimeInput.value)
  ) {
    endTimeInput.setCustomValidity("Jam selesai harus lebih besar dari jam mulai.");
  }
}

function renderInstitutionOptions(query = "") {
  if (!institutionOptions) {
    return;
  }

  const normalizedQuery = query.trim().toLowerCase();
  const matches = institutionNames.filter((name) => {
    const data = registeredInstitutions[name];
    return (
      name.toLowerCase().includes(normalizedQuery) ||
      data.address.toLowerCase().includes(normalizedQuery)
    );
  });

  institutionOptions.innerHTML = "";

  if (matches.length === 0) {
    institutionOptions.innerHTML = '<div class="combo-empty">Tidak ada pilihan. Centang "Tidak ada di daftar" untuk input tempat baru.</div>';
    institutionOptions.hidden = false;
    return;
  }

  matches.forEach((name) => {
    const data = registeredInstitutions[name];
    const button = document.createElement("button");
    button.className = "combo-option";
    button.type = "button";
    button.setAttribute("role", "option");
    button.innerHTML = `<strong>${name}</strong><span>${data.address}</span>`;
    button.addEventListener("click", () => {
      selectInstitution(name);
    });
    institutionOptions.appendChild(button);
  });

  institutionOptions.hidden = false;
}

function hideInstitutionOptions() {
  if (institutionOptions) {
    institutionOptions.hidden = true;
  }
}

function validateInstitution() {
  if (!institutionSearch) {
    return;
  }

  const isNew = Boolean(institutionNotFound?.checked);
  const selected = institutionSearch.value.trim();
  const isRegistered = Boolean(registeredInstitutions[selected]);

  if (!isNew && selected && !isRegistered) {
    institutionSearch.setCustomValidity("Pilih instansi dari daftar, atau centang tidak ada di daftar.");
  } else {
    institutionSearch.setCustomValidity("");
  }
}

function formatCoordinate(value) {
  return Number(value).toFixed(6);
}

function updateMapPoint(lat, lng, source = "Titik lokasi berhasil disimpan.") {
  if (!latitudeInput || !longitudeInput) {
    return;
  }

  const cleanLat = formatCoordinate(lat);
  const cleanLng = formatCoordinate(lng);

  latitudeInput.value = cleanLat;
  longitudeInput.value = cleanLng;

  if (mapsFrame) {
    mapsFrame.src = `https://maps.google.com/maps?q=${cleanLat},${cleanLng}&z=16&output=embed`;
  }

  if (mapsLink) {
    mapsLink.href = `https://www.google.com/maps?q=${cleanLat},${cleanLng}`;
  }

  setMapStatus(`${source} Koordinat: ${cleanLat}, ${cleanLng}.`, "success");

}

function updateMapQuery(query, source = "Alamat ditampilkan di Google Maps.") {
  const cleanQuery = query.trim();

  if (!cleanQuery) {
    setMapStatus("Isi alamat lokasi kegiatan terlebih dahulu.", "error");
    return;
  }

  const encodedQuery = encodeURIComponent(cleanQuery);

  if (mapsFrame) {
    mapsFrame.src = `https://maps.google.com/maps?q=${encodedQuery}&z=16&output=embed`;
  }

  if (mapsLink) {
    mapsLink.href = `https://www.google.com/maps/search/?api=1&query=${encodedQuery}`;
  }

  setMapStatus(`${source} Jika titik belum tepat, buka Google Maps lalu salin koordinat ke bagian manual.`, "info");
}

function setNewLocationMode(isNew) {
  if (!newLocationBlock || !newInstitutionInput) {
    return;
  }

  newLocationBlock.hidden = !isNew;
  newInstitutionInput.required = isNew;

  if (institutionSearch) {
    institutionSearch.required = !isNew;
    institutionSearch.disabled = isNew;
  }

  if (!isNew) {
    newInstitutionInput.value = "";
  } else if (institutionSearch) {
    institutionSearch.value = "";
  }

  validateInstitution();
}

function selectInstitution(name) {
  if (!institutionSearch) {
    return;
  }

  const data = registeredInstitutions[name];

  if (data) {
    institutionSearch.value = name;

    if (newInstitutionInput) {
      newInstitutionInput.value = "";
    }

    if (institutionNotFound) {
      institutionNotFound.checked = false;
    }

    setNewLocationMode(false);
    hideInstitutionOptions();

    if (addressInput) {
      addressInput.value = data.address;
    }

    updateMapPoint(data.lat, data.lng, `Titik ${name} otomatis dimuat dari data terdaftar.`);
  }
}

function handleInstitutionInput() {
  if (!institutionSearch) {
    return;
  }

  const selected = institutionSearch.value.trim();
  const data = registeredInstitutions[selected];

  renderInstitutionOptions(selected);

  if (data) {
    selectInstitution(selected);
    return;
  }

  if (selected && !data) {
    setMapStatus("Jika instansi tidak muncul di saran, centang pilihan tidak ada di daftar lalu input nama baru.", "info");
  }

  validateInstitution();
}

institutionSearch?.addEventListener("focus", () => {
  renderInstitutionOptions(institutionSearch.value);
});
institutionSearch?.addEventListener("input", handleInstitutionInput);
institutionSearch?.addEventListener("change", handleInstitutionInput);

institutionNotFound?.addEventListener("change", () => {
  const isNew = institutionNotFound.checked;

  setNewLocationMode(isNew);

  if (isNew) {
    if (addressInput) {
      addressInput.value = "";
    }

    updateMapQuery("Jakarta", "Lengkapi nama instansi/tempat baru dan alamat kegiatan.");
    newInstitutionInput?.focus();
  }

  validateInstitution();
});

document.addEventListener("click", (event) => {
  if (!event.target.closest(".combo-field")) {
    hideInstitutionOptions();
  }
});

showAddressMapButton?.addEventListener("click", () => {
  updateMapQuery(addressInput?.value || "", "Alamat lokasi kegiatan ditampilkan di peta.");
});

useMyLocationButton?.addEventListener("click", () => {
  if (!navigator.geolocation) {
    setMapStatus("Browser tidak mendukung fitur lokasi. Isi koordinat manual jika diperlukan.", "error");
    return;
  }

  setMapStatus("Mengambil lokasi Anda...", "info");

  navigator.geolocation.getCurrentPosition(
    (position) => {
      if (mapPin) {
        mapPin.style.left = "50%";
        mapPin.style.top = "50%";
      }

      updateMapPoint(position.coords.latitude, position.coords.longitude, "Lokasi Anda berhasil disimpan.");
    },
    () => {
      const locationMessage = "Izin lokasi tidak diberikan. Isi alamat lalu tampilkan di peta, atau isi koordinat manual.";
      setMapStatus(locationMessage, "error");
      showToast(locationMessage, "error");
    },
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    },
  );
});

latitudeInput?.addEventListener("input", () => {
  if (latitudeInput.value && longitudeInput?.value) {
    updateMapPoint(latitudeInput.value, longitudeInput.value, "Koordinat manual berhasil diperbarui.");
  }
});

longitudeInput?.addEventListener("input", () => {
  if (longitudeInput.value && latitudeInput?.value) {
    updateMapPoint(latitudeInput.value, longitudeInput.value, "Koordinat manual berhasil diperbarui.");
  }
});

[startTimeInput, endTimeInput].forEach((field) => {
  field?.addEventListener("input", () => {
    field.value = field.value.replace(/[^\d:]/g, "").slice(0, 5);
    validateTimeFields();
  });

  field?.addEventListener("blur", () => {
    normalizeTimeValue(field);
    validateTimeFields();
  });
});

form?.addEventListener(
  "invalid",
  (event) => {
    event.preventDefault();

    if (invalidToastQueued) {
      return;
    }

    invalidToastQueued = true;
    const invalidField = event.target;
    const name = fieldName(invalidField);
    const message = invalidField.validity.valueMissing
      ? `${name} wajib diisi.`
      : `${name}: ${invalidField.validationMessage}`;
    showToast(message);
    invalidField.focus();

    window.setTimeout(() => {
      invalidToastQueued = false;
    }, 180);
  },
  true,
);

form?.addEventListener("submit", (event) => {
  validateInstitution();
  validateTimeFields();

  if (!form.checkValidity()) {
    event.preventDefault();
    const invalidField = form.querySelector(":invalid");
    const name = fieldName(invalidField);
    const message = invalidField?.validity.valueMissing
      ? `${name} wajib diisi.`
      : `${name}: ${invalidField?.validationMessage || "Wajib diisi dengan benar."}`;
    showToast(message);
    invalidField?.focus();
    return;
  }

  showToast("Pengajuan valid. Mengirim data...", "success");
  document.querySelector("#loader")?.classList.remove("is-hidden");
});

copyCodeButton?.addEventListener("click", async () => {
  const code = copyCodeButton.dataset.copyCode || "";

  if (!code) {
    showToast("Kode pengajuan tidak ditemukan.");
    return;
  }

  try {
    await copyText(code);
    copyCodeButton.textContent = "Kode Tersalin";
    showToast("Kode pengajuan berhasil disalin.", "success");

    window.setTimeout(() => {
      copyCodeButton.textContent = "Salin Kode";
    }, 2200);
  } catch {
    showToast("Kode belum bisa disalin otomatis. Silakan salin manual.");
  }
});

updateMapQuery("Jakarta", "Peta awal berada di area Jakarta.");
