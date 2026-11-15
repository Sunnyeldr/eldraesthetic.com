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
