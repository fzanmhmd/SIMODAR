const pageLoader = document.querySelector("#loader");
const firstVisitLoaderDuration = 1500;
const normalLoaderDuration = 800;
const loaderSeenKey = "simodar-loader-seen";
let pageLoaderTimer;
let pageLoaderHideTimer;

function hasSeenLoader() {
  try {
    if (window.sessionStorage?.getItem(loaderSeenKey) === "1") {
      return true;
    }
  } catch (error) {
    // Ignore storage restrictions and fall back to window.name.
  }

  return window.name.includes(`${loaderSeenKey}=1`);
}

function markLoaderSeen() {
  try {
    window.sessionStorage?.setItem(loaderSeenKey, "1");
  } catch (error) {
    // Ignore storage restrictions and fall back to window.name.
  }

  if (!window.name.includes(`${loaderSeenKey}=1`)) {
    window.name = [window.name, `${loaderSeenKey}=1`].filter(Boolean).join("|");
  }
}

function lockPageScroll() {
  document.documentElement.classList.add("simodar-page-loading");
  document.body?.classList.add("simodar-page-loading");
}

function unlockPageScroll() {
  document.documentElement.classList.remove("simodar-page-loading");
  document.body?.classList.remove("simodar-page-loading");
}

function playLoaderAnimation() {
  const logo = pageLoader?.querySelector(".loader__logo");

  if (!pageLoader || !logo) {
    return;
  }

  window.clearTimeout(pageLoaderHideTimer);
  lockPageScroll();
  pageLoader.classList.remove("is-hidden", "is-animating");
  void logo.offsetWidth;
  pageLoader.classList.add("is-animating");
}

function hidePageLoader() {
  window.clearTimeout(pageLoaderTimer);
  window.clearTimeout(pageLoaderHideTimer);
  const loaderDuration = hasSeenLoader() ? normalLoaderDuration : firstVisitLoaderDuration;

  pageLoaderHideTimer = window.setTimeout(() => {
    if (!pageLoader) {
      return;
    }

    pageLoader.classList.add("is-hidden");
    pageLoader.classList.remove("is-animating");
    markLoaderSeen();
    unlockPageScroll();
  }, loaderDuration);
}

function showPageLoader() {
  if (!pageLoader) {
    return;
  }

  window.clearTimeout(pageLoaderTimer);
  pageLoaderTimer = window.setTimeout(() => {
    playLoaderAnimation();
  }, 90);
}

playLoaderAnimation();
window.addEventListener("load", hidePageLoader);
window.addEventListener("pageshow", hidePageLoader);

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");

  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
    return;
  }

  const url = new URL(link.href, window.location.href);
  const isInternal = url.origin === window.location.origin;
  const isSamePageHash = url.pathname === window.location.pathname && url.hash;
  const isFileDownload = link.hasAttribute("download");

  if (isInternal && !isSamePageHash && !isFileDownload && link.target !== "_blank") {
    showPageLoader();
  }
});

document.addEventListener("submit", (event) => {
  const form = event.target.closest("form");

  if (form && form.target !== "_blank") {
    window.setTimeout(() => {
      if (!event.defaultPrevented && form.checkValidity()) {
        showPageLoader();
      }
    }, 0);
  }
});
