import {releaseTime,updateUpcoming} from "./eldr-countdown.js?v=1";
// ELDR ÆSTHETIC — artist page: latest release, live facts, discography and videos for one artist.
import { ARTISTS, $, formatDate, typeLabel, loadCatalogue, loadVideos, videoCard, setupList, setupPlaylist } from "./eldr-core.js";

const artistId = document.body.dataset.artistId;
const artist = ARTISTS[artistId];

function showLatest(release) {
  const section = $("[data-latest-release]");
  $("[data-latest-title]").textContent = release.name;
  const parts = [typeLabel(release), formatDate(release.date)];
  if (release.totalTracks > 1) parts.push(`${release.totalTracks} tracks`);
  const others =
    Array.isArray(release.artists) && release.artists.length
      ? release.artists
          .filter((credit) => credit.id !== artistId)
          .map((credit) => credit.name)
      : release.artistIds
          .filter((id) => id !== artistId)
          .map((id) => ARTISTS[id].name);
  if (others.length) parts.push(`with ${others.join(" & ")}`);
  $("[data-latest-meta]").textContent = parts.join(" · ");
  const link = $("[data-latest-link]");
  link.href = release.url;
  const coverLink = $("[data-latest-cover-link]");
  coverLink.href = release.url;
  coverLink.setAttribute("aria-label", `Open ${release.name} on Spotify`);
  if (release.cover) $("[data-latest-cover]").src = release.cover;
  section.hidden = false;
}

function showFacts(releases) {
  const first = releases[releases.length - 1];
  const set = (name, value) => {
    const slot = $(`[data-fact="${name}"]`);
    if (slot) {
      slot.textContent = value;
      slot.closest("div").hidden = false;
    }
  };
  set("first", `${first.name} · ${formatDate(first.date)}`);
  set("releases", `${releases.length} release${releases.length === 1 ? "" : "s"} on Spotify`);
}

setupPlaylist();
if (artist) {
  loadCatalogue([artistId])
    .then((releases) => {
      updateUpcoming(releases);
      releases=releases.filter(r=>releaseTime(r)<=Date.now());
      if (!releases.length) return;
      showLatest(releases[0]);
      showFacts(releases);
      setupList(releases, {
        pageSize: 8,
        leadId: artistId,
        filters: {
          collab: (release) =>
            release.type === "track" ||
            (Array.isArray(release.artists) && release.artists.length > 1),
        },
      });
    })
    .catch(() => {
      // Keep the static page and the Spotify link when the catalogue cannot be read.
    });
  loadVideos(12)
    .then((videos) => {
      const own = videos.filter((video) => video.artistKey === artist.key || (typeof video.artist === "string" && video.artist.toLowerCase().includes(artist.name.toLowerCase()))).slice(0, 2);
      if (!own.length) return;
      $("[data-videos]").replaceChildren(...own.map((video, index) => videoCard(video, index === 0)));
      $("#videos").hidden = false;
    })
    .catch(() => {
      // Keep the verified fallback video, or the hidden section, when the feed cannot be read.
    });
}
