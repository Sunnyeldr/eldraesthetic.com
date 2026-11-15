const YOUTUBE_LIVE_URL = "https://eldr-youtube-live.sash-kelch.workers.dev/latest";
const YOUTUBE_REFRESH_MS = 15 * 60 * 1000;

function safeVideo(item) {
  if (!item || typeof item !== "object") return null;
  if (typeof item.url !== "string" || !/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{6,}$/.test(item.url)) return null;
  if (item.url.includes("/shorts/")) return null;
  if (typeof item.thumbnail !== "string" || !item.thumbnail.startsWith("https://i.ytimg.com/vi/")) return null;
  if (typeof item.title !== "string" || !item.title.trim()) return null;
  return item;
}

function renderYoutubeVideos(items) {
  const cards = [...document.querySelectorAll("[data-youtube-card]")];
  const valid = items.map(safeVideo).filter(Boolean).slice(0, cards.length);
  cards.forEach((card, index) => {
    const item = valid[index];
    if (!item) {
      card.hidden = true;
      return;
    }
    card.hidden = false;
    card.href = item.url;
    card.setAttribute("aria-label", `Watch ${item.title} by ${item.artist || "ELDR ÆSTHETIC"} on YouTube`);
    const img = card.querySelector("[data-youtube-image]");
    const artist = card.querySelector("[data-youtube-artist]");
    const title = card.querySelector("[data-youtube-title]");
    const meta = card.querySelector("[data-youtube-meta]");
    if (img) {
      img.src = item.thumbnail;
      img.alt = `YouTube thumbnail for ${item.title}`;
    }
    if (artist) artist.textContent = item.artist || "ELDR ÆSTHETIC";
    if (title) title.textContent = item.title;
    if (meta) meta.textContent = item.publishedText || "Latest upload";
  });
}

async function updateYoutubeVideos() {
  try {
    const response = await fetch(YOUTUBE_LIVE_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("youtube_feed_unavailable");
    const data = await response.json();
    if (data?.success !== true || !Array.isArray(data.videos)) throw new Error("youtube_feed_invalid");
    renderYoutubeVideos(data.videos);
  } catch {
    // Keep the current verified fallback cards if the live feed is temporarily unavailable.
  }
}

updateYoutubeVideos();
setInterval(updateYoutubeVideos, YOUTUBE_REFRESH_MS);
