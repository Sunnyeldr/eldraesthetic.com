// ELDR ÆSTHETIC — shared catalogue helpers for the homepage and the artist pages. Reads the existing live feeds; it does not change them.
export const SPOTIFY_WORKER = "https://eldr-aesthetic-music.sash-kelch.workers.dev/";
export const YOUTUBE_FEED = "https://eldr-youtube-live.sash-kelch.workers.dev/latest";

export const ARTISTS = {
  "26RwT7kIoTnT8oT65MGS2P": { key: "sunny", name: "Sunny ELDR", rune: "ᚱ", page: "sunny-eldr.html", image: "assets/sunny-hero-v2.webp", layout: "wide" },
  "0EZ3VnaZOkGWYyYMxYdJzZ": { key: "sunriva", name: "SUNRIVA", rune: "ᛚ", page: "sunriva.html", image: "assets/sunriva-hero-new.webp", layout: "wide" },
  "0Um7pcFDku2VNShSlfxy1B": { key: "rynva", name: "RYNVA", rune: "ᚢ", page: "rynva.html", image: "assets/rynva-artist-closeup.webp", layout: "portrait" },
  "0kLRThHL6uSbmGwEarlsKy": { key: "jara", name: "JARA NOX", rune: "ᚲ", page: "jara-nox.html", image: "assets/jara-nox-artist.webp", layout: "portrait" },
};

export const $ = (selector, root = document) => root.querySelector(selector);
export const el = (tag, className, text) => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};
export const formatDate = (iso) => {
  const date = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
};
export const typeLabel = (release) => (release.type === "album" ? (release.totalTracks <= 7 ? "EP" : "Album") : "Single");

export function cleanRelease(release, ownerId) {
  if (!release || typeof release.id !== "string" || typeof release.name !== "string") return null;
  if (typeof release.spotifyUrl !== "string" || !release.spotifyUrl.startsWith("https://open.spotify.com/")) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(release.releaseDate || "")) return null;
  const ids = Array.isArray(release.artists) ? release.artists.map((artist) => artist.id).filter((id) => ARTISTS[id]) : [];
  if (!ids.includes(ownerId)) ids.unshift(ownerId);
  return {
    id: release.id,
    name: release.name,
    type: release.type === "album" ? "album" : "single",
    totalTracks: Number(release.totalTracks) || 1,
    date: release.releaseDate,
    url: release.spotifyUrl,
    cover: typeof release.imageUrl === "string" && release.imageUrl.startsWith("https://i.scdn.co/image/") ? release.imageUrl : null,
    artistIds: [...new Set(ids)],
  };
}

export async function loadCatalogue(ids = Object.keys(ARTISTS)) {
  const results = await Promise.allSettled(
    ids.map(async (id) => {
      const url = new URL(SPOTIFY_WORKER);
      url.searchParams.set("artist", id);
      const response = await fetch(url, { headers: { Accept: "application/json" } });
      if (!response.ok) throw new Error("catalogue_unavailable");
      const data = await response.json();
      if (data?.success !== true || data.artistId !== id || !Array.isArray(data.releases)) throw new Error("catalogue_invalid");
      return data.releases.map((release) => cleanRelease(release, id)).filter(Boolean);
    }),
  );
  const byId = new Map();
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    for (const release of result.value) {
      const known = byId.get(release.id);
      if (known) known.artistIds = [...new Set([...known.artistIds, ...release.artistIds])];
      else byId.set(release.id, release);
    }
  }
  return [...byId.values()].sort((a, b) => b.date.localeCompare(a.date) || a.name.localeCompare(b.name));
}


export async function loadVideos(limit = 3) {
  const response = await fetch(YOUTUBE_FEED, { cache: "no-store" });
  if (!response.ok) throw new Error("youtube_feed_unavailable");
  const data = await response.json();
  if (data?.success !== true || !Array.isArray(data.videos)) throw new Error("youtube_feed_invalid");
  return data.videos
    .filter(
      (video) =>
        video &&
        typeof video.title === "string" &&
        video.title.trim() &&
        /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,}$/.test(video.url || "") &&
        typeof video.thumbnail === "string" &&
        video.thumbnail.startsWith("https://i.ytimg.com/vi/"),
    )
    .slice(0, limit);
}

// YouTube titles carry promotion text and emoji; the card shows the part before the first "|".
export function cleanVideoTitle(title) {
  const head = title.split("|")[0].replace(/\(official[^)]*\)/gi, "");
  return head.replace(/[\p{Extended_Pictographic}\uFE0F\u200D]/gu, "").replace(/\s+/g, " ").trim() || title.trim();
}

export function videoCard(video, lead) {
  const card = el("a", lead ? "video video-lead" : "video");
  card.href = video.url;
  card.target = "_blank";
  card.rel = "noopener noreferrer";
  const image = el("img");
  const id = new URL(video.url).searchParams.get("v");
  // Prefer the 720p thumbnail; older uploads only have the small one.
  image.addEventListener("error", () => { if (image.src !== video.thumbnail) image.src = video.thumbnail; }, { once: true });
  image.src = `https://i.ytimg.com/vi/${id}/hq720.jpg`;
  image.alt = "";
  image.loading = "lazy";
  const text = el("span", "video-text");
  text.append(el("small", "", video.artist || "ELDR ÆSTHETIC"), el("strong", "", cleanVideoTitle(video.title)));
  card.setAttribute("aria-label", `Watch ${video.title} on YouTube`);
  card.append(image, text);
  return card;
}

export function releaseRow(release, leadId) {
  const item = el("li", "release");
  const ids = leadId && release.artistIds.includes(leadId) ? [leadId, ...release.artistIds.filter((id) => id !== leadId)] : release.artistIds;
  const artist = ARTISTS[ids[0]];
  item.dataset.artist = artist.key;
  const link = el("a");
  link.href = release.url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  const cover = el("img");
  cover.alt = "";
  cover.loading = "lazy";
  cover.width = 64;
  cover.height = 64;
  if (release.cover) cover.src = release.cover;
  const who = el("span", "release-artist");
  const rune = el("span", "rune", artist.rune);
  rune.setAttribute("aria-hidden", "true");
  who.append(rune, el("span", "", ids.map((id) => ARTISTS[id].name).join(" × ")));
  link.append(cover, el("span", "release-title", release.name), who, el("span", "release-type", typeLabel(release)), el("span", "release-date", formatDate(release.date)));
  item.append(link);
  return item;
}

// Filterable, paged release list. `filters` maps a filter name to a predicate.
export function setupList(releases, { pageSize = 8, leadId, filters = {} } = {}) {
  const list = $("[data-releases]");
  const more = $("[data-more]");
  const tests = { all: () => true, album: (release) => release.type === "album", single: (release) => release.type === "single", ...filters };
  let filter = "all";
  let shown = pageSize;
  const render = () => {
    const matching = releases.filter(tests[filter] || tests.all);
    list.replaceChildren(...matching.slice(0, shown).map((release) => releaseRow(release, leadId)));
    if (!matching.length) list.append(el("li", "releases-empty", "No releases of this type yet."));
    more.hidden = matching.length <= shown;
  };
  document.querySelectorAll("[data-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      filter = button.dataset.filter;
      shown = pageSize;
      document.querySelectorAll("[data-filter]").forEach((other) => other.setAttribute("aria-pressed", String(other === button)));
      render();
    });
  });
  more.addEventListener("click", () => {
    shown += pageSize;
    render();
  });
  render();
}

export function setupPlaylist() {
  const box = $("[data-playlist]");
  const button = $("[data-playlist-load]");
  if (!box || !button) return;
  button.addEventListener("click", () => {
    const frame = el("iframe");
    frame.src = `https://open.spotify.com/embed/playlist/${box.dataset.playlist}`;
    frame.title = "Playlist on Spotify";
    frame.loading = "lazy";
    frame.allow = "encrypted-media";
    $("[data-playlist-frame]").replaceChildren(frame);
    button.hidden = true;
  });
}
