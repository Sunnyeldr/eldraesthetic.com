import { $, el, loadCatalogue, loadVideos, setupList, formatDate, typeLabel, cleanVideoTitle } from "./eldr-core.js";
const id = document.body.dataset.artistId;
const external = (a,url) => { a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; return a; };
const appleArtist="https://music.apple.com/us/artist/sunriva/6785632733";
const appleLinks={"5jnjFEgF8qZx4dMdC1riys":"https://music.apple.com/us/album/unbound-ep/6826632617","1a2LtG9n4eM7jx8mt2mimq":"https://music.apple.com/us/album/cold-laugh-single/6824188205","5RXHwe6GUE18oZZ5LnPjio":"https://music.apple.com/us/album/shards-ep/6817139865","4ENmUu3syMwsm0IZZly0G3":"https://music.apple.com/us/album/break-the-north-single/6814123106","4xCP7ykfCkz6Lo3gpNbFj3":"https://music.apple.com/us/album/cold-between-us-single/6786009610"};
function serviceLinks(r,existing){
  const row=existing||el("div","sr-service-row");
  row.replaceChildren(external(el("a","btn primary","Spotify"),r.url),external(el("a","btn secondary",appleLinks[r.id]?"Apple Music":"Apple Music · Artist"),appleLinks[r.id]||appleArtist));
  return row;
}
function releaseCard(r) {
  const item=el("article","release");
  const a=external(el("a","cover"),r.url);
  a.setAttribute("aria-label","Listen to "+r.name);
  if(r.cover){const img=el("img");img.src=r.cover;img.alt="";img.loading="lazy";a.append(img);}
  else a.append(el("span","sig","ᛚ"));
  item.append(a,el("h3","",r.name),el("p","meta",[typeLabel(r),formatDate(r.date)].filter(Boolean).join(" · ")),serviceLinks(r));
  return item;
}
import {releaseTime,updateUpcoming} from "./eldr-countdown.js?v=1";
loadCatalogue([id]).then(async releases=>{
  updateUpcoming(releases);
  const published=releases.filter(r=>releaseTime(r)<=Date.now());
  if(!published.length)return;
  const r=published[0];
  $("[data-latest-title]").textContent=r.name;
  $("[data-latest-meta]").textContent=[typeLabel(r),formatDate(r.date),r.totalTracks>1?r.totalTracks+" tracks":""].filter(Boolean).join(" · ");
  serviceLinks(r,$("[data-latest-services]"));
  external($("[data-latest-cover-link]"),r.url).setAttribute("aria-label","Listen to "+r.name);
  const img=$("[data-latest-cover]");
  if(r.cover)img.src=r.cover;else img.hidden=true;
  $("[data-latest-release]").hidden=false;
  const album=published.find(x=>x.type==="album"||x.type==="ep");
  const albumBox=$("[data-album-highlight]");
  if(album&&album.id!==r.id){albumBox.replaceChildren(el("p","eyebrow","Latest album / EP"),releaseCard(album));albumBox.hidden=false;}
  $("[data-recent]").replaceChildren(...published.slice(1,5).filter(x=>!album||album.id===r.id||x.id!==album.id).map(releaseCard));
  setupList(published,{pageSize:8,leadId:id,filters:{collab:r=>r.type==="track"||r.artists.length>1}});
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
    frame.src="https://open.spotify.com/embed/playlist/27QDkBCLpMStvufPMqthw4?theme=0";
    frame.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen=true;
    const slot=document.querySelector("[data-sr-player-frame]");
    slot.replaceChildren(frame);
    slot.hidden=false;
    document.querySelector("[data-sr-player-prompt]").hidden=true;
    frame.focus({preventScroll:true});
  },{once:true});
}
