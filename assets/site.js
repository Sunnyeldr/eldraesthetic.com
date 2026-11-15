"use strict";

(() => {
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-trigger");
  const mobileNav = document.querySelector("#mobile-nav");
  const searchButton = document.querySelector(".search-trigger");
  const searchDialog = document.querySelector("#search-modal");
  const searchInput = document.querySelector("#site-search");
  const searchResults = document.querySelector("#search-results");
  const filters = [...document.querySelectorAll(".filter-btn")];
  const releases = [...document.querySelectorAll(".release-card")];
  const motionButton = document.querySelector(".motion-toggle");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const inertState = new Map();

  // Search uses the same titles and destinations as the visible catalogue.
  const searchIndex = [
    ...[...document.querySelectorAll(".artist-card")].map((card) => ({
      name: card.querySelector("h3").innerText.replace(/\s+/g, " ").trim(),
      group: "Artist profile",
      href: card.getAttribute("href") || card.querySelector(".artist-card-actions a")?.getAttribute("href"),
    })),
    ...releases.map((card) => ({
      name: card.querySelector("h3").textContent,
      group: `Music · ${card.querySelector(".release-type").textContent}`,
      href: `#${card.id}`,
    })),
    { name: "Visual Worlds", group: "Videos", href: "#visuals" },
    { name: "Merchandise", group: "Official collection", href: "merch.html" },
  ];

  // Mobile navigation acts as a keyboard-contained overlay, with background inert.
  function closeMenu({ restoreFocus = true } = {}) {
    if (mobileNav.hidden) return;
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
    mobileNav.hidden = false;
    menuButton.setAttribute("aria-expanded", "true");
    menuButton.setAttribute("aria-label", "Close menu");
    document.body.classList.add("menu-open");
    const background = document.querySelectorAll(
      "main, footer, .brand, .desktop-nav, .search-trigger, .header-cta, .motion-toggle",
    );
    background.forEach((element) => {
      inertState.set(element, element.inert);
      element.inert = true;
    });
    mobileNav.querySelector("a").focus();
  }

  menuButton.addEventListener("click", () => {
    if (mobileNav.hidden) openMenu();
    else closeMenu();
  });

  document.addEventListener(
    "keydown",
    (event) => {
      if (mobileNav.hidden) return;
      const links = [...mobileNav.querySelectorAll("a")];
      const focusable = [menuButton, ...links];
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
      } else if (event.key === "Tab") {
        const index = focusable.indexOf(document.activeElement);
        if (event.shiftKey && index <= 0) {
          event.preventDefault();
          focusable.at(-1).focus();
        } else if (
          !event.shiftKey &&
          (index === focusable.length - 1 || index < 0)
        ) {
          event.preventDefault();
          menuButton.focus();
        }
      } else if (links.includes(document.activeElement)) {
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
      }
    },
    true,
  );

  window.addEventListener("resize", () => {
    if (window.innerWidth <= 980 || mobileNav.hidden) return;
    const hadMenuFocus =
      mobileNav.contains(document.activeElement) ||
      document.activeElement === menuButton;
    closeMenu({ restoreFocus: false });
    if (hadMenuFocus) document.querySelector(".brand").focus();
  });

  function setFilter(category) {
    filters.forEach((button) => {
      const selected = button.dataset.filter === category;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    releases.forEach((card) => {
      card.hidden = category !== "all" && card.dataset.category !== category;
    });
    const count = releases.filter((card) => !card.hidden).length;
    document.querySelector("#release-status").textContent =
      `${count} releases shown.`;
  }
  filters.forEach((button) =>
    button.addEventListener("click", () => setFilter(button.dataset.filter)),
  );

  function revealDestination(href) {
    const target = document.getElementById(href.slice(1));
    if (!target) return null;
    if (target.classList.contains("release-card") && target.hidden)
      setFilter("all");
    target.classList.add("in-view");
    return target;
  }

  function navigateTo(href) {
    // Destinations on another page (e.g. the merch overview) use normal navigation.
    if (!href.startsWith("#")) {
      window.location.assign(href);
      return;
    }
    const target = revealDestination(href);
    if (!target) return;
    if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
    if (location.hash !== href) history.pushState(null, "", href);
    target.focus({ preventScroll: true });
    target.scrollIntoView({ block: "start" });
  }

  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      closeMenu({ restoreFocus: false });
      navigateTo(link.getAttribute("href"));
    });
  });

  // Native dialog supplies modality; Escape is captured before search-input clearing.
  function showSearchResults(query = "") {
    const normalize = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();
    const q = normalize(query.trim());
    const matched = searchIndex.filter(
      (item) => !q || normalize(`${item.name} ${item.group}`).includes(q),
    );
    searchResults.replaceChildren();
    if (!matched.length) {
      const empty = document.createElement("p");
      empty.className = "search-empty";
      empty.textContent = "No matches. Try an artist name or song title.";
      searchResults.append(empty);
      return;
    }
    matched.forEach((item) => {
      const link = document.createElement("a");
      link.href = item.href;
      link.className = "search-result";
      const label = document.createElement("span");
      const group = document.createElement("small");
      label.textContent = item.name;
      group.textContent = item.group;
      const icon = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg",
      );
      icon.setAttribute("viewBox", "0 0 24 24");
      icon.setAttribute("class", "icon");
      icon.setAttribute("aria-hidden", "true");
      icon.setAttribute("focusable", "false");
      const path = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path",
      );
      path.setAttribute("d", "M6 18 18 6M6 6h12v12");
      icon.append(path);
      link.append(label, group, icon);
      link.addEventListener("click", (event) => {
        event.preventDefault();
        searchDialog.close();
        // Wait for native dialog focus restoration before focusing the destination.
        if (!item.href.startsWith("#")) {
          window.location.assign(item.href);
          return;
        }
        requestAnimationFrame(() => navigateTo(item.href));
      });
      searchResults.append(link);
    });
  }

  searchButton.addEventListener("click", () => {
    closeMenu({ restoreFocus: false });
    searchInput.value = "";
    showSearchResults();
    searchDialog.showModal();
    searchInput.focus();
  });
  document
    .querySelector(".search-close")
    .addEventListener("click", () => searchDialog.close());
  searchInput.addEventListener("input", () =>
    showSearchResults(searchInput.value),
  );
  searchDialog.addEventListener(
    "keydown",
    (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        searchDialog.close();
      } else if (
        event.key === "Enter" &&
        event.target === searchInput &&
        !event.isComposing
      ) {
        event.preventDefault();
        searchResults.querySelector("a")?.click();
      }
    },
    true,
  );
  searchDialog.addEventListener("click", (event) => {
    const rect = searchDialog.getBoundingClientRect();
    if (
      event.target === searchDialog &&
      (event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom)
    ) {
      searchDialog.close();
    }
  });

  // Motion preference is optional local state, never a backend integration.
  let userPaused = false;
  try {
    userPaused = localStorage.getItem("eldr-motion-paused") === "true";
  } catch {
    /* Storage may be blocked. */
  }
  function syncMotion() {
    const paused = userPaused || reducedMotion.matches;
    document.documentElement.classList.toggle("motion-paused", paused);
    motionButton.setAttribute("aria-pressed", String(paused));
    motionButton.setAttribute("aria-disabled", String(reducedMotion.matches));
    motionButton.textContent = reducedMotion.matches
      ? "Motion reduced"
      : paused
        ? "Resume motion"
        : "Pause motion";
  }
  motionButton.hidden = false;
  motionButton.addEventListener("click", () => {
    if (reducedMotion.matches) {
      document.querySelector("#motion-status").textContent =
        "Motion is reduced according to your device preference.";
      return;
    }
    userPaused = !userPaused;
    try {
      localStorage.setItem("eldr-motion-paused", String(userPaused));
    } catch {
      /* In-session preference still works. */
    }
    syncMotion();
  });
  reducedMotion.addEventListener("change", syncMotion);
  syncMotion();
  document.addEventListener("visibilitychange", () => {
    document.documentElement.classList.toggle("motion-idle", document.hidden);
  });

  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in-view");
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px 40px 0px" },
    );
    document
      .querySelectorAll(".reveal")
      .forEach((element) => observer.observe(element));
    document.documentElement.classList.add("motion-ready");
  }

  function syncHeader() {
    header.classList.toggle("scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", syncHeader, { passive: true });
  syncHeader();
  window.addEventListener("hashchange", () => revealDestination(location.hash));
  window.addEventListener("popstate", () => revealDestination(location.hash));
  if (location.hash) {
    revealDestination(location.hash);
    requestAnimationFrame(() => navigateTo(location.hash));
  }
  document.querySelector("#year").textContent = String(
    new Date().getFullYear(),
  );
})();
