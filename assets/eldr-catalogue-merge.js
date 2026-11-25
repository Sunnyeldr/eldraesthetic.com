// Combine verified source links, not inferred streaming URLs.
export function mergeCatalogues(spotify,snapshot,ids,registry){
 const norm=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
 const title=s=>String(s||"").normalize("NFKC").toLowerCase().replace(/\s*[-–—]\s*(single|ep)\s*$/i,"").replace(/\s*\((?:feat\.?|ft\.?|featuring)\s+[^)]+\)\s*$/i,"").replace(/\s+/g," ").trim();
 const known=new Map(Object.entries(registry).map(([id,a])=>[norm(a.name),{id,name:a.name}]));
 const credit=s=>String(s||"").split(/\s+(?:&|×|x|feat\.?|ft\.?|featuring|and)\s+|,\s*/i).map(x=>x.trim()).filter(Boolean).map(name=>known.get(norm(name))||{id:"credit:"+norm(name),name});
 const key=a=>[...new Set(a.map(x=>norm(x.name)))].sort().join("|"),near=(a,b)=>Math.abs(Date.parse(a)-Date.parse(b))<=172800000,selected=a=>a.artistIds.some(id=>ids.includes(id));
 const appleMap=new Map();
 for(const [owner,rows] of Object.entries(snapshot||{})){
  if(!registry[owner]||!Array.isArray(rows))continue;
  for(const raw of rows){
   if(!raw||!/^\d{4}-\d{2}-\d{2}$/.test(raw.date||"")||!Number.isFinite(Date.parse(raw.date))||typeof raw.name!=="string"||!raw.name.trim())continue;
   const m=String(raw.url||"").match(/^https:\/\/music\.apple\.com\/(de|us)\/album\/(?:[^/?#]+\/)?(\d+)(?:\?i=(\d+))?$/);
   if(!m||raw.kind!==(m[3]?"track":"album"))continue;
   const artists=credit(raw.artist),artistIds=artists.filter(a=>registry[a.id]).map(a=>a.id);
   if(!artistIds.includes(owner))continue;
   const n=Number(raw.tracks)||1,cid=m[2],tid=m[3]||null,identity=tid?"track:"+cid+":"+tid:"album:"+cid;
   const type=tid?"track":n===1?"single":(/\s[-–—]\sEP$/i.test(raw.name)||n<=6?"ep":"album");
   const cover=/^https:\/\/(?:is\d+-ssl|is\d+|a\d+)\.mzstatic\.com\/[^ ]+$/.test(raw.artwork||"")?raw.artwork:null;
   const item={id:"apple:"+identity,name:raw.name.replace(/\s*[-–—]\s*(single|ep)\s*$/i,"").trim(),type,totalTracks:tid?1:n,date:raw.date,url:raw.url,appleUrl:raw.url,spotifyUrl:null,cover,artistIds:[...new Set(artistIds)],artists,appleCollectionId:cid,appleTrackId:tid,market:m[1],source:"apple"};
   const old=appleMap.get(identity);
   if(!old||m[1]==="de"&&old.market!=="de")appleMap.set(identity,item);
  }
 }
 const all=[...appleMap.values()],albums=new Map(all.filter(a=>!a.appleTrackId).map(a=>[a.appleCollectionId,a])),suppressed=new Set();
 for(const a of all.filter(a=>a.appleTrackId)){
   const p=albums.get(a.appleCollectionId);
   if(p?.type==="single"&&title(p.name)===title(a.name)&&near(p.date,a.date)){p.artists=[...new Map([...p.artists,...a.artists].map(x=>[norm(x.name),x])).values()];p.artistIds=[...new Set([...p.artistIds,...a.artistIds])];suppressed.add(a.id)}
 }
 const apple=all.filter(a=>!suppressed.has(a.id)&&selected(a)),used=new Set(),out=[];
 for(const s0 of spotify){
   const s={...s0,spotifyUrl:s0.url,appleUrl:null,source:"spotify"};
   if(!selected(s))continue;
   const matches=apple.filter(a=>!used.has(a.id)&&a.type===s.type&&title(a.name)===title(s.name)&&near(a.date,s.date)&&(s.type==="track"||Number(a.totalTracks)===Number(s.totalTracks))&&key(a.artists)===key(s.artists));
   if(matches.length===1){const a=matches[0];used.add(a.id);s.appleUrl=a.appleUrl;s.appleCollectionId=a.appleCollectionId;s.appleTrackId=a.appleTrackId;s.cover=s.cover||a.cover;s.artistIds=[...new Set([...s.artistIds,...a.artistIds])];s.source="both"}
   out.push(s);
 }
 for(const a of apple)if(!used.has(a.id))out.push({...a});
 const parents=new Map(out.filter(a=>a.type!=="track").map(a=>[a.id,a]));
 for(const a of out){
  if(a.type!=="track"){a.albumTrack=false;a.parentArtistIds=[];continue}
  const p=albums.get(a.appleCollectionId)||parents.get(a.sourceAlbumId);
  a.parentArtistIds=p&&p.type!=="single"?p.artistIds:[];
  a.albumTrack=a.parentArtistIds.some(id=>ids.includes(id));
  if(!a.cover&&p)a.cover=p.cover||out.find(x=>x.appleCollectionId===a.appleCollectionId&&x.type!=="track")?.cover||null;
 }
 return out.sort((a,b)=>b.date.localeCompare(a.date)||Number(a.type==="track")-Number(b.type==="track")||a.name.localeCompare(b.name)||a.id.localeCompare(b.id));
}
