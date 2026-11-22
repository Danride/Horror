/* ==========================================================
   ЛАБИРИНТ
   ========================================================== */
const grid = new Uint8Array(GW*GW).fill(1);
const gidx = (i,j) => j*GW + i;
const DIRS4 = [[1,0],[-1,0],[0,1],[0,-1]];
const startCell=[15,3];
let exitCell = [15,15], routeDist = new Int32Array(GW*GW), roomCells = [], rooms=[], roomLinks=[], startYaw=0, floorPatterns=[];
const FLOOR_CHANCES=[['normal',.35],['hall',.25],['corridor',.15],['safe',.10],['yellow',.05],['mixed',.10]];
let floorType='normal';
function rollFloorType(roll=Math.random()){let sum=0;for(const [type,chance] of FLOOR_CHANCES){sum+=chance;if(roll<sum)return type;}return 'mixed';}
const isSafeFloor=()=>floorType==='safe';
function generateSpecialMaze(type){
  grid.fill(1);rooms=[];roomCells=[];roomLinks=[];floorPatterns=[type];
  const add=(x,z,hx,hz,layout,kind='normal',branch=false)=>{const r={id:rooms.length,x,z,hx,hz,layout,kind,branch,sequence:rooms.length+1};rooms.push(r);roomCells.push([x,z]);return r;};
  const link=(a,b,open=false)=>roomLinks.push([a,b,open]);
  const start=add(15,3,1,1,'room','start');let end;
  if(type==='hall'){
    const hall=add(15,15,6,5,'hall');end=add(15,27,2,2,'room','exit');link(start,hall);link(hall,end);
    const left=add(4,15,2,2,'room','normal',true),right=add(26,15,2,2,'room','normal',true);link(hall,left,true);link(hall,right,true);
  }else if(type==='corridor'){
    const hall=add(15,21,1,14,'corridor');end=add(15,40,2,2,'room','exit');link(start,hall,true);link(hall,end,true);
    link(hall,add(8,21,2,2,'room','normal',true));link(hall,add(22,21,2,2,'room','normal',true));
  }else{
    const desk=add(15,10,3,2,'hall');desk.reception=true;const rest=add(15,18,2,2,'room');end=add(15,26,2,2,'room','exit');link(start,desk);link(desk,rest);link(rest,end);link(desk,add(7,10,2,2,'room','normal',true));link(desk,add(23,10,2,2,'room','normal',true));
  }
  for(const r of rooms)for(let x=r.x-r.hx;x<=r.x+r.hx;x++)for(let z=r.z-r.hz;z<=r.z+r.hz;z++)grid[gidx(x,z)]=0;
  for(const [a,b] of roomLinks){const dx=Math.sign(b.x-a.x),dz=Math.sign(b.z-a.z),length=Math.abs(b.x-a.x)+Math.abs(b.z-a.z);for(let n=0;n<=length;n++)grid[gidx(a.x+n*dx,a.z+n*dz)]=0;}
  exitCell=[end.x,end.z];startYaw=Math.PI;routeDist=distanceField(...exitCell);
}
function distanceField(sx,sz){
  const out = new Int32Array(GW*GW).fill(-1), q = [gidx(sx,sz)];
  out[q[0]]=0;
  for(let n=0;n<q.length;n++){
    const id=q[n], x=id%GW,z=(id/GW)|0;
    for(const [dx,dz] of DIRS4){
      const a=x+dx,b=z+dz,k=gidx(a,b);
      if(a<1||a>=GW-1||b<1||b>=GW-1||grid[k]||out[k]>=0) continue;
      out[k]=out[id]+1;q.push(k);
    }
  }
  return out;
}

function generateMaze(forced=null){
  floorType=forced||rollFloorType();if(['hall','corridor','safe'].includes(floorType)){generateSpecialMaze(floorType);return;}
  grid.fill(1);
  // Compose connected modules on a coarse graph, then carve each room and passage.
  rooms=[];roomCells=[];roomLinks=[];floorPatterns=[];
  const sewer=false,occupied=new Map(),spine=[],key=(x,z)=>z*8+x;
  const addPattern=p=>{if(!floorPatterns.includes(p))floorPatterns.push(p);};
  let branchNumber=0;
  function addRoom(x,z,branch=false,layout='room',parent=0){
    const old=occupied.get(key(x,z));if(old)return old;
    const r={id:key(x,z),sx:x,sz:z,x:3+x*6,z:3+z*6,hx:layout==='hall'?2:layout==='corridor'||layout==='narrow'?1:1+(Math.random()<.4?1:0),hz:layout==='hall'||layout==='corridor'?2:1+(Math.random()<.4?1:0),kind:'normal',branch,layout,sequence:branch?0:spine.length+1,parentSequence:parent,branchNumber:branch?++branchNumber:0};
    occupied.set(r.id,r);rooms.push(r);roomCells.push([r.x,r.z]);if(!branch)spine.push(r);return r;}
  const has=(a,b)=>roomLinks.some(([x,y])=>(x===a&&y===b)||(x===b&&y===a));
  function link(a,b){if(a!==b&&!has(a,b))roomLinks.push([a,b]);}
  const rows=floorType==='mixed'?5:4+(Math.random()<.55?1:0);
  let cur=addRoom(2,0,false,'room');cur.kind='start';cur.hx=cur.hz=1;
  for(let row=1;row<=rows;row++){
    const layout=floorType==='mixed'?['hall','narrow','corridor','room','hall'][(row-1)%5]:sewer?'corridor':row%3===0?'hall':Math.random()<.46?'corridor':Math.random()<.28?'narrow':'room';
    let next=addRoom(cur.sx,row,false,layout);link(cur,next);cur=next;
    if(row<rows&&row>1&&Math.random()<(sewer?.10:.44)){const dirs=[-1,1].filter(d=>cur.sx+d>=1&&cur.sx+d<=4&&!occupied.has(key(cur.sx+d,row)));if(dirs.length){next=addRoom(cur.sx+dirs[Math.random()*dirs.length|0],row,false,'room');link(cur,next);cur=next;addPattern('corner');}}
  }
  cur.kind='exit';cur.layout='room';exitCell=[cur.x,cur.z];addPattern('straight');addPattern('enfilade');
  const main=spine.slice(1,-1),shuffle=a=>a.slice().sort(()=>Math.random()-.5);
  function sideNode(r,d,layout='room'){const x=r.sx+d;if(x<0||x>5||occupied.has(key(x,r.sz)))return null;const s=addRoom(x,r.sz,true,layout,r.sequence||r.parentSequence);link(r,s);return s;}
  // A side ladder creates either a ring or an obligatory detour when its central edge is removed.
  let ladders=0;
  if(!sewer){for(const [a,b] of shuffle(roomLinks)){if(ladders>=2||a.kind==='start'||b.kind==='exit'||a.sx!==b.sx||a.branch||b.branch)continue;
    const options=shuffle([-1,1]).filter(d=>a.sx+d>=0&&a.sx+d<=5&&!occupied.has(key(a.sx+d,a.sz))&&!occupied.has(key(b.sx+d,b.sz)));if(!options.length)continue;
    const v=options[0],x=sideNode(a,v,'corridor'),y=sideNode(b,v,'corridor');if(!x||!y)continue;link(x,y);ladders++;
    if(ladders===1&&Math.random()<.55){roomLinks=roomLinks.filter(([p,q])=>!((p===a&&q===b)||(p===b&&q===a)));addPattern('broken');}
    else{addPattern('ring');addPattern('loop');addPattern('double');}
  }}
  const target=sewer?2:Math.min(6,4+Math.floor((floor-1)/5));
  for(const r of shuffle(main)){if(branchNumber>=target)break;const dirs=shuffle([-1,1]);for(const d of dirs){if(branchNumber>=target)break;const s=sideNode(r,d,Math.random()<.4?'narrow':'room');if(s&&Math.random()<.34){s.secret=true;addPattern('secret');}if(sewer||Math.random()<.52)break;}}
  if(!sewer){for(const r of shuffle(main)){if(rooms.length>25)break;const degree=roomLinks.filter(([a,b])=>a===r||b===r).length;if(degree>=3&&r.layout==='hall')continue;if(Math.random()<.44){const s=sideNode(r,-1)||sideNode(r,1);if(s&&Math.random()<.4)s.secret=true;}}}
  // Mark room roles from real graph degree. Hidden rooms are never required for the exit.
  const degree=r=>roomLinks.filter(([a,b])=>a===r||b===r).length;
  for(const r of rooms){const d=degree(r),adj=roomLinks.filter(([a,b])=>a===r||b===r).map(([a,b])=>a===r?b:a);if(d===4){r.layout='hall';r.hx=r.hz=2;addPattern('cross');addPattern('hall');}else if(d===3){addPattern('tee');if(r.layout==='hall')addPattern('hall');}if(d===1&&r.branch){addPattern('deadend');if(!r.secret&&Math.random()<.28){r.falseExit=true;addPattern('falseexit');}}if(r.layout==='narrow'){r.hx=adj.every(q=>q.x===r.x)?0:1;r.hz=adj.every(q=>q.z===r.z)?0:1;addPattern('narrow');}if(r.layout==='corridor')addPattern('straight');if(r.layout==='hall'&&d>=3)addPattern('hall');if(d===2&&adj[0].x!==adj[1].x&&adj[0].z!==adj[1].z)addPattern('corner');}
  const dead=rooms.filter(r=>r.branch&&degree(r)===1);if(dead.length&&!dead.some(r=>r.falseExit)){dead[0].falseExit=true;dead[0].secret=false;addPattern('falseexit');}if(dead.length>1&&!dead.some(r=>r.secret)){const r=dead.find(r=>!r.falseExit);if(r){r.secret=true;addPattern('secret');}}
  // Internal block: three separate connected subspaces in a side room, with an offset wall.
  if(!sewer){const inner=rooms.find(r=>r.branch&&!r.secret&&!r.falseExit&&degree(r)===1);if(inner){inner.hx=inner.hz=2;inner.layout='nested';inner.innerWall=true;addPattern('nested');}}
  for(const r of rooms)for(let x=r.x-r.hx;x<=r.x+r.hx;x++)for(let z=r.z-r.hz;z<=r.z+r.hz;z++)grid[gidx(x,z)]=0;
  for(const r of rooms){if(r.innerWall){for(const [dx,dz] of [[-1,-2],[-1,-1],[-1,1],[-1,2],[1,-2],[1,-1],[1,1],[1,2]])grid[gidx(r.x+dx,r.z+dz)]=1;}}
  for(const [a,b] of roomLinks){
    const dx=Math.sign(b.x-a.x),dz=Math.sign(b.z-a.z);
    for(let n=0;n<=6;n++)grid[gidx(a.x+dx*n,a.z+dz*n)]=0;
  }
  const next=roomLinks.find(([a,b])=>a===rooms[0]||b===rooms[0]);
  const first=next[0]===rooms[0]?next[1]:next[0];
  startYaw=Math.atan2(startCell[0]-first.x,startCell[1]-first.z);
  routeDist=distanceField(...exitCell);
}

function wallAt(x,z){
  const i = Math.floor(x/BLOCK), j = Math.floor(z/BLOCK);
  if (i<0||i>=GW||j<0||j>=GW) return true;
  return grid[j*GW+i]===1;
}
function circleHits(x,z,r){
  for(let i=Math.floor((x-r)/BLOCK);i<=Math.floor((x+r)/BLOCK);i++)
    for(let j=Math.floor((z-r)/BLOCK);j<=Math.floor((z+r)/BLOCK);j++){
      if(i<0||j<0||i>=GW||j>=GW) return true;
      if(!grid[gidx(i,j)]) continue;
      const dx=x-clamp(x,i*BLOCK,(i+1)*BLOCK), dz=z-clamp(z,j*BLOCK,(j+1)*BLOCK);
      if(dx*dx+dz*dz<r*r) return true;
    }
  return false;
}
const cellCX = i => (i+0.5)*BLOCK;

function bfs(si,sj,ti,tj){
  if ([si,sj,ti,tj].some(v=>!Number.isInteger(v)||v<0||v>=GW)) return null;
  if (si===ti && sj===tj) return grid[gidx(si,sj)]===0 ? [[si,sj]] : null;
  const N = GW*GW;
  const prev = new Int32Array(N).fill(-2);
  const start = gidx(si,sj), goal = gidx(ti,tj);
  if (grid[start]!==0 || grid[goal]!==0) return null;

  const q = new Int32Array(N);
  let head=0, tail=0;
  q[tail++] = start; prev[start] = -1;

  while (head<tail){
    const cur = q[head++];
    if (cur===goal) break;
    const ci = cur%GW, cj = (cur/GW)|0;
    for (let d=0;d<4;d++){
      const ni = ci+DIRS4[d][0], nj = cj+DIRS4[d][1];
      if (ni<0||ni>=GW||nj<0||nj>=GW) continue;
      const nid = nj*GW+ni;
      if (grid[nid]!==0 || prev[nid]!==-2) continue;
      prev[nid] = cur;
      q[tail++] = nid;
    }
  }
  if (prev[goal]===-2) return null;

  const path = [];
  let cur = goal;
  while (cur!==-1 && cur!==start){
    path.push([cur%GW, (cur/GW)|0]);
    cur = prev[cur];
  }
  path.push([si,sj]);
  path.reverse();
  return path;
}
