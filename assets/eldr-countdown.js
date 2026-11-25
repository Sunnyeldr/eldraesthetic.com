
import {loadCatalogue} from "./eldr-core.js";
export const releaseTime=r=>Date.parse(r.releaseAt||r.date+"T00:00:00");
const id=document.body.dataset.artistId;
const root=document.querySelector("[data-next]");
const q=s=>root.querySelector(s);
let entries=[], timer;
const validUrl=(value)=>{try{const u=new URL(value);return u.protocol==="https:"&&((u.hostname==="open.spotify.com"&&/^\/(prerelease|album)\/[A-Za-z0-9]+$/.test(u.pathname))||(u.hostname==="distrokid.com"&&u.pathname.startsWith("/hyperfollow/"))||(u.hostname==="music.apple.com"&&u.pathname.includes("/album/")))?u.href:null;}catch{return null;}};
function render(){
 clearInterval(timer);
 const now=Date.now();
 const next=entries.filter(r=>r&&typeof r.name==="string"&&r.name.trim()&&Number.isFinite(releaseTime(r))&&releaseTime(r)>now).sort((a,b)=>releaseTime(a)-releaseTime(b))[0];
 if(!next){root.hidden=true;return;}
 q("[data-next-title]").textContent=next.name;
 const credits=q("[data-next-artists]");
 credits.textContent=Array.isArray(next.artists)?next.artists.map(a=>a.name).filter(Boolean).join(" × "):(next.artists||"");
 credits.hidden=!credits.textContent;
 q("[data-next-date]").textContent=new Date(releaseTime(next)).toLocaleDateString(document.documentElement.lang||"en",{day:"numeric",month:"long",year:"numeric"});
 const cover=q("[data-next-cover]");
 if(cover){cover.hidden=!(typeof next.cover==="string"&&/^https:\/\/i\.scdn\.co\/image\/[A-Za-z0-9]+$/.test(next.cover));if(!cover.hidden)cover.src=next.cover;}
 const btn=q("[data-presave]"),url=validUrl(next.presave||next.url);
 btn.hidden=!url;
 if(url){btn.href=url;btn.textContent=next.presave?"Pre-save / Pre-add":"View release";}
 root.hidden=false;
 function tick(){const n=Math.max(0,Math.ceil((releaseTime(next)-Date.now())/1000));if(!n){render();return;}for(const [k,v] of Object.entries({days:Math.floor(n/86400),hours:Math.floor(n/3600)%24,minutes:Math.floor(n/60)%60,seconds:n%60}))q("[data-"+k+"]").textContent=String(v).padStart(2,"0");}
 tick();timer=setInterval(tick,1000);
}
const schedule=()=>fetch("data/eldr-upcoming.json",{cache:"no-store"}).then(r=>{if(!r.ok)throw Error("schedule");return r.json();}).then(v=>{if(!Array.isArray(v))throw Error("schedule");return v.filter(r=>Array.isArray(r.artistIds)&&r.artistIds.includes(id));});
let planned=[],catalogue=[];
function combine(){const byName=new Map();for(const r of [...catalogue,...planned]){if(!r||typeof r.name!=="string")continue;const key=r.name.trim().toLowerCase()+"|"+(r.date||"");byName.set(key,r);}entries=[...byName.values()];render();}
export async function updateUpcoming(releases){if(Array.isArray(releases)&&releases.length)catalogue=releases.filter(r=>r.type==="album"||r.type==="ep");try{planned=await schedule();}catch{}combine();}
if(root){updateUpcoming([]);setInterval(()=>{if(document.visibilityState==="visible")loadCatalogue([id]).then(updateUpcoming).catch(()=>{});},15*60*1000);document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")loadCatalogue([id]).then(updateUpcoming).catch(()=>{});});}
