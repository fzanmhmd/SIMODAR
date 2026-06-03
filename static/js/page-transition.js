const pageLoader = document.querySelector("#loader");

function hidePageLoader() {
  window.setTimeout(() => {
    pageLoader?.classList.add("is-hidden");
  }, 650);
}

function showPageLoader() {
  pageLoader?.classList.remove("is-hidden");
}

window.addEventListener("load", hidePageLoader);

document.addEventListener("click", (event) => {
  const link = event.target.closest("a[href]");

  if (!link) {
    return;
  }

  const url = new URL(link.href, window.location.href);
  const isInternal = url.origin === window.location.origin;
  const isSamePageHash = url.pathname === window.location.pathname && url.hash;

  if (isInternal && !isSamePageHash && link.target !== "_blank") {
    showPageLoader();
  }
});
