// ELDR ÆSTHETIC — homepage catalogue, videos, and opt-in playlist.
import {
  ARTISTS, $, el, formatDate, isPublished, loadVideos, setupList,
  setupPlaylist, typeLabel, videoCard, watchCatalogue,
} from "./eldr-core.js?v=dashboard-1";

const videoGrid = $("[data-videos]");
const releaseGrid = $("[data-releases]");
const fallback = JSON.parse($("#releases").textContent);
const fallbackBySpotify = new Map(fallback.map(release => [release.spotifyUrl, release]));
const appleAlbumId = (url) => url?.match(/\/(\d+)$/)?.[1];
const fallbackByApple = new Map(fallback.map(release => [appleAlbumId(release.appleUrl), release]));

function displayRelease(release) {
  // Use the directly verified links and artwork from the approved draft when
  // the catalogue has a matching platform ID but only one working feed.
  const known = fallbackBySpotify.get(release.spotifyUrl) ||
    fallbackByApple.get(appleAlbumId(release.appleUrl));
  if (!known) return release;
  return {
    ...release,
    name: known.name,
    cover: known.cover,
    spotifyUrl: release.spotifyUrl || known.spotifyUrl,
    appleUrl: release.appleUrl || known.appleUrl,
  };
}

function streamingButton(release, service, url) {
  const platform = service === "spotify" ? "Spotify" : "Apple Music";
  const link = el("a", "pill " + service);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.setAttribute("aria-label", release.name + " on " + platform);
  const icon = el("img");
  icon.src = "assets/eldr-dashboard/" + (service === "spotify" ? "spotify.svg" : "apple-music.svg");
  icon.alt = "";
  icon.width = 18;
  icon.height = 18;
  link.append(icon, document.createTextNode(platform));
  return link;
}

function releaseCard(release) {
  const card = el("li", "release");
  const cover = release.cover
    ? el("img", "release-cover")
    : el("span", "release-cover placeholder");
  if (release.cover) {
    cover.src = release.cover;
    cover.alt = "";
    cover.width = 80;
    cover.height = 80;
    cover.loading = "lazy";
  } else {
    cover.setAttribute("aria-hidden", "true");
  }

  const copy = el("div", "release-copy");
  const credits = release.artists.map(artist => ARTISTS[artist.id]?.name || artist.name).join(" × ");
  const actions = el("div", "actions");
  if (release.spotifyUrl) actions.append(streamingButton(release, "spotify", release.spotifyUrl));
  if (release.appleUrl) actions.append(streamingButton(release, "apple", release.appleUrl));
  copy.append(
    el("h3", "", release.name),
    el("p", "", credits),
    el("small", "release-date", [typeLabel(release), formatDate(release.date)].filter(Boolean).join(" · ")),
    actions,
  );
  card.append(cover, copy);
  return card;
}

setupList(fallback.filter(isPublished), {
  pageSize: 6,
  filters: {all: release => release.type !== "track"},
  renderItem: releaseCard,
});
watchCatalogue(Object.keys(ARTISTS), (all) => {
  const releases = all.filter(isPublished).map(displayRelease);
  if (releases.length) setupList(releases);
});

function dashboardVideo(video) {
  const card = videoCard(video);
  const [image, originalText] = card.children;
  image.width = 640;
  image.height = 360;
  const frame = el("div", "video-image");
  const play = el("span", "play", "▶");
  play.setAttribute("aria-hidden", "true");
  frame.append(image, play);
  const copy = el("div", "video-text");
  copy.append(el("h3", "", $("strong", originalText).textContent), el("p", "", $("small", originalText).textContent));
  card.replaceChildren(frame, copy);
  return card;
}

loadVideos(12)
  .then((all) => {
    // JARA NOX's videos are featured on her profile rather than in this feed.
    const videos = all.filter(video =>
      video.artistKey !== "jara" && !/jara[\s_]*nox/i.test(video.artist || ""),
    ).slice(0, 3);
    if (videos.length) videoGrid.replaceChildren(...videos.map(dashboardVideo));
  })
  .catch(() => {
    // The homepage already contains verified fallback videos.
  });

setupPlaylist();

if ("IntersectionObserver" in window && matchMedia("(prefers-reduced-motion: no-preference)").matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  }, {rootMargin: "0px 0px -24px 0px"});

  function observeBelowFold(nodes) {
    [...nodes].forEach((node, index) => {
      if (node.getBoundingClientRect().top < window.innerHeight) return;
      node.style.setProperty("--delay", Math.min(index % 4, 2) * 48 + "ms");
      node.classList.add("reveal");
      observer.observe(node);
    });
  }

  const changes = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.removedNodes) {
        if (node.nodeType === Node.ELEMENT_NODE) observer.unobserve(node);
      }
      observeBelowFold([...record.addedNodes].filter(node => node.nodeType === Node.ELEMENT_NODE));
    }
  });
  for (const group of [$(".artist-grid"), releaseGrid, videoGrid, $(".label-pair")]) {
    observeBelowFold(group.children);
  }
  changes.observe(releaseGrid, {childList: true});
  changes.observe(videoGrid, {childList: true});
}
