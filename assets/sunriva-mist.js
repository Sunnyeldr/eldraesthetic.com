import { $, el, loadCatalogue, loadVideos, setupList, formatDate, typeLabel, cleanVideoTitle } from "./eldr-core.js";
const id = document.body.dataset.artistId;
const external = (a,url) => { a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; return a; };
function releaseCard(r) {
  const item=el("article","release");
  const a=external(el("a","cover"),r.url);
  a.setAttribute("aria-label","Listen to "+r.name);
  if(r.cover){const img=el("img");img.src=r.cover;img.alt="";img.loading="lazy";a.append(img);}
  else a.append(el("span","sig","ᛚ"));
  const title=el("h3","",r.name);
  const meta=el("p","meta",[typeLabel(r),formatDate(r.date)].filter(Boolean).join(" · "));
  item.append(a,title,meta,external(el("a","listen","Listen now"),r.url));
  return item;
}
loadCatalogue([id]).then(releases=>{
  if(!releases.length)return;
  const r=releases[0];
  $("[data-latest-title]").textContent=r.name;
  $("[data-latest-meta]").textContent=[typeLabel(r),formatDate(r.date),r.totalTracks>1?r.totalTracks+" tracks":""].filter(Boolean).join(" · ");
  external($("[data-latest-link]"),r.url);
  external($("[data-latest-cover-link]"),r.url).setAttribute("aria-label","Listen to "+r.name);
  const img=$("[data-latest-cover]");
  if(r.cover)img.src=r.cover;else img.hidden=true;
  $("[data-latest-release]").hidden=false;
  $("[data-recent]").replaceChildren(...releases.slice(1,5).map(releaseCard));
  setupList(releases,{pageSize:8,leadId:id,filters:{collab:r=>r.type==="track"||r.artists.length>1}});
}).catch(()=>{});
function videoCard(v){
  const a=external(el("a","video"),v.url);
  const frame=el("div","video-image");
  const img=el("img");img.src=v.thumbnail;img.alt="";img.loading="lazy";
  const play=el("span","play","▶");play.setAttribute("aria-hidden","true");
  frame.append(img,play);
  a.append(frame,el("h3","",cleanVideoTitle(v.title)),el("p","",v.artist||"SUNRIVA"));
  return a;
}
loadVideos(60).then(videos=>{
  const own=videos.filter(v=>v.artistKey==="sunriva"||(typeof v.artist==="string"&&v.artist.toLowerCase().includes("sunriva"))).slice(0,3);
  if(!own.length)return;
  const cards=own.map(videoCard),lead=cards.shift();
  const root=$("[data-videos]");root.replaceChildren(lead);
  if(cards.length){const stack=el("div","stack");stack.append(...cards);root.append(stack);}
}).catch(()=>{});

/* Explicit activation: no Spotify iframe is created until the visitor clicks. */
const playlistLoad=document.querySelector("[data-sr-player-load]");
if(playlistLoad){
  playlistLoad.hidden=false;
  playlistLoad.addEventListener("click",()=>{
    const frame=document.createElement("iframe");
    frame.title="Best of SUNRIVA — Spotify";
    frame.src="https://open.spotify.com/embed/playlist/27QDkBCLpMStvufPMqthw4";
    frame.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen=true;
    const slot=document.querySelector("[data-sr-player-frame]");
    slot.replaceChildren(frame);
    slot.hidden=false;
    document.querySelector("[data-sr-player-prompt]").hidden=true;
    frame.focus({preventScroll:true});
  },{once:true});
}
