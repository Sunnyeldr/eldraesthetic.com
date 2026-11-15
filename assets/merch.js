"use strict";

(() => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-trigger");
  const mobileNav = document.querySelector("#mobile-nav");
  const inertState = new Map();

  function updateHeader() {
    if (!header) return;
    header.classList.toggle("scrolled", window.scrollY > 18);
  }

  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  function closeMenu({ restoreFocus = true } = {}) {
    if (!mobileNav || !menuButton || mobileNav.hidden) return;
    mobileNav.hidden = true;
    menuButton.setAttribute("aria-expanded", "false");
    menuButton.setAttribute("aria-label", "Open menu");
    document.body.classList.remove("menu-open");
    inertState.forEach((wasInert, element) => {
      element.inert = wasInert;
    });
    inertState.clear();
    if (restoreFocus) menuButton.focus();
  }

  function openMenu() {
    if (!mobileNav || !menuButton) return;
    mobileNav.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close menu");
    document.body.classList.add("menu-open");
    document.querySelectorAll("main, footer, .brand, .desktop-nav, .header-cta").forEach(
      (element) => {
        inertState.set(element, element.inert);
        element.inert = true;
      },
    );
    mobileNav.querySelector("a")?.focus();
  }

  menuButton?.addEventListener("click", () => {
    if (mobileNav?.hidden) openMenu();
    else closeMenu();
  });

  mobileNav?.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => closeMenu({ restoreFocus: false }));
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (!mobileNav || !menuButton || mobileNav.hidden) return;
      const links = [...mobileNav.querySelectorAll("a")];
      const focusable = [menuButton, ...links];

      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key === "Tab") {
        const index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          focusable.at(-1)?.focus();
        } else if (!event.shiftKey && (index < 0 || index === focusable.length - 1)) {
          event.preventDefault();
          menuButton.focus();
        }
        return;
      }

      if (!links.includes(document.activeElement)) return;
      const index = links.indexOf(document.activeElement);
      const destinations = {
        ArrowDown: links[(index + 1) % links.length],
        ArrowUp: links[(index - 1 + links.length) % links.length],
        Home: links[0],
        End: links.at(-1),
      };
      if (destinations[event.key]) {
        event.preventDefault();
        destinations[event.key].focus();
      }
    },
    true,
  );

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 980 || !mobileNav || mobileNav.hidden) return;
    const hadMenuFocus =
      mobileNav.contains(document.activeElement) || document.activeElement === menuButton;
    closeMenu({ restoreFocus: false });
    if (hadMenuFocus) document.querySelector(".brand")?.focus();
  });

  // Each product owns an independent gallery; thumbnails swap its stage image.
  document.querySelectorAll(".merch-product").forEach((product) => {
    const stage = product.querySelector(".merch-gallery-stage");
    const mainImage = product.querySelector("[data-gallery-main]");
    const caption = product.querySelector("[data-gallery-caption]");
    const position = product.querySelector("[data-gallery-position]");
    const thumbnails = [...product.querySelectorAll(".merch-thumbnail")];
    if (!stage || !mainImage || !caption || !position) return;

    thumbnails.forEach((button) => {
      button.addEventListener("click", () => {
        const { gallerySrc, galleryAlt, galleryLabel, galleryPosition } =
          button.dataset;
        if (!gallerySrc) return;
        thumbnails.forEach((thumbnail) => {
          const selected = thumbnail === button;
          thumbnail.classList.toggle("is-active", selected);
          thumbnail.setAttribute("aria-pressed", String(selected));
        });
        mainImage.alt = galleryAlt || "Product image";
        caption.textContent = galleryLabel || "PRODUCT VIEW";
        position.textContent = galleryPosition || "";
        if (mainImage.getAttribute("src") === gallerySrc) return;
        stage.classList.add("is-changing");
        const settle = () => stage.classList.remove("is-changing");
        mainImage.addEventListener("load", settle, { once: true });
        mainImage.addEventListener("error", settle, { once: true });
        mainImage.src = gallerySrc;
      });
    });
  });

  const year = document.querySelector("#year");
  if (year) year.textContent = String(new Date().getFullYear());
})();
