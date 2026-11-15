/** Shared validation for the server feed and browser: never infer ownership from a name. */
export const ARTISTS = Object.freeze({
  "26RwT7kIoTnT8oT65MGS2P": "Sunny ELDR",
  "0EZ3VnaZOkGWYyYMxYdJzZ": "SUNRIVA",
  "0Um7pcFDku2VNShSlfxy1B": "Rynva",
  "0kLRThHL6uSbmGwEarlsKy": "JARA NOX",
});
export const ID_PATTERN = /^[A-Za-z0-9]{22}$/;
export const FRESH_MS = 15 * 60 * 1000;
export const MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

export function coverUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" &&
      url.hostname === "i.scdn.co" &&
      !url.username &&
      !url.password &&
      !url.port
      ? url.href
      : null;
  } catch {
    return null;
  }
}

// Spotify can return year/month precision. Use the end of that period rather
// than pretending to know the day, so a coarse future date is never published early.
export function publishedDate(value, precision, now = new Date()) {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(value);
  if (!match) return false;
  const [, y, m, d] = match;
  const inferred = d ? "day" : m ? "month" : "year";
  if (precision && precision !== inferred) return false;
  const year = Number(y),
    month = Number(m || 12);
  if (year < 1900 || month < 1 || month > 12) return false;
  const day = Number(d || new Date(Date.UTC(year, month, 0)).getUTCDate());
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return false;
  return date.toISOString().slice(0, 10) <= now.toISOString().slice(0, 10);
}

export function releaseType(albumType, title, artists) {
  if (!["album", "single", "ep"].includes(albumType)) return null;
  // Track count alone cannot distinguish a multi-track single from an EP.
  const shards =
    title.trim().toUpperCase() === "SHARDS" &&
    ["0EZ3VnaZOkGWYyYMxYdJzZ", "0Um7pcFDku2VNShSlfxy1B"].every((id) =>
      artists.some((artist) => artist.id === id),
    );
  if (shards) return "ep";
  if (albumType === "album") return "album";
  return albumType === "ep" || /(?:\bEP|\(EP\))$/i.test(title.trim())
    ? "ep"
    : "single";
}

export function normalizeRelease(item, artistId, now = new Date()) {
  if (
    !Object.hasOwn(ARTISTS, artistId) ||
    !ID_PATTERN.test(item?.id || "") ||
    typeof item.name !== "string" ||
    !item.name.trim()
  )
    return null;
  if (
    !Array.isArray(item.artists) ||
    !item.artists.some((artist) => artist?.id === artistId)
  )
    return null;
  const artists = item.artists
    .filter(
      (artist) =>
        ID_PATTERN.test(artist?.id || "") &&
        typeof artist.name === "string" &&
        artist.name.trim(),
    )
    .map((artist) => ({
      id: artist.id,
      name: artist.name.trim(),
      spotifyUrl: `https://open.spotify.com/artist/${artist.id}`,
    }));
  if (!artists.some((artist) => artist.id === artistId)) return null;
  const releaseDate = item.releaseDate || item.release_date;
  const precision =
    item.releaseDatePrecision ||
    item.release_date_precision ||
    (releaseDate?.length === 4
      ? "year"
      : releaseDate?.length === 7
        ? "month"
        : "day");
  if (!publishedDate(releaseDate, precision, now)) return null;
  const images = Array.isArray(item.images)
    ? [...item.images].sort((a, b) => (b?.width || 0) - (a?.width || 0))
    : [];
  const imageUrl = coverUrl(
    item.imageUrl || images.find((image) => coverUrl(image?.url))?.url,
  );
  const type = releaseType(item.album_type || item.type, item.name, artists);
  if (!imageUrl || !type) return null;
  return {
    id: item.id,
    name: item.name.trim(),
    type,
    releaseDate,
    releaseDatePrecision: precision,
    totalTracks:
      Number.isSafeInteger(item.totalTracks ?? item.total_tracks) &&
      (item.totalTracks ?? item.total_tracks) > 0
        ? (item.totalTracks ?? item.total_tracks)
        : null,
    imageUrl,
    spotifyUrl: `https://open.spotify.com/album/${item.id}`,
    artists,
  };
}

export function deduplicateReleases(items) {
  const byEdition = new Map();
  for (const item of items) {
    // Preserve deluxe/remastered titles, different dates and track counts. Only
    // collapse editions with identical title, credits, date, type and track count.
    const key = JSON.stringify([
      item.name.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(),
      item.artists.map((a) => a.id).sort(),
      item.releaseDate,
      item.type,
      item.totalTracks,
    ]);
    if (!byEdition.has(key)) byEdition.set(key, item);
  }
  return [...byEdition.values()].sort(
    (a, b) =>
      b.releaseDate.localeCompare(a.releaseDate) ||
      a.name.localeCompare(b.name) ||
      a.id.localeCompare(b.id),
  );
}
