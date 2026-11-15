import {
  ARTISTS,
  FRESH_MS,
  MAX_STALE_MS,
  normalizeRelease,
  deduplicateReleases,
} from "./spotify-model.mjs";

// The browser only receives public, validated metadata. Credentials stay in the Worker.
const roots = [...document.querySelectorAll("[data-spotify-catalog]")].filter(
  (root) => Object.hasOwn(ARTISTS, root.dataset.spotifyCatalog),
);
const element = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
// Visitor clocks are often a little off; tolerate small skew instead of hiding a valid catalogue.
const CLOCK_SKEW_MS = 5 * 60 * 1000;
const timestamp = (value) =>
  typeof value === "string" &&
  Number.isFinite(Date.parse(value)) &&
  Date.parse(value) <= Date.now() + CLOCK_SKEW_MS &&
  Date.now() - Date.parse(value) <= MAX_STALE_MS;
const directLink = (text, href) => {
  const link = element("a", "", text);
  link.href = href;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  return link;
};
function displayDate(value, precision) {
  const date = new Date(
    `${value}${precision === "year" ? "-01-01" : precision === "month" ? "-01" : ""}T12:00:00Z`,
  );
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    ...(precision !== "year" && { month: "short" }),
    ...(precision === "day" && { day: "numeric" }),
    timeZone: "UTC",
  });
}

function render(root, catalog) {
  const artistId = root.dataset.spotifyCatalog;
  if (
    catalog?.success !== true ||
    catalog.artistId !== artistId ||
    !Array.isArray(catalog.releases) ||
    !timestamp(catalog.updatedAt)
  )
    return false;
  const releases = deduplicateReleases(
    catalog.releases
      .map((item) => normalizeRelease(item, artistId))
      .filter(Boolean),
  );
  const signature = JSON.stringify([
    releases,
    catalog.updatedAt,
    catalog.stale,
    catalog.stats,
  ]);
  if (root.dataset.signature === signature) return true;
  const focusedHref = root.contains(document.activeElement)
    ? document.activeElement.closest("a")?.href
    : null;
  const heading = element("div", "spotify-catalog-heading");
  heading.append(
    element("span", "profile-micro", "SPOTIFY / RELEASE CATALOG"),
    element("h3", "spotify-catalog-title", "The complete sound."),
  );
  heading.append(
    element(
      "p",
      "spotify-catalog-description",
      "Released music from Spotify, with DE/US availability checks. Albums and EPs are shown separately from singles, newest first.",
    ),
  );
  const children = [heading];
  for (const [title, types] of [
    ["Albums & EPs", ["album", "ep"]],
    ["Singles", ["single"]],
  ]) {
    const items = releases.filter((item) => types.includes(item.type));
    if (!items.length) continue;
    const section = element("section", "spotify-catalog-group");
    const groupTitle = element("h4", "spotify-catalog-group-title", title);
    const grid = element("div", "spotify-catalog-grid");
    for (const item of items) {
      const card = element("article", "spotify-catalog-card");
      const coverLink = directLink("", item.spotifyUrl);
      coverLink.className = "spotify-catalog-cover";
      coverLink.setAttribute(
        "aria-label",
        `Open ${item.name} on Spotify (new tab)`,
      );
      const image = element("img");
      Object.assign(image, {
        src: item.imageUrl,
        alt: `Spotify cover for ${item.name}`,
        loading: "lazy",
        decoding: "async",
        referrerPolicy: "no-referrer",
        width: 640,
        height: 640,
      });
      image.addEventListener(
        "error",
        () => {
          card.remove();
          if (!grid.children.length) section.remove();
          if (
            !root.querySelector(".spotify-catalog-card") &&
            !root.querySelector(".spotify-catalog-image-error")
          ) {
            const message = element(
              "p",
              "spotify-catalog-description spotify-catalog-image-error",
              "Release artwork is temporarily unavailable. ",
            );
            message.append(
              directLink(
                "Open the artist on Spotify",
                `https://open.spotify.com/artist/${artistId}`,
              ),
            );
            root.append(message);
          }
        },
        { once: true },
      );
      coverLink.append(image);
      const info = element("div", "spotify-catalog-info");
      const name = element("h5");
      name.append(directLink(item.name, item.spotifyUrl));
      const meta = element("p", "spotify-catalog-meta");
      const date = element(
        "time",
        "",
        displayDate(item.releaseDate, item.releaseDatePrecision),
      );
      date.dateTime = item.releaseDate;
      meta.append(`${item.type.toUpperCase()} · `, date);
      const credits = element("p", "spotify-catalog-credits");
      item.artists.forEach((artist, index) => {
        if (index) credits.append(" · ");
        credits.append(directLink(artist.name, artist.spotifyUrl));
      });
      info.append(
        name,
        meta,
        credits,
        directLink("Open on Spotify", item.spotifyUrl),
      );
      card.append(coverLink, info);
      grid.append(card);
    }
    section.append(groupTitle, grid);
    children.push(section);
  }
  if (!releases.length)
    children.push(
      element(
        "p",
        "spotify-catalog-description",
        "No published releases with verified artwork were available for this artist at the last successful check.",
      ),
    );
  const followers = catalog.stats?.spotifyFollowers;
  if (
    Number.isSafeInteger(followers?.value) &&
    followers.value >= 0 &&
    timestamp(followers.updatedAt)
  ) {
    const stat = element("p", "spotify-catalog-stat");
    stat.append(
      directLink(
        `${followers.value.toLocaleString("en-GB")} Spotify followers`,
        `https://open.spotify.com/artist/${artistId}`,
      ),
    );
    const time = element(
      "time",
      "",
      new Date(followers.updatedAt).toLocaleString("en-GB"),
    );
    time.dateTime = followers.updatedAt;
    stat.append(" · Last verified: ", time);
    children.push(stat);
  }
  const footer = element("p", "spotify-catalog-disclaimer");
  const time = element(
    "time",
    "",
    new Date(catalog.updatedAt).toLocaleString("en-GB"),
  );
  time.dateTime = catalog.updatedAt;
  footer.append(
    catalog.stale
      ? "Showing the last verified catalogue while Spotify is unavailable. Last successful check: "
      : "Artwork and metadata: Spotify. Last successful check: ",
    time,
    ". Updates are checked approximately every 15 minutes when synchronization is active.",
  );
  children.push(footer);
  root.replaceChildren(...children);
  root.hidden = false;
  root.dataset.signature = signature;
  if (focusedHref) {
    const target =
      [...root.querySelectorAll("a")].find(
        (link) => link.href === focusedHref,
      ) || heading;
    if (target === heading) target.tabIndex = -1;
    target.focus({ preventScroll: true });
  }
  // Resolve curated selections only when a verified matching release exists.
  document.querySelectorAll("a[data-spotify-release]").forEach((link) => {
    if (link.dataset.spotifyArtist !== artistId) return;
    const normalizeTitle = (value) =>
      value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase();
    const release = releases.find(
      (item) =>
        normalizeTitle(item.name) ===
        normalizeTitle(link.dataset.spotifyRelease),
    );
    if (!release) return;
    link.href = release.spotifyUrl;
    if (link.hasAttribute("aria-label"))
      link.setAttribute(
        "aria-label",
        `Open ${release.name} on Spotify (new tab)`,
      );
    for (const text of [...link.childNodes].filter(
      (node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim(),
    )) {
      if (/artist on spotify|open artist/i.test(text.textContent))
        text.textContent = "Open release on Spotify ";
    }
    const label = link.querySelector("small");
    if (label)
      label.textContent = label.textContent.replace(
        "SPOTIFY ARTIST",
        "SPOTIFY RELEASE",
      );
  });
  return true;
}

async function fetchJson(url, timeout = 10000) {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok) {
    const error = new Error("Catalogue unavailable");
    const retry = Number(response.headers.get("Retry-After"));
    error.retryMs =
      Number.isFinite(retry) && retry > 0 ? retry * 1000 : FRESH_MS;
    throw error;
  }
  return response.json();
}

async function start() {
  if (!roots.length) return;
  const lastGood = new Map();
  try {
    const feed = await fetchJson("data/spotify-releases.json");
    if (feed?.schemaVersion === 1)
      for (const root of roots) {
        const artistId = root.dataset.spotifyCatalog;
        const item = feed.artists?.[artistId];
        if (render(root, { ...item, stale: true }))
          lastGood.set(artistId, item);
      }
  } catch {
    /* Curated cards and direct artist links remain available. */
  }
  let workerUrl;
  try {
    const config = await fetchJson("data/spotify-config.json");
    if (typeof config?.workerUrl !== "string") return;
    workerUrl = new URL(config.workerUrl);
    if (
      workerUrl.protocol !== "https:" ||
      workerUrl.username ||
      workerUrl.password ||
      workerUrl.hash
    )
      return;
  } catch {
    return;
  }
  let timer,
    running = false,
    retryAt = 0,
    nextDue = 0;
  async function update() {
    if (running || document.hidden) return;
    running = true;
    let nextDelay = FRESH_MS;
    await Promise.all(
      roots.map(async (root) => {
        const id = root.dataset.spotifyCatalog;
        try {
          const url = new URL(workerUrl);
          url.searchParams.set("artist", id);
          const catalog = await fetchJson(url.href, 28000);
          if (render(root, catalog)) {
            lastGood.set(id, catalog);
            // Align with server freshness rather than stacking two 15-minute delays.
            const delay = catalog.stale
              ? Number.isFinite(catalog.retryAfterSeconds) &&
                catalog.retryAfterSeconds > 0
                ? catalog.retryAfterSeconds * 1000
                : 30000
              : Date.parse(catalog.updatedAt) + FRESH_MS - Date.now();
            nextDelay = Math.min(nextDelay, Math.max(30000, delay));
          }
        } catch (error) {
          retryAt = Math.max(retryAt, Date.now() + (error.retryMs || FRESH_MS));
          const saved = lastGood.get(id);
          if (saved) render(root, { ...saved, stale: true });
        }
      }),
    );
    running = false;
    nextDue = Date.now() + Math.max(nextDelay, retryAt - Date.now());
    if (!document.hidden)
      timer = setTimeout(update, Math.max(0, nextDue - Date.now()));
  }
  document.addEventListener("visibilitychange", () => {
    clearTimeout(timer);
    if (!document.hidden) {
      const delay = Math.max(0, nextDue - Date.now(), retryAt - Date.now());
      timer = setTimeout(update, delay);
    }
  });
  window.addEventListener("pagehide", () => clearTimeout(timer));
  await update();
}
start().catch(() => {
  /* An enhancement cannot break the artist page. */
});


const labelRoot = document.querySelector("[data-label-spotify-feed]");
const labelArtistIds = Object.keys(ARTISTS);
const labelMaxReleases = 8;

function labelType(item) {
  return item.type === "single" ? "single" : "album";
}

function labelDisplayDate(item) {
  return displayDate(item.releaseDate, item.releaseDatePrecision);
}


function updateFeaturedRelease(item) {
  const root = document.querySelector("[data-featured-release]");
  if (!root || !item) return;

  const artistNames = item.artists.map((artist) => artist.name).join(" × ");
  const type = item.type === "ep" ? "EP" : item.type.toUpperCase();
  const date = labelDisplayDate(item);

  const image = root.querySelector("[data-featured-image]");
  const label = root.querySelector("[data-featured-label]");
  const overline = root.querySelector("[data-featured-overline]");
  const title = root.querySelector("[data-featured-title]");
  const artist = root.querySelector("[data-featured-artist]");
  const name = root.querySelector("[data-featured-name]");
  const copy = root.querySelector("[data-featured-copy]");
  const link = root.querySelector("[data-featured-link]");
  const fineprint = root.querySelector("[data-featured-fineprint]");

  if (image) {
    image.src = item.imageUrl;
    image.alt = `Spotify cover for ${item.name} by ${artistNames}`;
  }
  if (label) label.textContent = `FEATURED / ${type} / ${date}`;
  if (overline) overline.textContent = `FEATURED RELEASE • ${artistNames}`;
  if (title) title.textContent = item.name;
  if (artist) artist.textContent = artistNames;
  if (name) name.textContent = item.name;
  if (copy) copy.textContent = `The newest verified ELDR ÆSTHETIC release on Spotify — ${type.toLowerCase()}, released ${date}.`;
  if (link) {
    link.href = item.spotifyUrl;
    link.textContent = "Open on Spotify";
    link.setAttribute("aria-label", `Open ${item.name} by ${artistNames} on Spotify (new tab)`);
  }
  if (fineprint) fineprint.textContent = "Automatically updated from the ELDR Spotify catalogue.";
}

function renderLabelFeed(releases, { stale = false } = {}) {
  if (!labelRoot) return;
  const grid = labelRoot.querySelector("#label-release-grid");
  const status = labelRoot.querySelector("#label-release-status");
  const buttons = [...labelRoot.querySelectorAll("[data-label-filter]")];
  if (!grid || !status) return;

  const ordered = [...releases]
    .sort((a, b) =>
      b.releaseDate.localeCompare(a.releaseDate) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
    )
    .slice(0, labelMaxReleases);

  updateFeaturedRelease(ordered[0]);

  let active = labelRoot.dataset.activeFilter || "all";
  if (!["all", "album", "single"].includes(active)) active = "all";

  const draw = () => {
    const visible = ordered.filter((item) =>
      active === "all" ? true : labelType(item) === active,
    );
    grid.replaceChildren();
    if (!visible.length) {
      const empty = element("div", "discography-empty");
      empty.append(
        element("strong", "", "No releases in this category yet."),
        element(
          "span",
          "",
          stale
            ? "Showing the last verified Spotify data."
            : "New releases will appear here automatically.",
        ),
      );
      grid.append(empty);
    } else {
      for (const item of visible) {
        const card = element("article", "release-card reveal in-view");
        card.dataset.category = labelType(item);
        card.id = `label-release-${item.id}`;

        const imageLink = directLink("", item.spotifyUrl);
        imageLink.className = "release-image";
        imageLink.setAttribute("aria-label", `Open ${item.name} on Spotify (new tab)`);
        const img = element("img");
        Object.assign(img, {
          src: item.imageUrl,
          alt: `Spotify cover for ${item.name}`,
          loading: "lazy",
          decoding: "async",
          width: 640,
          height: 640,
        });
        imageLink.append(img);

        const artistNames = item.artists.map((artist) => artist.name).join(" × ");
        const type = item.type === "ep" ? "EP" : item.type.toUpperCase();
        const meta = element(
          "p",
          "release-type",
          `${artistNames} / ${type} / ${labelDisplayDate(item)}`,
        );
        const title = element("h3", "", item.name);
        const link = directLink("Open on Spotify", item.spotifyUrl);
        link.className = "release-link";

        card.append(imageLink, meta, title, link);
        grid.append(card);
      }
    }
    buttons.forEach((button) => {
      const selected = button.dataset.labelFilter === active;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    status.textContent = `${visible.length} releases shown.`;
    grid.setAttribute("aria-busy", "false");
    labelRoot.dataset.activeFilter = active;
  };

  buttons.forEach((button) => {
    if (button.dataset.labelBound === "true") return;
    button.dataset.labelBound = "true";
    button.addEventListener("click", () => {
      active = button.dataset.labelFilter || "all";
      draw();
    });
  });
  draw();
}

async function startLabelFeed() {
  if (!labelRoot) return;
  let workerUrl;
  try {
    const config = await fetchJson("data/spotify-config.json");
    if (typeof config?.workerUrl !== "string") throw new Error("worker_missing");
    workerUrl = new URL(config.workerUrl);
    if (workerUrl.protocol !== "https:") throw new Error("worker_invalid");
  } catch {
    renderLabelFeed([]);
    return;
  }

  let running = false;
  let timer;
  let nextDue = 0;
  const lastGood = new Map();

  async function updateLabel() {
    if (running || document.hidden) return;
    running = true;
    let nextDelay = FRESH_MS;
    await Promise.all(
      labelArtistIds.map(async (artistId) => {
        try {
          const url = new URL(workerUrl);
          url.searchParams.set("artist", artistId);
          const catalog = await fetchJson(url.href, 28000);
          if (
            catalog?.success !== true ||
            catalog.artistId !== artistId ||
            !Array.isArray(catalog.releases)
          ) throw new Error("catalog_invalid");
          lastGood.set(artistId, catalog);
          const delay = catalog.stale
            ? Math.max(30000, (catalog.retryAfterSeconds || 30) * 1000)
            : Math.max(30000, Date.parse(catalog.updatedAt) + FRESH_MS - Date.now());
          nextDelay = Math.min(nextDelay, delay);
        } catch {
          /* Keep the last verified catalogue for this artist. */
        }
      }),
    );

    const merged = new Map();
    let stale = false;
    for (const [artistId, catalog] of lastGood) {
      stale ||= catalog.stale === true;
      for (const raw of catalog.releases || []) {
        const item = normalizeRelease(raw, artistId);
        if (item && !merged.has(item.id)) merged.set(item.id, item);
      }
    }
    renderLabelFeed([...merged.values()], { stale });
    running = false;
    nextDue = Date.now() + nextDelay;
    if (!document.hidden) timer = setTimeout(updateLabel, nextDelay);
  }

  document.addEventListener("visibilitychange", () => {
    clearTimeout(timer);
    if (!document.hidden) timer = setTimeout(updateLabel, Math.max(0, nextDue - Date.now()));
  });
  window.addEventListener("pagehide", () => clearTimeout(timer));
  await updateLabel();
}
startLabelFeed().catch(() => renderLabelFeed([]));
