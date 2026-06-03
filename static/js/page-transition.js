const pageLoader = document.querySelector("#loader");
let pageLoaderTimer;

function hidePageLoader() {
  window.clearTimeout(pageLoaderTimer);
  window.setTimeout(() => {
    pageLoader?.classList.add("is-hidden");
  }, 850);
}

function showPageLoader() {
  if (!pageLoader) {
    return;
  }

  window.clearTimeout(pageLoaderTimer);
  pageLoaderTimer = window.setTimeout(() => {
    pageLoader.classList.remove("is-hidden");
  }, 160);
}

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
