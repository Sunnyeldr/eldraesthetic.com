import { $, el, watchCatalogue, latestRelease, loadVideos, setupList, formatDate, typeLabel, cleanVideoTitle } from "./eldr-core.js?v=union-1";
const id = document.body.dataset.artistId;
const external = (a,url) => { a.href=url; a.target="_blank"; a.rel="noopener noreferrer"; return a; };
function serviceLinks(r,existing){
  const row=existing||el("div","sr-service-row");
  row.replaceChildren();
  if(r.spotifyUrl)row.append(external(el("a","btn primary","Spotify"),r.spotifyUrl));
  if(r.appleUrl)row.append(external(el("a",r.spotifyUrl?"btn secondary":"btn primary","Apple Music"),r.appleUrl));
  return row;
}
function releaseCard(r) {
  const item=el("article","release");
  const a=external(el("a","cover"),r.url);
  a.setAttribute("aria-label","Listen to "+r.name);
  if(r.cover){const img=el("img");img.src=r.cover;img.alt="";img.loading="lazy";a.append(img);}
  else a.append(el("span","sig","ᚢ"));
  item.append(a,el("h3","",r.name),el("p","meta",[typeLabel(r),formatDate(r.date)].filter(Boolean).join(" · ")),serviceLinks(r));
  return item;
}
import {releaseTime,updateUpcoming} from "./eldr-countdown.js?v=union-1";
watchCatalogue([id],async releases=>{
  updateUpcoming(releases);
  const published=releases.filter(r=>releaseTime(r)<=Date.now());
  if(!published.length)return;
  const r=latestRelease(published,id);
  $("[data-latest-title]").textContent=r.name;
  $("[data-latest-meta]").textContent=[typeLabel(r),formatDate(r.date),r.totalTracks>1?r.totalTracks+" tracks":""].filter(Boolean).join(" · ");
  serviceLinks(r,$("[data-latest-services]"));
  external($("[data-latest-cover-link]"),r.url).setAttribute("aria-label","Listen to "+r.name);
  const img=$("[data-latest-cover]");
  if(r.cover){img.src=r.cover;img.hidden=false;}else{img.removeAttribute("src");img.hidden=true;}
  $("[data-latest-release]").hidden=false;
  const album=published.find(x=>x.type==="album"||x.type==="ep");
  const albumBox=$("[data-album-highlight]");
  albumBox.hidden=!album||album.id===r.id;
  if(!albumBox.hidden)albumBox.replaceChildren(el("p","eyebrow","Latest album / EP"),releaseCard(album));
  $("[data-recent]").replaceChildren(...published.filter(x=>!x.albumTrack&&x.id!==r.id&&(albumBox.hidden||x.id!==album.id)).slice(0,4).map(releaseCard));
  setupList(published,{pageSize:8,leadId:id,filters:{collab:r=>r.artists.length>1}});
});
function videoCard(v){
  const a=external(el("a","video"),v.url);
  const frame=el("div","video-image");
  const img=el("img");img.src=v.thumbnail;img.alt="";img.loading="lazy";
  const play=el("span","play","▶");play.setAttribute("aria-hidden","true");
  frame.append(img,play);
  a.append(frame,el("h3","",cleanVideoTitle(v.title)),el("p","",v.artist||"RYNVA"));
  return a;
}
loadVideos(60).then(videos=>{
  const own=videos.filter(v=>v.artistKey==="rynva"||(typeof v.artist==="string"&&v.artist.toLowerCase().includes("rynva"))).slice(0,3);
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
    frame.title="Best of RYNVA — Spotify";
    frame.src="https://open.spotify.com/embed/playlist/3j7l6fAZnmJrdsE7AEZGmf?theme=0";
    frame.allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture";
    frame.allowFullscreen=true;
    const slot=document.querySelector("[data-sr-player-frame]");
    slot.replaceChildren(frame);
    slot.hidden=false;
    document.querySelector("[data-sr-player-prompt]").hidden=true;
    frame.focus({preventScroll:true});
  },{once:true});
}

if(!matchMedia("(prefers-reduced-motion:reduce)").matches&&"IntersectionObserver"in window){document.documentElement.classList.add("motion");const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("visible");io.unobserve(e.target)}}),{threshold:.08});document.querySelectorAll(".reveal,.heading,.featured,.sr-playlist,.profile").forEach(e=>{e.classList.add("reveal");if(e.getBoundingClientRect().top<innerHeight)e.classList.add("visible");else io.observe(e)});addEventListener("scroll",()=>document.querySelector(".hero").style.setProperty("--shift",Math.min(scrollY*.065,30)+"px"),{passive:true});}
