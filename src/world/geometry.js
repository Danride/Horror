/* ==========================================================
   ПОСТРОЙКА МИРА
   ========================================================== */
const mazeGroup = new THREE.Group();
scene.add(mazeGroup);

const wallMaterial = new THREE.MeshLambertMaterial({ map: wallTex, vertexColors: true });
const floorMaterial = new THREE.MeshLambertMaterial({ map: floorTex, color: 0x8a8a8a });
const ceilMaterial  = new THREE.MeshLambertMaterial({ map: ceilTex,  color: 0x555555 });

const FACE_DEFS = [
  { d:[ 1,0], n:[ 1,0,0], v:[[1,0,0],[1,1,0],[1,1,1],[1,0,1]], sh:0.86 },
  { d:[-1,0], n:[-1,0,0], v:[[0,0,1],[0,1,1],[0,1,0],[0,0,0]], sh:0.86 },
  { d:[ 0,1], n:[0,0, 1], v:[[0,0,1],[1,0,1],[1,1,1],[0,1,1]], sh:0.98 },
  { d:[ 0,-1],n:[0,0,-1], v:[[1,0,0],[0,0,0],[0,1,0],[1,1,0]], sh:0.98 },
];
const UVS = [0,0, 1,0, 1,1, 0,1];

function buildMazeMesh(){
  while (mazeGroup.children.length){
    const m = mazeGroup.children[0]; mazeGroup.remove(m);
    if (m.geometry) m.geometry.dispose();
  }

  const pos=[], nor=[], col=[], uv=[], idx=[];
  let vc=0;

  for (let j=0;j<GW;j++){
    for (let i=0;i<GW;i++){
      if (grid[gidx(i,j)]!==1) continue;
      const variation = 0.82 + ((i*73+j*149)%100)/100*0.34;
      for (const F of FACE_DEFS){
        const ni=i+F.d[0], nj=j+F.d[1];
        if (ni>=0 && ni<GW && nj>=0 && nj<GW && grid[gidx(ni,nj)]===1) continue;
        const s = F.sh*variation;
        for (let k=0;k<4;k++){
          const c = F.v[k];
          pos.push((i+c[0])*BLOCK, c[1]*WALL_H, (j+c[2])*BLOCK);
          nor.push(F.n[0],F.n[1],F.n[2]);
          col.push(s,s,s);
          uv.push(UVS[k*2], UVS[k*2+1]);
        }
        idx.push(vc,vc+1,vc+2, vc,vc+2,vc+3);
        vc += 4;
      }
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos,3));
  geo.setAttribute('normal',   new THREE.Float32BufferAttribute(nor,3));
  geo.setAttribute('color',    new THREE.Float32BufferAttribute(col,3));
  geo.setAttribute('uv',       new THREE.Float32BufferAttribute(uv,2));
  geo.setIndex(idx);
  geo.computeBoundingSphere();
  mazeGroup.add(new THREE.Mesh(geo, wallMaterial));

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(WORLD,WORLD), floorMaterial);
  floor.rotation.x = -Math.PI/2;
  floor.position.set(WORLD/2, 0, WORLD/2);
  mazeGroup.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(WORLD,WORLD), ceilMaterial);
  ceil.rotation.x = Math.PI/2;
  ceil.position.set(WORLD/2, WALL_H, WORLD/2);
  mazeGroup.add(ceil);
}

/* ---------- лампы ---------- */
const lampGroup = new THREE.Group();
scene.add(lampGroup);
let lamps = [];
const bulbGeo  = new THREE.BoxGeometry(0.32,0.24,0.32);
const shadeGeo = new THREE.BoxGeometry(0.52,0.09,0.52);
const cordGeo  = new THREE.BoxGeometry(0.05,0.34,0.05);
const darkMat  = new THREE.MeshLambertMaterial({ color: 0x1a1a20 });

function placeLamps(){
  while (lampGroup.children.length){
    const m = lampGroup.children[0]; lampGroup.remove(m);
    if (m.material && m.material !== darkMat) m.material.dispose();
  }
  lamps = [];

  const chosen=roomCells.filter((c,i)=>isSafeFloor()||i===0||rooms[i]?.kind==='exit'||Math.random()<(rooms[i]?.branch ? .47 : .72));
  if(floorType==='corridor'){for(let z=7;z<=35;z+=4)chosen.push([15,z]);}
  if(floorType==='hall'){for(const x of [11,19])for(const z of [12,18])chosen.push([x,z]);}
  for(const [a,b] of roomLinks)if(Math.random()<.35)chosen.push([(a.x+b.x)/2,(a.z+b.z)/2]);

  for (const [i,j] of chosen){
    const x = cellCX(i), z = cellCX(j);

    const cord = new THREE.Mesh(cordGeo, darkMat);
    cord.position.set(x, WALL_H-0.17, z);
    lampGroup.add(cord);

    const shade = new THREE.Mesh(shadeGeo, darkMat);
    shade.position.set(x, WALL_H-0.40, z);
    lampGroup.add(shade);

    const mat = new THREE.MeshBasicMaterial({ color: 0xffcc88 });
    const bulb = new THREE.Mesh(bulbGeo, mat);
    bulb.position.set(x, WALL_H-0.58, z);
    lampGroup.add(bulb);

    lamps.push({
      pos: new THREE.Vector3(x, WALL_H-0.85, z),
      mat, phase: Math.random()*10,
      dropT: rnd(0.4,6), dropDur: 0, cur: 1
    });
  }
}

/* ---------- лестница вниз ---------- */
function makeGlowTexture(){
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(s/2,s/2,0, s/2,s/2,s/2);
  grd.addColorStop(0,'rgba(230,210,255,1)');
  grd.addColorStop(0.22,'rgba(150,110,240,.8)');
  grd.addColorStop(0.55,'rgba(80,40,150,.28)');
  grd.addColorStop(1,'rgba(0,0,0,0)');
  g.fillStyle = grd;
  g.fillRect(0,0,s,s);
  return new THREE.CanvasTexture(c);
}
const glowTex = makeGlowTexture();

const stairsGroup = new THREE.Group();
scene.add(stairsGroup);
let stairsPos = new THREE.Vector3();

function disposeTree(root){
  const gs=new Set(),ms=new Set();root.traverse(o=>{if(o.geometry)gs.add(o.geometry);if(o.material)ms.add(o.material);});
  gs.forEach(g=>g.dispose());ms.forEach(m=>m.dispose());root.clear();
}
function placeStairs(){
  disposeTree(stairsGroup);
  const [ei,ej]=exitCell,r=rooms.find(q=>q.x===ei&&q.z===ej);
  const side=freeRoomSides(r).includes('S')?'S':freeRoomSides(r)[0];
  const g=new THREE.Group();stairsGroup.add(g);const pos=wallDoorTransform(r,side);g.position.set(pos.x,0,pos.z);g.rotation.y=pos.angle;
  const frame=propMat(0x49483e),yellow=propMat(0xe2b53c),handle=propMat(0x77736a);
  propBox(g,frame,0,1.40,0,1.96,2.80,.15);propBox(g,yellow,0,1.35,-.11,1.71,2.60,.13);propBox(g,handle,.61,1.17,-.22,.15,.085,.11);
  stairsPos.set(pos.x-Math.sin(pos.angle)*.65,0,pos.z-Math.cos(pos.angle)*.65);
  exitDoor={x:stairsPos.x,z:stairsPos.z,room:r,side,group:g};stairsLight.position.set(0,-100,0);stairsLight.intensity=0;
}

/* ---------- ПРОЦЕДУРНЫЕ АНОМАЛИИ ---------- */
const anomalyGroup=new THREE.Group();scene.add(anomalyGroup);
let anomalies=[], anomalyTextures=[], anomalyDim=0;
const ANOMALY_TYPES=['chair','tv','clock','door','bricks'];
function propBox(parent,mat,x,y,z,w,h,d){
  const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),mat);m.position.set(x,y,z);parent.add(m);return m;
}
function propMat(color,emissive=0){
  return new THREE.MeshLambertMaterial({color,emissive});
}
function staticTexture(){
  const c=document.createElement('canvas');c.width=32;c.height=24;
  const ctx=c.getContext('2d'), image=ctx.createImageData(32,24),tex=new THREE.CanvasTexture(c);
  tex.colorSpace=THREE.SRGBColorSpace;tex.magFilter=tex.minFilter=THREE.NearestFilter;tex.generateMipmaps=false;
  function redraw(){
    for(let i=0;i<32*24;i++){
      const v=Math.random()<.075?230:rnd(8,85),k=i*4;
      image.data[k]=v*.7;image.data[k+1]=v;image.data[k+2]=v*.80;image.data[k+3]=255;
    }
    // A faint horizontal burst appears and vanishes on the television.
    const y=Math.random()*24|0;
    for(let x=0;x<32;x++){const k=(y*32+x)*4;image.data[k]=145;image.data[k+1]=170;image.data[k+2]=148;}
    ctx.putImageData(image,0,0);tex.needsUpdate=true;
  }
  redraw();anomalyTextures.push(tex);return {tex,redraw};
}
function anomalyVoice(kind,x,z,level=1){
  if(kind==='door'&&audioBuffers.has('doorOpen')){playSample('doorOpen',{x,z},level*.72);return;}
  if(!actx||actx.state!=='running'||!master)return;
  const dx=x-player.x,dz=z-player.z,dist=Math.hypot(dx,dz);if(dist>24)return;
  const audible=hasLOS(player.x,player.z,x,z), gain=(1-dist/25)**1.35*(audible?1:.32)*level;
  const pan=actx.createStereoPanner(), low=actx.createBiquadFilter(), now=actx.currentTime;
  pan.pan.value=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,dist),-1,1);
  low.type='lowpass';low.frequency.value=audible?4500:600;low.connect(pan);pan.connect(master);
  function pulse(freq,dur,volume,delay=0,slide=0,type='triangle'){
    const start=now+delay,e=actx.createGain(),o=actx.createOscillator();
    o.type=type;o.frequency.setValueAtTime(freq,start);
    if(slide)o.frequency.exponentialRampToValueAtTime(slide,start+dur);
    e.gain.setValueAtTime(.0001,start);e.gain.linearRampToValueAtTime(Math.max(.0002,volume*gain),start+.012);
    e.gain.exponentialRampToValueAtTime(.0001,start+dur);o.connect(e);e.connect(low);o.start(start);o.stop(start+dur+.02);
  }
  function rasp(freq,dur,volume,delay=0,q=1){
    const start=now+delay,src=actx.createBufferSource(),f=actx.createBiquadFilter(),e=actx.createGain();
    src.buffer=getNoise();src.loop=true;f.type='bandpass';f.frequency.value=freq;f.Q.value=q;
    e.gain.setValueAtTime(.0001,start);e.gain.linearRampToValueAtTime(Math.max(.0002,volume*gain),start+.025);
    e.gain.exponentialRampToValueAtTime(.0001,start+dur);
    src.connect(f);f.connect(e);e.connect(low);src.start(start);src.stop(start+dur+.02);
  }
  if(kind==='chair'){
    for(const d of [0,.25,.62]){pulse(116,.17,.055,d,52,'sine');rasp(220,.16,.065,d,1.5);}
    rasp(910,.8,.045,.2,2);
  } else if(kind==='tv'){
    rasp(1850,1.25,.078,0,1.8);rasp(460,.7,.055,.18,2);
    pulse(192,.67,.03,.08,96,'sawtooth');pulse(343,.42,.025,.55,242,'triangle');
  } else if(kind==='clock'){
    for(let i=0;i<6;i++){pulse(i%2?1180:920,.075,.04,i*.12,520,'triangle');rasp(1700,.07,.035,i*.12,2.5);}
    pulse(178,.48,.023,.72,62,'sine');
  } else if(kind==='door'){
    pulse(57,1.7,.085,0,32,'sine');pulse(61,1.4,.04,0,38,'triangle');rasp(360,1.6,.055,.05,1.3);
    rasp(1250,.64,.025,.54,2.1);
  } else if(kind==='bricks'){
    for(const d of [0,.15,.4]){rasp(125,.28,.075,d,1);pulse(80,.29,.055,d,32,'sine');}
  } else {
    // Distant scrape, knocks or a breath with no visible source.
    const r=Math.random();
    if(r<.34){for(const t of [0,.3,.62]){pulse(85,.18,.055,t,39,'sine');rasp(260,.18,.026,t);}}
    else if(r<.67){rasp(1050,1.2,.04,0,2.6);rasp(460,.75,.025,.25,2.1);}
    else {pulse(104,1.5,.047,0,49,'triangle');pulse(178,1.2,.020,.1,57,'sine');rasp(380,.9,.035,.2,1.2);}
  }
}
function placeAnomalies(){
  disposeTree(anomalyGroup);for(const tex of anomalyTextures)tex.dispose();
  anomalyTextures=[];anomalies=[];anomalyDim=0;
  if(isSafeFloor())return;
  const options=rooms.filter(r=>r.kind!=='start'&&r.kind!=='exit');
  for(let i=options.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[options[i],options[j]]=[options[j],options[i]];}
  const kinds=ANOMALY_TYPES.slice();
  for(let i=kinds.length-1;i>0;i--){const j=Math.random()*(i+1)|0;[kinds[i],kinds[j]]=[kinds[j],kinds[i]];}
  const amount=Math.min(options.length,3+(Math.random()<.65?1:0)+(floor>3?1:0));
  for(let i=0;i<amount;i++){
    const room=options[i],kind=kinds[i%kinds.length];if(!['hall','corridor'].includes(floorType))room.kind=kind;
    const sx=Math.random()<.5?-1:1,sz=Math.random()<.5?-1:1;
    // Corners keep the passage through every room clear, even in the smallest room.
    const x=cellCX(room.x)+sx*(room.hx+.06)*BLOCK,z=cellCX(room.z)+sz*(room.hz+.06)*BLOCK;
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=Math.atan2(x-cellCX(room.x),z-cellCX(room.z));anomalyGroup.add(g);
    const a={kind,x,z,group:g,phase:rnd(0,Math.PI*2),t:0,seen:false,near:false,soundT:rnd(5,12),pivot:new THREE.Group(),flicker:0};
    g.add(a.pivot);const p=a.pivot;
    const wood=propMat(0x4e3528),metal=propMat(0x4f5252),black=propMat(0x171819),rust=propMat(0x553c33);
    if(kind==='chair'){
      propBox(p,wood,0,.61,0,.76,.11,.75);
      for(const ix of [-1,1])for(const iz of [-1,1])propBox(p,wood,ix*.31,.31,iz*.31,.10,.64,.10);
      for(const ix of [-1,1])propBox(p,wood,ix*.31,1.01,.31,.10,.82,.10);
      propBox(p,wood,0,1.32,.31,.72,.23,.09);propBox(p,wood,0,1.05,.31,.72,.13,.09);
      p.position.y=1.65;a.description='СТУЛ ВИСИТ ВОЗДУХЕ';
    } else if(kind==='tv'){
      propBox(g,metal,0,.42,0,1.08,.10,.75);
      for(const ix of [-1,1])for(const iz of [-1,1])propBox(g,metal,ix*.44,.21,iz*.29,.08,.42,.08);
      propBox(p,black,0,0,0,1.03,.72,.67);propBox(p,rust,-.42,0,-.35,.12,.69,.06);propBox(p,rust,.42,0,-.35,.12,.69,.06);
      const tv=staticTexture();a.static=tv;
      const screen=new THREE.Mesh(new THREE.PlaneGeometry(.74,.52),new THREE.MeshBasicMaterial({map:tv.tex,side:THREE.DoubleSide}));
      screen.position.set(0,0,-.342);p.add(screen);screen.rotation.y=Math.PI;
      for(const s of [-1,1]){const ant=propBox(p,metal,s*.17,.57,0,.035,.48,.035);ant.rotation.z=s*-.55;}
      p.position.y=1.18;a.description='ТЕЛЕВИЗОР РАБОТАЕТ БЕЗ ПРОВОДОВ';
    } else if(kind==='clock'){
      const disc=new THREE.Mesh(new THREE.CylinderGeometry(.57,.57,.14,16),rust);disc.rotation.x=Math.PI/2;p.add(disc);
      const face=new THREE.Mesh(new THREE.CylinderGeometry(.49,.49,.025,16),propMat(0x9a9180));face.rotation.x=Math.PI/2;face.position.z=-.083;p.add(face);
      for(let k=0;k<12;k++){const rad=k*Math.PI/6;const mark=propBox(p,black,Math.sin(rad)*.42,Math.cos(rad)*.42,-.104,.035,.075,.018);mark.rotation.z=-rad;}
      a.hands=[];
      for(const len of [.28,.39]){const hand=new THREE.Group();hand.position.z=-.139;propBox(hand,black,0,len*.45,0,.042,len,.035);p.add(hand);a.hands.push(hand);}
      p.position.y=2.2;a.description='ЧАСЫ ИДУТ НАЗАД';
    } else if(kind==='door'){
      propBox(g,metal,-.63,1.18,0,.13,2.36,.20);propBox(g,metal,.63,1.18,0,.13,2.36,.20);propBox(g,metal,0,2.39,0,1.39,.17,.20);
      const voidMat=new THREE.MeshBasicMaterial({color:0x030205});
      const v=new THREE.Mesh(new THREE.PlaneGeometry(1.12,2.25),voidMat);v.position.set(0,1.13,.04);v.material.side=THREE.DoubleSide;g.add(v);
      a.hinge=new THREE.Group();a.hinge.position.set(-.54,1.13,-.11);p.add(a.hinge);
      propBox(a.hinge,wood,.54,0,0,1.06,2.22,.10);propBox(a.hinge,metal,.91,-.10,-.08,.10,.1,.1);
      const glow=new THREE.Mesh(new THREE.PlaneGeometry(.055,2.14),new THREE.MeshBasicMaterial({color:0x60487d,side:THREE.DoubleSide}));glow.position.set(.54,1.08,-.13);g.add(glow);
      g.position.y=.03;a.description='ЗА ДВЕРЬЮ НЕТ ПОМЕЩЕНИЯ';
    } else {
      a.pieces=[];for(let k=0;k<7;k++){
        const m=propBox(p,k%2?rust:metal,rnd(-.38,.38),rnd(-.7,.65),rnd(-.36,.36),rnd(.17,.42),rnd(.16,.34),rnd(.19,.40));
        a.pieces.push({m,y:m.position.y,phase:rnd(0,6.28)});
      }
      p.position.y=1.85;a.description='КАМНИ НЕ ПАДАЮТ';
    }
    anomalies.push(a);
  }
  // Ordinary rooms get low, unobtrusive crates and pipes instead of more hazards.
  for(const r of rooms.filter(r=>r.kind==='normal')){
    const g=new THREE.Group();g.position.set(cellCX(r.x)+.7*BLOCK,0,cellCX(r.z)+.7*BLOCK);anomalyGroup.add(g);
    const mat=propMat(0x514638);propBox(g,mat,0,.27,0,.61,.54,.58);
    propBox(g,propMat(0x25292b),0,.55,0,.65,.08,.62);
  }
}
function updateAnomalies(dt){
  anomalyDim=Math.max(0,anomalyDim-dt);
  for(const a of anomalies){
    a.t+=dt;const t=a.t+a.phase,p=a.pivot,d=Math.hypot(a.x-player.x,a.z-player.z);
    if(a.kind==='chair'){p.position.y=1.65+.16*Math.sin(t*1.4);p.rotation.x=Math.sin(t*.77)*.28+2.6;p.rotation.z=Math.sin(t*.9)*.26;}
    else if(a.kind==='tv'){p.position.y=1.18+.15*Math.sin(t*1.8);p.rotation.z=.06*Math.sin(t*1.4);a.flicker+=dt;if(a.flicker>.115&&d<18){a.flicker=0;a.static.redraw();}}
    else if(a.kind==='clock'){p.position.y=2.2+.09*Math.sin(t);p.rotation.z=.08*Math.sin(t*.8);a.hands[0].rotation.z=t*.55;a.hands[1].rotation.z=t*3.6;}
    else if(a.kind==='door'){a.hinge.rotation.y=-(.18+.75*(.5+.5*Math.sin(t*.85)));}
    else for(const q of a.pieces){q.m.position.y=q.y+Math.sin(t*1.6+q.phase)*.23;q.m.rotation.set(t*.34+q.phase,t*.42,t*.21);}
    a.soundT-=dt;
    const near=d<4.8&&hasLOS(player.x,player.z,a.x,a.z);
    if(near&&!a.near){
      if(!a.seen){a.seen=true;showMsg(a.description,3.4,true);anomalyVoice(a.kind,a.x,a.z,.9);if(a.kind==='door'||a.kind==='tv')anomalyDim=.9;}
      else if(a.soundT<0){anomalyVoice(a.kind,a.x,a.z,.66);a.soundT=rnd(9,17);}
    }
    if(d<12&&a.soundT<=0){anomalyVoice(a.kind,a.x,a.z,.58);a.soundT=rnd(10,21);}
    a.near=near;
  }
}
