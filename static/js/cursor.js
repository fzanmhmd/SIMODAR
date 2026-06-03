(() => {
  const finePointer = window.matchMedia("(pointer: fine)");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!finePointer.matches || reducedMotion.matches) {
    return;
  }

  const ring = document.createElement("span");
  ring.className = "simodar-cursor-ring";
  document.body.append(ring);
  document.body.classList.add("cursor-ready", "cursor-idle");

  let pointerX = window.innerWidth / 2;
  let pointerY = window.innerHeight / 2;
  let ringX = pointerX;
  let ringY = pointerY;

  const updateCursorState = (target) => {
    const interactive = target.closest("a, button, summary, label, select, [role='button'], .table-action, .admin-workflow-card");
    const textInput = target.closest("input, textarea, [contenteditable='true']");
    document.body.classList.toggle("cursor-hover", Boolean(interactive));
    document.body.classList.toggle("cursor-text", Boolean(textInput));
  };

  window.addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") {
      return;
    }

    pointerX = event.clientX;
    pointerY = event.clientY;
    document.body.classList.remove("cursor-idle");
    updateCursorState(event.target);
  });

  window.addEventListener("pointerdown", () => {
    document.body.classList.add("cursor-clicking");
  });

  window.addEventListener("pointerup", () => {
    document.body.classList.remove("cursor-clicking");
  });

  window.addEventListener("pointerleave", () => {
    document.body.classList.add("cursor-idle");
  });

  const animateRing = () => {
    ringX += (pointerX - ringX) * 0.18;
    ringY += (pointerY - ringY) * 0.18;
    ring.style.left = `${ringX}px`;
    ring.style.top = `${ringY}px`;
    window.requestAnimationFrame(animateRing);
  };

  animateRing();
})();
