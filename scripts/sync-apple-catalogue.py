"""Refresh Apple catalogue through the documented public iTunes Lookup API."""
import json, time, urllib.parse, urllib.request, urllib.error
from pathlib import Path
ARTISTS={
"26RwT7kIoTnT8oT65MGS2P":(1895655133,"Sunny ELDR"),
"0EZ3VnaZOkGWYyYMxYdJzZ":(6785632733,"SUNRIVA"),
"0Um7pcFDku2VNShSlfxy1B":(6800234336,"RYNVA"),
"0kLRThHL6uSbmGwEarlsKy":(6801616769,"JARA NOX"),
}
OUT=Path("data/eldr-apple-catalogue.json")
try: previous=json.loads(OUT.read_text())
except (OSError,ValueError): previous={}
def fetch(apple_id,market,entity):
    query=urllib.parse.urlencode(dict(id=apple_id,entity=entity,limit=200,country=market))
    req=urllib.request.Request("https://itunes.apple.com/lookup?"+query,headers={"Accept":"application/json","User-Agent":"ELDR Aesthetic catalogue sync/1.0"})
    with urllib.request.urlopen(req,timeout=18) as resp: result=json.load(resp)
    rows=result.get("results")
    if not isinstance(rows,list): raise ValueError("invalid Apple response")
    # A real artist response is required; a transient empty response never clears good data.
    if not any(r.get("wrapperType")=="artist" and r.get("artistId")==apple_id for r in rows):
        raise ValueError("artist ID missing")
    return rows
def convert(row,market,entity,apple_id,artist):
    track=entity=="song"
    if row.get("wrapperType")!=("track" if track else "collection"): return None
    if track and row.get("kind")!="song": return None
    # Lookup is scoped by ID, but validate the owner name as well for compilations.
    import re, unicodedata
    norm=lambda s:" ".join(re.findall(r"[^\W_]+",unicodedata.normalize("NFKC",str(s)).casefold()))
    if " "+norm(artist)+" " not in " "+norm(row.get("artistName",""))+" ": return None
    cid=row.get("collectionId");tid=row.get("trackId")
    if not isinstance(cid,int) or (track and not isinstance(tid,int)): return None
    name=row.get("trackName" if track else "collectionName")
    date=str(row.get("releaseDate",""))[:10]
    if not name or not re.fullmatch(r"\d{4}-\d{2}-\d{2}",date): return None
    if not track and not isinstance(row.get("trackCount"),int): return None
    return dict(kind="track" if track else "album",name=name,artist=row["artistName"],date=date,tracks=row.get("trackCount"),market=market,url=f"https://music.apple.com/{market}/album/{cid}"+(f"?i={tid}" if track else ""))
def main():
    output=dict(previous); successes=0; failures=0
    for sid,(aid,artist) in ARTISTS.items():
        prior=previous.get(sid,[])
        combined=[]
        for market in ("de","us"):
            for entity in ("album","song"):
                kind="track" if entity=="song" else "album"
                try:
                    raw=fetch(aid,market,entity)
                    fresh=[x for r in raw if (x:=convert(r,market,entity,aid,artist))]
                    if not fresh and any(x.get("market")==market and x.get("kind")==kind for x in prior):
                        raise ValueError("unexpected empty catalogue")
                    combined.extend(fresh);successes+=1
                    print(f"{artist} {market} {kind}: {len(fresh)}",flush=True)
                except Exception as exc:
                    failures+=1
                    combined.extend(x for x in prior if x.get("market")==market and x.get("kind")==kind)
                    print(f"{artist} {market} {kind}: {type(exc).__name__}: {exc}; keeping cache",flush=True)
                time.sleep(3.1)
        output[sid]=sorted({x["url"]:x for x in combined}.values(),key=lambda x:(x["kind"],x["date"],x["name"],x["market"],x["url"]))
    OUT.parent.mkdir(exist_ok=True)
    OUT.write_text(json.dumps(output,ensure_ascii=False,indent=2,sort_keys=True)+"\n")
    print(f"Apple lookup results: {successes} successful; {failures} failed",flush=True)
    if not successes: raise SystemExit(1)
if __name__=="__main__":main()
