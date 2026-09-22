const STD=["Base","Gold","Cheat Master"];
const NAMES=["Jonesy","Bush","Adventure","8-Bit","Sonic","Tails","Shadow","Killswitch","Jackrabbit","Klombo","Crown","Storm Scout","Pond","Crash","Blinky","Dumpster Dive"];
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
    const p=progress[k];
    const st=p.status==="have"||p.status==="buyback"?"have":"out";
    if(st==="have")have++; else out++;
    const [n,v]=k.split("|");
    const crown=p.mastered?"\u265B ":"";
    return `<button class="tile ${st}${p.mastered?" mastered":""}" data-k="${k}">${crown}${n}<br>${v}${p.level?" \u00b7 Lvl "+p.level:""}</button>`;
  }).join("");
  document.getElementById("count").textContent=have+" have \u00b7 "+out+" still out \u00b7 tap = have/out \u00b7 double-tap = mastered";
  g.querySelectorAll(".tile").forEach(b=>{
    b.onclick=()=>{
      const p=progress[b.dataset.k];
      p.status=p.status==="have"?"out":"have"; p.owned=p.status==="have"; if(p.status==="have"&&!p.level)p.level=1;
      save(); render();
    };
    b.ondblclick=e=>{
      e.preventDefault();
      const p=progress[b.dataset.k];
      p.mastered=!p.mastered; if(p.mastered){p.status="have";p.owned=true; if(p.level<4)p.level=4}
      save(); render();
    };
  });
}
function dist(a,b){let d=0;for(let i=0;i<b.length;i++){const t=a[i]-b[i];d+=t*t}return Math.sqrt(d)}
function center(vec){
  if(!vec)return null;
  const out=new Float32Array(vec.length);
  let mr=0,mg=0,mb=0,n=vec.length/3;
  for(let i=0;i<vec.length;i+=3){mr+=vec[i];mg+=vec[i+1];mb+=vec[i+2]}
  mr/=n; mg/=n; mb/=n;
  for(let i=0;i<vec.length;i+=3){out[i]=vec[i]-mr;out[i+1]=vec[i+1]-mg;out[i+2]=vec[i+2]-mb}
  return out;
}
const NORM={};
function dbNorm(k,fp){return NORM[k]||(NORM[k]=center(fp))}
function fpFrom(data,w,h,x,y,tw,th){
  const n=12,vec=new Float32Array(n*n*3);
  const x0=Math.max(0,Math.floor(x)),y0=Math.max(0,Math.floor(y));
  const x1=Math.min(w,Math.ceil(x+tw)),y1=Math.min(h,Math.ceil(y+th));
  const cw=x1-x0,ch=y1-y0; if(cw<12||ch<12)return null;
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
function goldPx(r,g,b){return r>165&&g>125&&b<120&&(r-b)>55&&(g-b)>30}
function hasCrown(data,w,h,x,y,tw,th){
  const x0=Math.max(0,Math.floor(x+tw*0.28)),x1=Math.min(w,Math.floor(x+tw*0.72));
  const y0=Math.max(0,Math.floor(y+th*0.02)),y1=Math.min(h,Math.floor(y+th*0.30));
  let gold=0,tot=0;
  for(let py=y0;py<y1;py++){
    for(let px=x0;px<x1;px++){
      const i=(py*w+px)*4; tot++;
      if(goldPx(data[i],data[i+1],data[i+2]))gold++;
    }
  }
  return tot>20&&gold>14&&gold/tot>0.028;
}
function readLevel(data,w,h,x,y,tw,th){
  const x0=Math.max(0,Math.floor(x+tw*0.08));
  const x1=Math.min(w,Math.floor(x+tw*0.92));
  const y0=Math.max(0,Math.floor(y+th*0.78));
  const y1=Math.min(h,Math.floor(y+th*0.98));
  let bright=0,tot=0;
  for(let py=y0;py<y1;py++){
    for(let px=x0;px<x1;px++){
      const i=(py*w+px)*4; tot++;
      const r=data[i],g=data[i+1],b=data[i+2];
      if(r>200&&g>200&&b>200)bright++;
    }
  }
  if(tot<10)return 0;
  const ratio=bright/tot;
  if(ratio>0.18)return 5;
  if(ratio>0.12)return 4;
  if(ratio>0.08)return 3;
  if(ratio>0.045)return 2;
  if(ratio>0.02)return 1;
  return 0;
}
function match(vec){
  const db=window.SPRITE_FP||{};
  const q=center(vec); if(!q)return {key:null,dist:1e9,margin:0};
  let best=1e9,second=1e9,key=null;
  for(const k of KEYS){
    const rec=db[k]; if(!rec) continue;
    const d=dist(q,dbNorm(k,rec.fp));
    if(d<best){second=best;best=d;key=k} else if(d<second) second=d;
  }
  return {key,dist:best,margin:second-best};
}
function ok(m,loose){
  if(!m||!m.key)return false;
  if(m.dist<1.35)return true;
  if(m.dist<2.35&&m.margin>0.10)return true;
  if(m.dist<2.95&&m.margin>0.28)return true;
  if(loose&&m.dist<3.55&&m.margin>0.16)return true;
  return false;
}
function cellCrops(x,y,tw,th){
  const inset=Math.round(Math.min(tw,th)*0.08);
  const banner=Math.round(th*0.24);
  const s=Math.round(Math.min(tw,th)*0.58);
  return [
    [x+inset,y+inset,tw-inset*2,Math.max(16,th-inset-banner)],
    [x+inset,y+Math.round(th*0.10),tw-inset*2,Math.max(16,th-Math.round(th*0.32))],
    [x+(tw-s)/2,y+(th-s)*0.28,s,s],
    [x+inset,y+inset,tw-inset*2,th-inset*2]
  ];
}
function scanGrid(data,w,h,cols,rows,padX,padY,loose){
  const hits=new Map();
  const cellW=Math.floor((w-padX*2)/cols);
  const cellH=Math.floor((h-padY*2)/rows);
  if(cellW<22||cellH<22)return hits;
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x=padX+c*cellW,y=padY+r*cellH;
      let best=null;
      cellCrops(x,y,cellW,cellH).forEach(([cx,cy,cw,ch])=>{
        const v=fpFrom(data,w,h,cx,cy,cw,ch); if(!v)return;
        const m=match(v);
        if(!best||m.dist<best.dist)best=m;
      });
      if(best&&ok(best,loose)){
        best.mastered=hasCrown(data,w,h,x,y,cellW,cellH);
        best.level=readLevel(data,w,h,x,y,cellW,cellH);
        if(best.mastered&&best.level<4)best.level=4;
        const p=hits.get(best.key);
        if(!p||best.dist<p.dist)hits.set(best.key,best);
        else{
          if(best.mastered)p.mastered=true;
          if((best.level||0)>(p.level||0))p.level=best.level;
        }
      }
    }
  }
  return hits;
}
function scanWork(work,dense){
  const hits=new Map(),{data,w,h}=work,min=Math.min(w,h);
  const add=(m,loose)=>{
    if(!ok(m,loose))return;
    const p=hits.get(m.key);
    if(!p||m.dist<p.dist)hits.set(m.key,m);
    else{
      if(m.mastered)p.mastered=true;
      if((m.level||0)>(p.level||0))p.level=m.level;
    }
  };
  const v0=fpFrom(data,w,h,0,0,w,h); if(v0)add(match(v0));
  [0.42,0.56,0.70,0.84,0.94].forEach(f=>{
    const s=Math.round(min*f),x=(w-s)/2,y=(h-s)/2;
    const v=fpFrom(data,w,h,x,y,s,s); if(v)add(match(v));
  });
  [[3,3,0.02,0.06],[3,3,0.06,0.12],[3,3,0.10,0.16],[3,3,0.14,0.22],[3,4,0.06,0.10],[3,2,0.08,0.18],[4,3,0.04,0.10]].forEach(([cols,rows,px,py])=>{
    const g=scanGrid(data,w,h,cols,rows,Math.round(w*px),Math.round(h*py),true);
    g.forEach(m=>add(m,true));
  });
  if(dense){
    [0.14,0.20,0.28].map(f=>Math.round(min*f)).filter(s=>s>=24).forEach(size=>{
      const step=Math.max(8,Math.round(size*0.34));
      for(let y=0;y<=h-size;y+=step)for(let x=0;x<=w-size;x+=step){
        const v=fpFrom(data,w,h,x,y,size,size); if(v)add(match(v),true);
      }
    });
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
  document.getElementById("hits").innerHTML=[...live.hits.entries()].map(([k,h])=>`<span class="chip">${h.mastered?"\u265B ":""}${k.replace("|"," \u00b7 ")}${h.level?" L"+h.level:""}</span>`).join("")||'<span class="chip">No lock yet</span>';
}
function merge(found,need){
  found.forEach(h=>{
    const n=(live.pend.get(h.key)||0)+1; live.pend.set(h.key,n);
    if(n>=need){
      const p=live.hits.get(h.key);
      if(!p||h.dist<p.dist) live.hits.set(h.key,h);
      else{
        if(h.mastered) p.mastered=true;
        if((h.level||0)>(p.level||0)) p.level=h.level;
      }
    }
  });
  paintHits();
  const n=live.hits.size;
  setSt(n?n+" locked. Crown = mastered.":"Point at tiles \u2014 grid or one-at-a-time.");
}
function tick(ts){
  if(!live.run)return;
  live.raf=requestAnimationFrame(tick);
  if(live.busy||ts-live.last<260)return;
  live.last=ts; const work=grab(document.getElementById("vid"),480); if(!work)return;
  live.busy=true; try{merge(scanWork(work,false),2)}finally{live.busy=false}
}
async function cam(){
  const tries=[
    {video:{facingMode:{exact:"environment"},width:{ideal:1280},height:{ideal:720}}},
    {video:{facingMode:{ideal:"environment"}}},
    {video:{facingMode:"environment"}},
    {video:true}
  ];
  for(const o of tries){try{return await navigator.mediaDevices.getUserMedia({audio:false,...o})}catch(e){}}
  throw new Error("no cam");
}
async function startLive(){
  if(!window.SPRITE_FP){setSt("Fingerprints missing.");document.getElementById("live").classList.add("open");return}
  live.hits=new Map(); live.pend=new Map(); live.snap=false;
  document.getElementById("live").classList.add("open"); paintHits(); setSt("Opening camera\u2026");
  try{
    live.stream=await cam();
    const v=document.getElementById("vid"); v.srcObject=live.stream; await v.play().catch(()=>{});
    live.run=true; live.raf=requestAnimationFrame(tick);
    setSt("Live. Frame the locker or one tile.");
  }catch(e){
    live.snap=true; setSt("Live video blocked. Snap the locker page.");
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
  live.hits.forEach((h,k)=>{
    const p=progress[k]||{};
    p.status="have"; p.owned=true;
    const lvl=h.level||1;
    p.level=Math.max(p.level||0,lvl);
    if(h.mastered){p.mastered=true; if(p.level<4)p.level=4}
    progress[k]=p;
  });
  save(); stop(); render();
}
async function ingest(files){
  setSt("Scanning locker grid\u2026");
  for(const f of files||[]){
    try{
      const url=URL.createObjectURL(f); const img=new Image();
      await new Promise((res,rej)=>{img.onload=res;img.onerror=rej;img.src=url});
      URL.revokeObjectURL(url);
      const sc=Math.min(1,1280/Math.max(img.width,img.height));
      const c=document.createElement("canvas"); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
      const ctx=c.getContext("2d",{willReadFrequently:true}); ctx.drawImage(img,0,0,c.width,c.height);
      merge(scanWork({data:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height},true),1);
    }catch(e){}
  }
  if(!live.hits.size) setSt("No lock. Get closer to the tiles or tap them on the board.");
}
document.getElementById("scanBtn").onclick=startLive;
document.getElementById("shotBtn").onclick=()=>document.getElementById("shots").click();
document.getElementById("done").onclick=applyHits;
document.getElementById("cancel").onclick=stop;
document.getElementById("snap").onclick=()=>{
  if(live.snap||!live.stream){document.getElementById("file").click();return}
  const work=grab(document.getElementById("vid"),1280); if(work) merge(scanWork(work,true),1);
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
