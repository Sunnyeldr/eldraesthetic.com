// Apple catalogue is generated server-side; page visitors never call iTunes directly.
const cataloguePromise=fetch("data/eldr-apple-catalogue.json",{cache:"no-cache",signal:AbortSignal.timeout(6000)}).then(r=>r.ok?r.json():{}).catch(()=>({}));
export const normalizeTitle=v=>String(v||"").normalize("NFKC").toLowerCase().replace(/\s*[-–—]\s*(?:single|ep)\s*$/i,"").replace(/\s+/g," ").trim();
const normalizeName=v=>String(v||"").normalize("NFKC").toLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim();
const dateDiff=(a,b)=>Math.abs(Date.parse(a)-Date.parse(b))/86400000;
const validUrl=u=>typeof u==="string"&&/^https:\/\/music\.apple\.com\/(de|us)\/album\/(?:[^/?#]+\/)?\d+(?:\?i=\d+)?$/.test(u);
function hasCredit(row,release){
  const names=(release.artists||[]).map(a=>normalizeName(a.name)).filter(Boolean);
  const text=" "+normalizeName(row.artist)+" ";
  return names.length>0&&names.every(n=>text.includes(" "+n+" "));
}
export function matchApple(release,rows){
  if(!release||!Array.isArray(rows))return null;
  const track=release.type==="track";
  const matches=rows.filter(x=>x&&x.kind===(track?"track":"album")&&normalizeTitle(x.name)===normalizeTitle(release.name)&&hasCredit(x,release)&&dateDiff(x.date,release.date)<=2&&(track||Number(x.tracks)===Number(release.totalTracks))&&validUrl(x.url));
  // A DE or US storefront may contain the same collection. Never choose between distinct ambiguous IDs.
  for(const market of ["de","us"]){
    const found=matches.filter(x=>x.market===market);
    const unique=[...new Set(found.map(x=>x.url))];
    if(unique.length===1)return unique[0];
    if(unique.length>1)return null;
  }
  return null;
}
const verifiedFallback={"5jnjFEgF8qZx4dMdC1riys":"https://music.apple.com/us/album/unbound-ep/6826632617"};
export async function attachAppleLinks(releases,artistId){
  const data=await cataloguePromise;
  const rows=Array.isArray(data[artistId])?data[artistId]:[];
  return releases.map(r=>({...r,appleUrl:matchApple(r,rows)||verifiedFallback[r.id]||null}));
}
