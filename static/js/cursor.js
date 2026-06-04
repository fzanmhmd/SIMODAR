(() => {
  const finePointer = window.matchMedia("(pointer: fine)");

  const applyCursor = () => {
    document.querySelectorAll(".simodar-cursor-dot, .simodar-cursor-ring").forEach((element) => {
      element.remove();
    });

    document.body.classList.toggle("simodar-cursor-ready", finePointer.matches);
    document.body.classList.remove("cursor-ready", "cursor-hover", "cursor-clicking", "cursor-idle", "cursor-text");
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", applyCursor, { once: true });
  } else {
    applyCursor();
  }

  finePointer.addEventListener?.("change", applyCursor);
})();
