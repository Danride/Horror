/* ==========================================================
   ТОПОР — ВЗМАХ СЛЕВА НАПРАВО
   ========================================================== */
const woodMat  = new THREE.MeshLambertMaterial({ color: 0x6b4a2a });
const metalMat = new THREE.MeshLambertMaterial({ color: 0x8f95a3 });
const edgeMat  = new THREE.MeshLambertMaterial({ color: 0xc8d0dc });

const axePivot = new THREE.Group();
axePivot.rotation.order = 'YXZ';
const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(78,1,.05,10);
viewScene.add(viewCamera);viewCamera.add(axePivot);
viewScene.add(new THREE.AmbientLight(0xb4a898,1.6));
const viewLight=new THREE.PointLight(0xffc79b,4.5,5,1.6);viewLight.position.set(-.6,1,-.45);viewScene.add(viewLight);
function resizeView(){viewCamera.aspect=camera.aspect;viewCamera.updateProjectionMatrix();}
resizeView();window.addEventListener('resize',resizeView);

const axe = new THREE.Group();
axePivot.add(axe);
// Stylized low-poly fire axe viewmodel, vertical handle and a clearly visible steel head.
const haftShape=new THREE.Shape();
haftShape.moveTo(-.042,-.14);haftShape.lineTo(.043,-.14);haftShape.lineTo(.054,.08);haftShape.lineTo(.04,.40);haftShape.lineTo(.038,.74);haftShape.lineTo(-.039,.76);haftShape.lineTo(-.054,.43);haftShape.lineTo(-.05,.10);haftShape.closePath();
const haft=new THREE.Mesh(new THREE.ExtrudeGeometry(haftShape,{depth:.065,bevelEnabled:false}),woodMat);haft.position.z=-.032;axe.add(haft);
const woodDark=new THREE.MeshLambertMaterial({color:0x473020});
const woodLight=new THREE.MeshLambertMaterial({color:0x9b6941});
for(let n=0;n<4;n++){const strip=new THREE.Mesh(new THREE.BoxGeometry(.009,.48,.004),n%2?woodLight:woodDark);strip.position.set(-.029+n*.017,.40,.035);axe.add(strip);}
const redSteel=new THREE.MeshLambertMaterial({color:0x7e211e,flatShading:true});
const darkSteel=new THREE.MeshLambertMaterial({color:0x3b3f42,flatShading:true});
function axeFace(coords,mat,depth,z){
  const sh=new THREE.Shape();sh.moveTo(...coords[0]);for(const p of coords.slice(1))sh.lineTo(...p);sh.closePath();
  const m=new THREE.Mesh(new THREE.ExtrudeGeometry(sh,{depth,bevelEnabled:false}),mat);m.position.z=z;axe.add(m);return m;
}
// The blade face is in the XY plane, not edge-on to the player's view.
axeFace([[-.34,.63],[-.27,.84],[-.12,.88],[.11,.82],[.15,.75],[.10,.69],[-.12,.69],[-.28,.54],[-.38,.55]],redSteel,.105,-.052);
axeFace([[-.34,.63],[-.27,.84],[-.31,.87],[-.40,.66],[-.43,.53],[-.38,.55]],edgeMat,.105,-.052);
axeFace([[.10,.69],[.15,.75],[.11,.82],[.21,.82],[.24,.76],[.21,.70]],darkSteel,.13,-.065);
const eyeBand=new THREE.Mesh(new THREE.BoxGeometry(.13,.18,.14),metalMat);eyeBand.position.set(0,.738,0);axe.add(eyeBand);
const gripMat=new THREE.MeshLambertMaterial({color:0x292929});
const gripCore=new THREE.Mesh(new THREE.BoxGeometry(.107,.27,.095),gripMat);gripCore.position.set(0,.015,0);axe.add(gripCore);
for(let i=0;i<6;i++){const wrap=new THREE.Mesh(new THREE.BoxGeometry(.113,.024,.102),darkSteel);wrap.position.set(0,-.10+i*.039,0);axe.add(wrap);}
const gloveMat=new THREE.MeshLambertMaterial({color:0x474c4a}),cuffMat=new THREE.MeshLambertMaterial({color:0x273130});
const hand=new THREE.Mesh(new THREE.BoxGeometry(.17,.19,.18),gloveMat);hand.position.set(.015,-.015,.055);axe.add(hand);
for(let i=0;i<4;i++){const finger=new THREE.Mesh(new THREE.BoxGeometry(.044,.055,.11),gloveMat);finger.position.set(-.066+i*.037,.045,.015);axe.add(finger);}
const thumb=new THREE.Mesh(new THREE.BoxGeometry(.055,.12,.08),gloveMat);thumb.position.set(-.09,.005,.075);thumb.rotation.z=-.36;axe.add(thumb);
const sleeve=new THREE.Mesh(new THREE.BoxGeometry(.19,.22,.43),cuffMat);sleeve.position.set(.042,-.13,.21);sleeve.rotation.x=-.28;axe.add(sleeve);
const AXE_BASE={px:.60,py:-.78,pz:-1.15,rx:-.12,ry:-.18,rz:-.24};

let swinging = false, swingT = 0, swingHit = false;
const SWING_DUR = 0.60;

function startSwing(){
  if (swinging || gameState !== 'playing' || scareTime>0 || descending || hidden) return;
  swinging = true; swingT = 0; swingHit = false;
  noise(0.14, 0.05, 1500, 1.8);
  tone(260, 0.10, 'sine', 0.03);
}

function updateAxe(dt){
  if (swinging){
    swingT += dt / SWING_DUR;
    if (!swingHit && swingT >= 0.44){ swingHit = true; doAxeHit(); noise(.17,.08,950,1); }
    if (swingT >= 1){ swingT = 0; swinging = false; }
  }

  let px, py, pz, rx, ry, rz;
  const b = AXE_BASE;
  const sw = swinging ? swingT : 0;

  if (!swinging){
    // покачивание при ходьбе
    const sway = Math.sin(player.bob) * 0.012 * Math.min(1, Math.hypot(player.vx, player.vz)/3);
    px = b.px + sway;
    py = b.py + Math.abs(sway)*0.5;
    pz = b.pz;
    rx = b.rx; ry = b.ry; rz = b.rz;
  } else if (sw <= 0.22){
    // замах влево
    const t = sw/0.22;
    const e = t*t*(3-2*t);
    px = lerp(b.px, .89, e);py = lerp(b.py, -.52, e);pz = lerp(b.pz,-.86,e);
    rx = lerp(b.rx,-.30,e);ry=lerp(b.ry,-.60,e);rz=lerp(b.rz,-.95,e);
  } else if (sw <= 0.58){
    // взмах слева направо
    const t = (sw-0.22)/0.36;
    const e = 1 - Math.pow(1-t, 1.7);
    px = lerp(.89,-.56,e);py = lerp(-.52,-.88,e);pz = lerp(-.86,-1.17,e);
    rx = lerp(-.30,.35,e);ry=lerp(-.60,.70,e);rz=lerp(-.95,1.30,e);
  } else {
    // возврат
    const t = (sw-0.58)/0.42;
    const e = t*t*(3-2*t);
    px=lerp(-.56,b.px,e);py=lerp(-.88,b.py,e);pz=lerp(-1.17,b.pz,e);
    rx=lerp(.35,b.rx,e);ry=lerp(.70,b.ry,e);rz=lerp(1.30,b.rz,e);
  }

  axePivot.position.set(px, py, pz);
  axePivot.rotation.set(rx, ry, rz);

  crossEl.classList.toggle('swing', swinging && swingT>0.22 && swingT<0.58);
}

function doAxeHit(){
  const fwd = new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);
  const fx = fwd.x, fz = fwd.z;
  const fl = Math.hypot(fx,fz) || 1;
  const nx = fx/fl, nz = fz/fl;

  let hitSomething = false;

  for (const m of monsters.slice().sort((a,b)=>a.pos.distanceToSquared(camera.position)-b.pos.distanceToSquared(camera.position))){
    if (m.dead || m.type==='gnome' || (m.type==='multi'&&m.ceilingState!=='ground') || !m.mesh.visible) continue;
    const dx = m.pos.x - camera.position.x;
    const dz = m.pos.z - camera.position.z;
    const dist = Math.hypot(dx,dz);
    if (dist > 2.25 || dist<.001 || Math.abs(pitch)>1.12 || !hasLOS(player.x,player.z,m.pos.x,m.pos.z)||closedDoorBetween(player.x,player.z,m.pos.x,m.pos.z)) continue;

    const dot = (dx/dist)*nx + (dz/dist)*nz;
    if (dot < 0.48) continue;

    hitSomething = true;
    m.hp -= 1;
    m.alert = Math.max(m.alert || 0, 9);

    spawnParticles(new THREE.Vector3(m.pos.x, 1.3, m.pos.z), 0x8a0d0d, 10, 3);
    tone(95, 0.20, 'sawtooth', 0.09, 45);
    noise(0.14, 0.11, 420, 0.8);
    shakeAmt = Math.max(shakeAmt, 0.5);

    // отбрасывание
    const tx=m.pos.x+(dx/dist)*.48,tz=m.pos.z+(dz/dist)*.48;
    if(!circleHits(tx,m.pos.z,.32))m.pos.x=tx;
    if(!circleHits(m.pos.x,tz,.32))m.pos.z=tz;
    m.attackT=0;m.atkCd=.42;m.hitT=m.cfg.hit;
    m.path = null; m.pathTimer = 0;

    if (m.hp <= 0) killMonster(m);
    break;
  }

  if (!hitSomething) noise(0.09, 0.04, 800, 1.2);
}
