const STD=["Base","Gold","Cheat Master"];
const NAMES=["Jonesy","Bush","Adventure","8-Bit","Sonic","Tails","Shadow","Killswitch","Jackrabbit","Klombo","Crown","Storm Scout"];
const KEYS=NAMES.flatMap(n=>STD.map(v=>n+"|"+v));
const store={
  get(k,fb){try{return JSON.parse(localStorage.getItem(k))??fb}catch{return fb}},
  set(k,v){localStorage.setItem(k,JSON.stringify(v))}
};
let progress=store.get("or_progress",{});
KEYS.forEach(k=>{
  const p=progress[k]||{};
  progress[k]={status:p.status||(p.owned?"have":"out"),owned:!!p.owned||p.status==="have",level:+(p.level||0),mastered:!!p.mastered};
});
function save(){store.set("or_progress",progress)}
function render(){
  const g=document.getElementById("grid");
  let have=0,out=0;
  g.innerHTML=KEYS.map(k=>{
    const st=progress[k].status==="have"||progress[k].status==="buyback"?"have":"out";
    if(st==="have")have++; else out++;
    const [n,v]=k.split("|");
    return `<button class="tile ${st}" data-k="${k}">${n}<br>${v}</button>`;
  }).join("");
  document.getElementById("count").textContent=have+" have · "+out+" still out";
  g.querySelectorAll(".tile").forEach(b=>b.onclick=()=>{
    const k=b.dataset.k,p=progress[k];
    p.status=p.status==="have"?"out":"have"; p.owned=p.status==="have"; if(p.status==="have"&&!p.level)p.level=1;
    save(); render();
  });
}
function dist(a,b){let d=0;for(let i=0;i<b.length;i++){const t=a[i]-b[i];d+=t*t}return Math.sqrt(d)}
function fpFrom(data,w,h,x,y,tw,th){
  const n=12,vec=new Float32Array(n*n*3);
  const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y));
  const x1=Math.min(w,Math.ceil(x+tw)),y1=Math.min(h,Math.ceil(y+th));
  const cw=x1-x0,ch=y1-y0; if(cw<10||ch<10)return null;
  for(let gy=0;gy<n;gy++){
    const r0=y0+Math.floor(gy*ch/n),r1=Math.max(r0+1,y0+Math.floor((gy+1)*ch/n));
    for(let gx=0;gx<n;gx++){
      const c0=x0+Math.floor(gx*cw/n),c1=Math.max(c0+1,x0+Math.floor((gx+1)*cw/n));
      let R=0,G=0,B=0,c=0;
      for(let py=r0;py<r1;py++){let i=(py*w+c0)*4;for(let px=c0;px<c1;px++){R+=data[i];G+=data[i+1];B+=data[i+2];c++;i+=4}}
      const o=(gy*n+gx)*3; vec[o]=R/c/255; vec[o+1]=G/c/255; vec[o+2]=B/c/255;
    }
  }
  return vec;
}
function match(vec){
  const db=window.SPRITE_FP||{};
  let best=1e9,second=1e9,key=null;
  for(const k of KEYS){
    const rec=db[k]; if(!rec) continue;
    const d=dist(vec,rec.fp);
    if(d<best){second=best;best=d;key=k} else if(d<second) second=d;
  }
  return {key,dist:best,margin:second-best};
}
function ok(m){return m&&m.key&&(m.dist<1.55||(m.dist<2.55&&m.margin>0.12)||(m.dist<3.05&&m.margin>0.35))}
function scanWork(work,dense){
  const hits=new Map(),{data,w,h}=work,min=Math.min(w,h);
  const add=(m)=>{if(!ok(m))return;const p=hits.get(m.key);if(!p||m.dist<p.dist)hits.set(m.key,m)};
  add(match(fpFrom(data,w,h,0,0,w,h)));
  [0.48,0.62,0.78,0.92].forEach(f=>{const s=Math.round(min*f),x=(w-s)/2,y=(h-s)/2;const v=fpFrom(data,w,h,x,y,s,s);if(v)add(match(v))});
  if(dense){
    const size=Math.round(min*0.22),step=Math.max(12,Math.round(size*0.4));
    for(let y=0;y<=h-size;y+=step)for(let x=0;x<=w-size;x+=step){const v=fpFrom(data,w,h,x,y,size,size);if(v)add(match(v))}
  }
  return [...hits.values()];
}
function grab(video,max){
  if(!video.videoWidth)return null;
  const sc=Math.min(1,max/Math.max(video.videoWidth,video.videoHeight));
  const c=document.getElementById("cv");
  c.width=Math.round(video.videoWidth*sc); c.height=Math.round(video.videoHeight*sc);
  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.drawImage(video,0,0,c.width,c.height);
  return {data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height};
}
const live={stream:null,run:false,hits:new Map(),pend:new Map(),raf:0,busy:false,last:0,snap:false};
function setSt(t){document.getElementById("st").textContent=t}
function paintHits(){
  document.getElementById("hits").innerHTML=[...live.hits.keys()].map(k=>`<span class="chip">${k.replace("|"," · ")}</span>`).join("")||'<span class="chip">No lock yet</span>';
}
function merge(found,need){
  found.forEach(h=>{
    const n=(live.pend.get(h.key)||0)+1; live.pend.set(h.key,n);
    if(n>=need){const p=live.hits.get(h.key); if(!p||h.dist<p.dist) live.hits.set(h.key,h)}
  });
  paintHits();
  const n=live.hits.size;
  setSt(n?n+" locked. Pan to the next tile.":"Point at a sprite and hold.");
}
function tick(ts){
  if(!live.run)return;
  live.raf=requestAnimationFrame(tick);
  if(live.busy||ts-live.last<300)return;
  live.last=ts; const work=grab(document.getElementById("vid"),360); if(!work)return;
  live.busy=true; try{merge(scanWork(work,false),2)}finally{live.busy=false}
}
async function cam(){
  const tries=[
    {video:{facingMode:{exact:"environment"}}},
    {video:{facingMode:{ideal:"environment"}}},
    {video:{facingMode:"environment"}},
    {video:true}
  ];
  for(const o of tries){try{return await navigator.mediaDevices.getUserMedia({audio:false,...o})}catch(e){}}
  throw new Error("no cam");
}
async function startLive(){
  if(!window.SPRITE_FP){setSt("Fingerprints missing. sprite-fp.js did not load.");document.getElementById("live").classList.add("open");return}
  live.hits=new Map(); live.pend=new Map(); live.snap=false;
  document.getElementById("live").classList.add("open"); paintHits(); setSt("Opening camera…");
  try{
    live.stream=await cam();
    const v=document.getElementById("vid"); v.srcObject=live.stream; await v.play().catch(()=>{});
    live.run=true; live.raf=requestAnimationFrame(tick);
    setSt("Live. Hold a tile in frame.");
  }catch(e){
    live.snap=true; setSt("Live video blocked. Snap tiles instead.");
    document.getElementById("file").click();
  }
}
function stop(){
  live.run=false; cancelAnimationFrame(live.raf);
  if(live.stream) live.stream.getTracks().forEach(t=>t.stop());
  live.stream=null; document.getElementById("vid").srcObject=null;
  document.getElementById("live").classList.remove("open");
}
function applyHits(){
  live.hits.forEach((h,k)=>{const p=progress[k]||{}; p.status="have"; p.owned=true; if(!p.level)p.level=1; progress[k]=p});
  save(); stop(); render();
}
async function ingest(files){
  setSt("Reading…");
  for(const f of files||[]){
    try{
      const url=URL.createObjectURL(f); const img=new Image();
      await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
      URL.revokeObjectURL(url);
      const sc=Math.min(1,720/Math.max(img.width,img.height));
      const c=document.createElement("canvas"); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
      const ctx=c.getContext("2d",{willReadFrequently:true}); ctx.drawImage(img,0,0,c.width,c.height);
      merge(scanWork({data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height},true),1);
    }catch(e){}
  }
}
document.getElementById("scanBtn").onclick=startLive;
document.getElementById("shotBtn").onclick=()=>document.getElementById("shots").click();
document.getElementById("done").onclick=applyHits;
document.getElementById("cancel").onclick=stop;
document.getElementById("snap").onclick=()=>{
  if(live.snap||!live.stream){document.getElementById("file").click();return}
  const work=grab(document.getElementById("vid"),720); if(work) merge(scanWork(work,true),1);
};
document.getElementById("file").onchange=e=>{ingest(e.target.files); e.target.value=""};
document.getElementById("shots").onchange=e=>{
  document.getElementById("live").classList.add("open"); live.hits=new Map(); live.pend=new Map();
  ingest(e.target.files); e.target.value="";
};
document.addEventListener("visibilitychange",()=>{
  if(document.hidden){live.run=false;cancelAnimationFrame(live.raf)}
  else if(live.stream&&!live.snap){live.run=true;live.raf=requestAnimationFrame(tick)}
});
render();
