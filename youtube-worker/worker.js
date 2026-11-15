addEventListener("fetch", event => event.respondWith(handle(event.request)));
const CHANNELS = [
  { handle: "sunny-eldr", artist: "SUNNY ELDR" },
  { handle: "lokynvoi", artist: "JARA NOX" }
];
const headers = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "cache-control": "public, max-age=900, s-maxage=900"
};
const json = (body, status=200) => new Response(JSON.stringify(body), { status, headers });
function decodeHtml(s="") { return s.replace(/\\u0026/g,"&").replace(/&amp;/g,"&").replace(/&#39;/g,"'").replace(/&quot;/g,'"').replace(/\\u003d/g,"=").replace(/\\u0027/g,"'"); }
function ageMs(text="") {
  const m=text.toLowerCase().match(/(\d+)\s*(minute|hour|day|week|month|year)s?\s+ago/);
  if(!m) return Number.MAX_SAFE_INTEGER/2;
  const map={minute:60000,hour:3600000,day:86400000,week:604800000,month:2629800000,year:31557600000};
  return Number(m[1])*map[m[2]];
}
async function channelVideos(channel) {
  const res=await fetch(`https://www.youtube.com/@${channel.handle}/videos?hl=en&gl=US`,{headers:{"user-agent":"Mozilla/5.0 (compatible; ELDR-Aesthetic/1.0)","accept-language":"en-US,en;q=0.9"},cf:{cacheTtl:900,cacheEverything:true}});
  if(!res.ok) return [];
  const html=await res.text(), out=[];
  const rx=/"videoRenderer":\{"videoId":"([^"]+)"([\s\S]{0,7000}?)"publishedTimeText":\{"simpleText":"([^"]+)"\}/g;
  let m;
  while((m=rx.exec(html))&&out.length<8){
    const id=m[1], body=m[2];
    if(body.includes('"isShorts":true')||body.includes('/shorts/')) continue;
    const tm=body.match(/"title":\{"runs":\[\{"text":"([^"]+)"/);
    if(!tm) continue;
    const publishedText=decodeHtml(m[3]);
    if(out.some(v=>v.id===id)) continue;
    out.push({id,title:decodeHtml(tm[1]),artist:channel.artist,handle:channel.handle,publishedText,ageMs:ageMs(publishedText),url:`https://www.youtube.com/watch?v=${id}`,thumbnail:`https://i.ytimg.com/vi/${id}/hqdefault.jpg`});
  }
  return out;
}
async function handle(request){
  if(request.method==="OPTIONS") return new Response(null,{status:204,headers});
  if(request.method!=="GET") return json({success:false,error:"method_not_allowed"},405);
  const url=new URL(request.url);
  if(url.pathname==="/health") return json({success:true,service:"eldr-youtube-live",channels:CHANNELS.length});
  if(!["/","/latest"].includes(url.pathname)) return json({success:false,error:"not_found"},404);
  try{
    const groups=await Promise.all(CHANNELS.map(channelVideos));
    const videos=groups.flat().sort((a,b)=>a.ageMs-b.ageMs).slice(0,2).map(({ageMs,...v})=>v);
    return json({success:true,videos,updatedAt:new Date().toISOString(),shortsExcluded:true});
  }catch{return json({success:false,error:"youtube_unavailable"},503);}
}