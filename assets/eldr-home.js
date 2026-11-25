// ELDR ÆSTHETIC — homepage: the newest release takes over the hero.
import { ARTISTS, $, formatDate, typeLabel, watchCatalogue, latestRelease, isPublished, loadVideos, videoCard, setupList, setupPlaylist } from "./eldr-core.js?v=union-1";

function showNow(release) {
  const artist = ARTISTS[release.artistIds[0]];
  const section = $("#now");
  section.dataset.artist = artist.key;
  $("[data-now-label]").textContent = `New ${typeLabel(release).toLowerCase()} · ${formatDate(release.date)}`;
  $("[data-now-rune]").textContent = artist.rune;
  $("[data-now-artist]").textContent =
    Array.isArray(release.artists) && release.artists.length
      ? release.artists.map((artist) => artist.name).join(" × ")
      : release.artistIds.map((id) => ARTISTS[id].name).join(" × ");
  $("[data-now-title]").textContent = release.name;
  $("[data-now-meta]").textContent = `${release.totalTracks>1?release.totalTracks+" tracks · ":""}Available on ${release.spotifyUrl&&release.appleUrl?"Spotify and Apple Music":release.spotifyUrl?"Spotify":"Apple Music"}`;
  const listen = $("[data-now-listen]");
  listen.href = release.url;
  listen.textContent=release.spotifyUrl?"Listen on Spotify":"Listen on Apple Music";
  section.querySelectorAll(".apple-release-link").forEach(a=>a.remove());
  if(release.spotifyUrl&&release.appleUrl){const a=document.createElement("a");a.className="btn apple-release-link";a.href=release.appleUrl;a.target="_blank";a.rel="noopener noreferrer";a.textContent="Apple Music";listen.after(a)}
  const profile = $("[data-now-profile]");
  profile.href = artist.page;
  profile.textContent = `${artist.name} profile`;
  const media = $(".now-media");
  media.dataset.layout = artist.layout;
  $("[data-now-image]").src = artist.image;
  if (release.cover) {
    const link = $("[data-now-cover-link]");
    link.href = release.url;
    link.setAttribute("aria-label", `Open ${release.name} on ${release.spotifyUrl?"Spotify":"Apple Music"}`);
    $("[data-now-cover]").src = release.cover;
    link.hidden = false;
  }else{$("[data-now-cover-link]").hidden=true;}
}

function showLatestPerArtist(releases) {
  for (const [id, artist] of Object.entries(ARTISTS)) {
    const latest=latestRelease(releases.filter(r=>r.artistIds.includes(id)),id);
    const slot = $(`[data-latest="${artist.key}"]`);
    if (latest && slot) slot.textContent = `Latest: ${latest.name} · ${formatDate(latest.date)}`;
  }
}

setupPlaylist();
watchCatalogue(Object.keys(ARTISTS),(all) => {
    const releases=all.filter(isPublished);
    if (!releases.length) return;
    showNow(latestRelease(releases));
    showLatestPerArtist(releases);
    setupList(releases);
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
