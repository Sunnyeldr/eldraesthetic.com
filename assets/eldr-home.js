// ELDR ÆSTHETIC — homepage: the newest release takes over the hero.
import { ARTISTS, $, formatDate, typeLabel, loadCatalogue, loadVideos, videoCard, setupList, setupPlaylist } from "./eldr-core.js";

function showNow(release) {
  const artist = ARTISTS[release.artistIds[0]];
  const section = $("#now");
  section.dataset.artist = artist.key;
  $("[data-now-label]").textContent = `New ${typeLabel(release).toLowerCase()} · ${formatDate(release.date)}`;
  $("[data-now-rune]").textContent = artist.rune;
  $("[data-now-artist]").textContent = release.artistIds.map((id) => ARTISTS[id].name).join(" × ");
  $("[data-now-title]").textContent = release.name;
  $("[data-now-meta]").textContent = release.totalTracks > 1 ? `${release.totalTracks} tracks · out now on all streaming platforms` : "Out now on all streaming platforms";
  const listen = $("[data-now-listen]");
  listen.href = release.url;
  const profile = $("[data-now-profile]");
  profile.href = artist.page;
  profile.textContent = `${artist.name} profile`;
  const media = $(".now-media");
  media.dataset.layout = artist.layout;
  $("[data-now-image]").src = artist.image;
  if (release.cover) {
    const link = $("[data-now-cover-link]");
    link.href = release.url;
    link.setAttribute("aria-label", `Open ${release.name} on Spotify`);
    $("[data-now-cover]").src = release.cover;
    link.hidden = false;
  }
}

function showLatestPerArtist(releases) {
  for (const [id, artist] of Object.entries(ARTISTS)) {
    const latest = releases.find((release) => release.artistIds.includes(id));
    const slot = $(`[data-latest="${artist.key}"]`);
    if (latest && slot) slot.textContent = `Latest: ${latest.name} · ${formatDate(latest.date)}`;
  }
}

setupPlaylist();
loadCatalogue()
  .then((releases) => {
    if (!releases.length) return;
    showNow(releases[0]);
    showLatestPerArtist(releases);
    setupList(releases);
  })
  .catch(() => {
    // Keep the static hero and the Spotify link when the catalogue cannot be read.
  });
// The homepage video row leaves out JARA NOX's channel (owner's decision); her videos stay on her own page.
const HOME_VIDEO_EXCLUDED = new Set(["jara"]);
loadVideos(12)
  .then((all) => {
    const videos = all.filter((video) => !HOME_VIDEO_EXCLUDED.has(video.artistKey) && !/jara[\s_]*nox/i.test(video.artist || "")).slice(0, 3);
    if (videos.length) $("[data-videos]").replaceChildren(...videos.map((video, index) => videoCard(video, index === 0)));
  })
  .catch(() => {
    // Keep the verified fallback video when the YouTube feed cannot be read.
  });
