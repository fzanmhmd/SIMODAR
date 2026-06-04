const monthFilter = document.querySelector("#bulanAdmin");
const searchInput = document.querySelector("#adminSearchInput");
const menuToggle = document.querySelector(".admin-menu-toggle");
const adminSidebar = document.querySelector("#adminSidebar");
const liveClocks = Array.from(document.querySelectorAll("[data-live-clock]"));
const adminToast = document.querySelector("#adminToast");
const adminActionBackdrop = document.querySelector("#adminActionBackdrop");
const adminConfirm = document.querySelector("#adminConfirm");
const adminConfirmText = adminConfirm?.querySelector("[data-confirm-text]");
const searchableAreas = Array.from(document.querySelectorAll("[data-admin-search-area], .admin-panel"));
let adminToastTimer;
let pendingConfirmForm;
let activeRejectContext;
let activeFloatingEditor;

const showAdminToast = (message) => {
  if (!adminToast || !message) return;

  window.clearTimeout(adminToastTimer);
  adminToast.textContent = message;
  adminToast.classList.remove("is-visible");
  window.requestAnimationFrame(() => {
    adminToast.classList.add("is-visible");
  });
};

const hasActiveActionPanel = () =>
  Boolean(activeRejectContext) ||
  Boolean(activeFloatingEditor) ||
  Boolean(document.querySelector(".inline-editor[open], .cancel-note-box[open], .approval-reject-form.is-floating:not([hidden])"));

const syncActionBackdrop = () => {
  const shouldShow = hasActiveActionPanel();
  adminActionBackdrop?.toggleAttribute("hidden", !shouldShow);
  document.body.classList.toggle("admin-action-open", shouldShow);
};

const closeRejectPopover = () => {
  if (!activeRejectContext) return;

  const { form, row } = activeRejectContext;
  form.hidden = true;
  form.classList.remove("is-floating", "is-measuring", "is-positioned", "is-below");
  form.style.removeProperty("--reject-top");
  form.style.removeProperty("--reject-left");
  form.style.removeProperty("--reject-arrow-left");
  row?.classList.remove("approval-row--rejecting");
  activeRejectContext = undefined;
  syncActionBackdrop();
};

const openRejectPopover = (toggleButton) => {
  const actionCell = toggleButton.closest(".approval-actions");
  const form = actionCell?.querySelector(".approval-reject-form");
  const row = toggleButton.closest("tr");
  if (!form || !row) return;

  const isSameFormOpen = activeRejectContext?.form === form && !form.hidden;
  closeFloatingEditors();
  closeRejectPopover();

  if (isSameFormOpen) {
    return;
  }

  const targetCell = row.cells?.[3] || row;
  const instansiText = row.cells?.[2]?.textContent?.trim();
  const lokasiText = targetCell?.textContent?.trim();
  const targetText = [instansiText, lokasiText].filter(Boolean).join(" - ");
  const targetLabel = form.querySelector("[data-reject-target]");
  if (targetLabel && targetText) {
    targetLabel.textContent = `Sedang eksekusi data: ${targetText}`;
  }

  row.classList.add("approval-row--rejecting");
  form.hidden = false;
  form.classList.add("is-floating", "is-positioned");
  activeRejectContext = { form, row, targetCell, toggleButton };
  syncActionBackdrop();
};

const clearFloatingEditorStyles = (editor) => {
  editor.classList.remove("is-floating-panel", "is-measuring", "is-positioned", "is-below");
  editor.style.removeProperty("--panel-top");
  editor.style.removeProperty("--panel-left");
  editor.style.removeProperty("--panel-arrow-left");
  editor.querySelector(":scope > summary")?.removeAttribute("data-execution-label");
};

const closeFloatingEditors = (exceptEditor) => {
  document.querySelectorAll(".inline-editor[open], .cancel-note-box[open]").forEach((editor) => {
    if (editor === exceptEditor) return;
    editor.removeAttribute("open");
    clearFloatingEditorStyles(editor);
    editor.closest("tr")?.classList.remove("admin-row--editing");
  });

  if (activeFloatingEditor && activeFloatingEditor.editor !== exceptEditor) {
    activeFloatingEditor = undefined;
  }
  syncActionBackdrop();
};

const syncFloatingEditor = (editor) => {
  if (!editor?.matches?.(".inline-editor, .cancel-note-box")) return;

  const row = editor.closest("tr");
  const summary = editor.querySelector(":scope > summary");

  if (!editor.open) {
    clearFloatingEditorStyles(editor);
    row?.classList.remove("admin-row--editing");
    if (activeFloatingEditor?.editor === editor) {
      activeFloatingEditor = undefined;
    }
    syncActionBackdrop();
    return;
  }

  if (activeFloatingEditor?.editor === editor && editor.classList.contains("is-positioned")) {
    syncActionBackdrop();
    return;
  }

  closeRejectPopover();
  closeFloatingEditors(editor);

  const targetCell = row?.cells?.[1] || row?.querySelector("td") || row;
  const targetText = targetCell?.textContent?.replace(/\s+/g, " ").trim();
  if (summary && targetText) {
    summary.dataset.executionLabel = `Sedang eksekusi data: ${targetText}`;
  }

  editor.classList.add("is-floating-panel", "is-positioned");
  row?.classList.add("admin-row--editing");
  activeFloatingEditor = { editor, row, targetCell };
  syncActionBackdrop();
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
  const rejectToggle = event.target.closest("[data-toggle-reject]");
  const closeRejectButton = event.target.closest("[data-close-reject]");
  const editorSummary = event.target.closest(".inline-editor > summary");
  const cancelSummary = event.target.closest(".cancel-note-box > summary");
  const closeEditorButton = event.target.closest("[data-close-editor]");
  const confirmCancel = event.target.closest("[data-confirm-cancel]");
  const confirmAccept = event.target.closest("[data-confirm-accept]");
  const actionBackdropClick = event.target.closest("#adminActionBackdrop");

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

  if (actionBackdropClick) {
    closeFloatingEditors();
    closeRejectPopover();
    return;
  }

  if (rejectToggle) {
    openRejectPopover(rejectToggle);
    return;
  }

  if (closeRejectButton) {
    closeRejectPopover();
    showAdminToast("Penolakan dibatalkan.");
    return;
  }

  if (
    activeRejectContext &&
    !event.target.closest(".approval-reject-form") &&
    !event.target.closest("[data-toggle-reject]") &&
    !event.target.closest(".admin-confirm")
  ) {
    closeRejectPopover();
  }

  if (editorSummary) {
    closeRejectPopover();
    return;
  }

  if (cancelSummary) {
    closeRejectPopover();
    return;
  }

  if (closeEditorButton) {
    const editor = closeEditorButton.closest(".inline-editor, .cancel-note-box");
    editor?.removeAttribute("open");
    closeFloatingEditors();
    return;
  }

  if (
    activeFloatingEditor &&
    (event.target === activeFloatingEditor.editor ||
      !event.target.closest(".inline-editor[open], .cancel-note-box[open], .admin-confirm"))
  ) {
    closeFloatingEditors();
  }

  if (confirmCancel) {
    pendingConfirmForm = undefined;
    adminConfirm?.setAttribute("hidden", "");
    showAdminToast("Aksi dibatalkan.");
  }

  if (confirmAccept && pendingConfirmForm) {
    const form = pendingConfirmForm;
    pendingConfirmForm = undefined;
    adminConfirm?.setAttribute("hidden", "");
    form.dataset.skipConfirm = "true";
    form.requestSubmit();
  }
});

document.addEventListener(
  "toggle",
  (event) => {
    syncFloatingEditor(event.target);
  },
  true,
);

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form");
  if (!form) return;

  const noteInput = form.querySelector("[name='keterangan']");
  if (form.hasAttribute("data-requires-note") && !noteInput?.value.trim()) {
    event.preventDefault();
    noteInput?.focus();
    showAdminToast(form.dataset.noteMessage || "Lengkapi keterangan terlebih dahulu.");
    return;
  }

  const isPostForm = (form.getAttribute("method") || "").toLowerCase() === "post";
  const confirmMessage = form.dataset.confirmMessage || (isPostForm ? "Lanjutkan dan simpan perubahan ini?" : "");

  if (confirmMessage && form.dataset.skipConfirm !== "true" && !form.hasAttribute("data-no-confirm")) {
    event.preventDefault();
    pendingConfirmForm = form;
    if (adminConfirmText) {
      adminConfirmText.textContent = confirmMessage;
    }
    adminConfirm?.removeAttribute("hidden");
    adminConfirm?.querySelector("[data-confirm-accept]")?.focus();
    return;
  }

  delete form.dataset.skipConfirm;
});

document.addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;

  document.body.classList.remove("admin-menu-open");
  menuToggle?.setAttribute("aria-expanded", "false");
  closeFloatingEditors();
  closeRejectPopover();
  pendingConfirmForm = undefined;
  adminConfirm?.setAttribute("hidden", "");
});

showAdminToast(document.body.dataset.toastMessage);

adminToast?.addEventListener("click", () => {
  adminToast.classList.remove("is-visible");
});
