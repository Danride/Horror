/* Encounter director: authored assets, one key monster and optional regulars. */
const importedAxe=BB_MODELS.axe;
for(const child of axe.children.slice())if(child!==hand&&child!==thumb&&child!==sleeve&&child.material!==gloveMat)axe.remove(child);
const axeTexture=new THREE.TextureLoader().load(importedAxe.texture);axeTexture.colorSpace=THREE.SRGBColorSpace;axeTexture.magFilter=axeTexture.minFilter=THREE.NearestFilter;axeTexture.generateMipmaps=false;
const axeAsset=new THREE.Mesh(buildBoneGeometry(importedAxe.elements,[0,0,0],importedAxe.width,importedAxe.height),new THREE.MeshLambertMaterial({map:axeTexture,emissive:0x222222,emissiveIntensity:.18}));
axeAsset.scale.setScalar(.035);axeAsset.position.y=-.17;axe.add(axeAsset);

let residentType=null,eventCabinets=[],hospitalChairs=[];
const isKey=m=>m.type==='granny'||m.type==='multi';
const isZombie=m=>m.type==='patient'||m.type==='orderly';
const pick=items=>items.length?items[Math.random()*items.length|0]:null;
function placeResident(type,r){
  if(!r||monsters.some(m=>!m.dead&&isKey(m)))return null;
  const m=makeMonster(type,new THREE.Vector3(cellCX(r.x),0,cellCX(r.z)));
  if(type==='multi'){m.ceilingState='ceiling';m.pos.y=WALL_H-.07;const dx=r.hx>0?rnd(.65,1.1)*(Math.random()<.5?-1:1):0,dz=r.hz>0?rnd(.6,1.05)*(Math.random()<.5?-1:1):0;if(!circleHits(m.pos.x+dx,m.pos.z+dz,.35)){m.pos.x+=dx;m.pos.z+=dz;}m.mesh.position.copy(m.pos);m.mesh.rotation.x=Math.PI;m.angle=rnd(0,Math.PI*2);const rig=m.mesh.userData.rig;rig.model.scale.y=rig.asset.scale*.28;rig.model.traverse(o=>{if(o.isMesh){o.material=o.material.clone();o.material.color.setHex(0x777777);o.userData.ceilingShade=true;}});}
  if(type==='granny'){m.roamTime=0;m.roamStarted=false;}
  monsters.push(m);return m;
}
function lockerFront(l){const angle=l.group.rotation.y;return {x:l.x-Math.sin(angle)*.95,z:l.z-Math.cos(angle)*.95};}
function freeLocker(l){const p=lockerFront(l);return !l.occupied&&l.room.kind!=='start'&&!circleHits(p.x,p.z,.28)&&!furnitureHit(p.x,p.z);}
function zombieMode(roll=Math.random()){const r=ENCOUNTER_RULES;return roll<r.zombieDoor?'door':roll<r.zombieDoor+r.zombieLocker?'locker':roll<r.zombieDoor+r.zombieLocker+r.zombieWandering?'wander':'buried';}
function spawnRegular(mode,usedRooms=new Set()){
  const pool=rooms.filter(r=>r.kind==='normal'&&!usedRooms.has(r)),r=pick(pool)||pick(rooms.filter(q=>q.kind==='normal'));if(!r)return null;
  const type=mode==='buried'?'buried':Math.random()<.55?'patient':'orderly';let pos=new THREE.Vector3(cellCX(r.x),0,cellCX(r.z)),d=null,l=null;
  if(mode==='door'){d=pick(doors.filter(q=>!q.zombie&&q.a.kind!=='start'&&q.b.kind!=='start'))||pick(doors.filter(q=>!q.zombie));if(d){const dx=Math.sign(d.b.x-d.a.x),dz=Math.sign(d.b.z-d.a.z);pos.set(d.x+dx*1.5,0,d.z+dz*1.5);}else mode='wander';}
  if(mode==='locker'){l=pick(lockers.filter(freeLocker));if(l){pos.set(l.x,0,l.z);l.occupied=true;}else mode='wander';}
  const m=makeMonster(type,pos);m.mode=mode==='door'?'door-wait':mode==='locker'?'locker-wait':'wander';m.concealed=!!(d||l);m.mesh.visible=!m.concealed;m.door=d;m.locker=l;m.role='regular';m.patrol=null;if(d)d.zombie=m;monsters.push(m);usedRooms.add(r);return m;
}
function spawnFloorMonsters(){
  residentType=floor===1?'granny':floor===2?'multi':Math.random()<.5?'granny':'multi';
  const main=rooms.filter(r=>!r.branch&&r.kind==='normal'),mid=main.slice(Math.max(0,Math.floor(main.length*.32)),Math.max(1,Math.ceil(main.length*.8))),r=mid[Math.random()*mid.length|0]||main[0]||rooms[1];
  placeResident(residentType,r);const used=new Set([r]),count=Math.floor(Math.random()*(ENCOUNTER_RULES.maximumRegulars+1));for(let i=0;i<count;i++)spawnRegular(zombieMode(),used);
}
function onPlayerOpenDoor(d){
  d.autoBlock=0;const m=d.zombie;if(!m||m.dead||m.mode!=='door-wait')return;
  const sign=d.axis==='x'?(player.x<d.x?1:-1):(player.z<d.z?1:-1);m.pos.set(d.x+(d.axis==='x'?sign*1.5:0),0,d.z+(d.axis==='z'?sign*1.5:0));m.mesh.position.copy(m.pos);m.angle=Math.atan2(m.pos.x-player.x,m.pos.z-player.z);m.mode='door-reveal';m.revealT=0;m.concealed=false;d.zombie=null;
}
function chooseZombieHide(m){
  const here=roomAt(m.pos.x,m.pos.z),candidates=lockers.filter(l=>freeLocker(l)&&l.room!==here&&Math.hypot(l.x-player.x,l.z-player.z)>8).map(l=>({l,d:Math.hypot(l.x-m.pos.x,l.z-m.pos.z)})).sort((a,b)=>a.d-b.d);
  const target=pick(candidates.slice(0,Math.min(3,candidates.length)));if(target){m.locker=target.l;m.locker.occupied=true;m.hideRoom=target.l.room;return;}
  m.hideRoom=pick(rooms.filter(r=>r!==here&&r.kind==='normal'&&Math.hypot(cellCX(r.x)-player.x,cellCX(r.z)-player.z)>8))||pick(rooms.filter(r=>r!==here));
}
function zombieCharge(m){
  const rig=m.mesh.userData.rig;
  m.emergingLocker=m.locker||null;
  if(m.emergingLocker){const l=m.emergingLocker,p=lockerFront(l);m.emergeFrom=new THREE.Vector3(l.x,0,l.z);m.emergeTo=new THREE.Vector3(p.x,0,p.z);m.pos.copy(m.emergeFrom);l.target=1;rig.model.scale.y=rig.asset.scale*.65;}
  m.concealed=!!m.emergingLocker;m.mode='emerge';m.emergeT=0;m.alert=12;m.lastSeen=[Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK)];m.path=null;m.pathTimer=0;playSample('zombieCry',()=>m.pos,.95,m);turnMonster(m,player.x,player.z,1);m.locker=null;
}
function updateZombie(m,dt){
  if(m.mode==='door-wait'){m.alert=0;return 0;}
  if(m.mode==='door-reveal'){
    if(m.door.amount<.50){m.concealed=true;return 0;}m.concealed=false;
    if(m.revealT===0)playSample('zombieCry',()=>m.pos,1.0,m);m.revealT+=dt;poseCreature(m.mesh,'alert',dt,1,Math.min(.5,m.revealT));
    if(m.revealT>.50){m.mode='flee';m.fleeT=0;m.path=null;m.pathTimer=0;m.fleeDoors=new Set([m.door]);chooseZombieHide(m);}return 0;
  }
  if(m.mode==='flee'){
    m.alert=0;m.chasing=false;m.fleeT+=dt;const r=m.hideRoom;let moved=0;
    if(r){const center=Math.hypot(m.pos.x-cellCX(r.x),m.pos.z-cellCX(r.z));if(!m.atHideRoom&&center<.5){m.atHideRoom=true;m.path=null;}
      if(!m.atHideRoom)moved=followMonsterPath(m,[r.x,r.z],Math.max(4.5,m.cfg.run+.8),dt);
      else if(m.locker){const p=lockerFront(m.locker);moved=moveMonster(m,p.x,p.z,3.6,dt);if(Math.hypot(m.pos.x-p.x,m.pos.z-p.z)<.3){m.mode='hidden';m.concealed=true;m.locker.target=.08;m.pos.set(m.locker.x,0,m.locker.z);}}
      else if(m.atHideRoom){m.mode='hidden';m.mesh.userData.rig.model.scale.y=m.mesh.userData.rig.asset.scale*.68;}}
    for(const d of m.fleeDoors){if(Math.hypot(m.pos.x-d.x,m.pos.z-d.z)>2.0){d.open=false;d.autoBlock=1.6;m.fleeDoors.delete(d);anomalyVoice('door',d.x,d.z,.56);}}
    if(m.fleeT>35&&m.mode==='flee'){if(m.locker){m.locker.occupied=false;m.locker=null;}m.mode='hidden';m.mesh.userData.rig.model.scale.y=m.mesh.userData.rig.asset.scale*.68;}
    poseCreature(m.mesh,moved>.001?'run':'idle',dt,1.15);return moved;
  }
  if(m.mode==='locker-wait'||m.mode==='hidden'){
    m.alert=0;m.chasing=false;const p=m.locker?lockerFront(m.locker):m.pos,dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),look=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(d,.01);
    if(d<(m.mode==='locker-wait'?2.5:3.4)&&(m.mode==='locker-wait'||look>.55||d<1.1)&&hasLOS(player.x,player.z,p.x,p.z)&&!closedDoorBetween(player.x,player.z,p.x,p.z))zombieCharge(m);
    else poseCreature(m.mesh,'idle',dt,.5);return 0;
  }
  if(m.mode==='emerge'){
    m.emergeT+=dt;const rig=m.mesh.userData.rig,progress=clamp((m.emergeT-.12)/.40,0,1);
    if(m.emergingLocker){m.concealed=m.emergeT<.12;m.pos.copy(m.emergeFrom).lerp(m.emergeTo,progress);rig.model.scale.y=rig.asset.scale*lerp(.65,1,progress);}
    else rig.model.scale.y=rig.asset.scale*lerp(.68,1,clamp(m.emergeT/.52,0,1));
    poseCreature(m.mesh,'alert',dt,1,Math.min(.6,m.emergeT));
    if(m.emergeT>.52){if(m.emergingLocker)m.emergingLocker.occupied=false;m.emergingLocker=null;m.concealed=false;m.mode='attack';m.atkCd=.1;rig.model.scale.y=rig.asset.scale;}return 0;
  }
  return null;
}
const ordinaryEnemyUpdate=updateEnemy;
updateEnemy=function(m,dt){
  if(isZombie(m)){const handled=updateZombie(m,dt);if(handled!==null)return handled;}
  if(m.type==='multi'&&m.ceilingState!=='ground'){
    const distance=Math.hypot(player.x-m.pos.x,player.z-m.pos.z);
    if(m.ceilingState==='ceiling'){
      poseCreature(m.mesh,'idle',dt,.65);if(distance<ENCOUNTER_RULES.multiCeilingRadius&&hasLOS(m.pos.x,m.pos.z,player.x,player.z)&&!closedDoorBetween(m.pos.x,m.pos.z,player.x,player.z)){m.ceilingState='laugh';m.dropTime=0;playSample('multiLaugh',()=>m.pos,.80,m);}
    }else if(m.ceilingState==='laugh'){
      m.dropTime+=dt;poseCreature(m.mesh,'shriek',dt,1,m.dropTime);if(m.dropTime>=.85){m.ceilingState='dropping';m.dropTime=0;}
    }else{
      m.dropTime+=dt;const t=clamp(m.dropTime/.48,0,1);m.pos.y=(WALL_H-.07)*(1-t*t);m.mesh.rotation.x=Math.PI*(1-t);turnMonster(m,player.x,player.z,dt);const rig=m.mesh.userData.rig;rig.model.scale.y=rig.asset.scale*lerp(.28,1,t);
      poseCreature(m.mesh,'shriek',dt,1,m.dropTime);if(t>=1){m.ceilingState='ground';m.mesh.rotation.x=0;m.pos.y=0;m.alert=12;m.lastSeen=[Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK)];m.atkCd=.45;rig.model.traverse(o=>{if(o.isMesh&&o.userData.ceilingShade){o.material.dispose();o.material=rig.asset.material;o.userData.ceilingShade=false;}});spatialStep(m,1.8);playSample('multiRoar',()=>m.pos,.9,m);shakeAmt=Math.max(shakeAmt,.65);}
    }return 0;
  }
  if(m.type==='granny'&&!m.roamStarted){const d=Math.hypot(player.x-m.pos.x,player.z-m.pos.z);if(d<m.cfg.detect&&hasLOS(m.pos.x,m.pos.z,player.x,player.z)&&!closedDoorBetween(m.pos.x,m.pos.z,player.x,player.z)){m.roamStarted=true;m.roamTime=rnd(7,12);m.roamElapsed=0;}else{m.wait=Math.max(0,m.wait-dt);if(!m.patrol)m.patrol=selectPatrol(m);let moved=m.wait>0?0:followMonsterPath(m,m.patrol,m.cfg.walk,dt);if(m.patrol&&Math.hypot(m.pos.x-cellCX(m.patrol[0]),m.pos.z-cellCX(m.patrol[1]))<.24){m.patrol=null;m.path=null;m.wait=rnd(.4,1.7);}poseCreature(m.mesh,moved>.002?'walk':'idle',dt);return moved;}}
  return ordinaryEnemyUpdate(m,dt);
};
const oldResolveGranny=resolveGrannyRoam;resolveGrannyRoam=function(m,roll=Math.random()){const attacking=oldResolveGranny(m,roll);if(attacking)m.lastSeen=[Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK)];return attacking;};
function chooseGnomeGoal(m,r){const available=rooms.filter(q=>q!==r&&Math.hypot(cellCX(q.x)-m.pos.x,cellCX(q.z)-m.pos.z)>4);const q=pick(available);return q?[q.x,q.z]:null;}
function spawnGnome(r){
  if(!r)return null;const candidates=[];for(let x=r.x-r.hx;x<=r.x+r.hx;x++)for(let z=r.z-r.hz;z<=r.z+r.hz;z++){const px=cellCX(x),pz=cellCX(z),d=Math.hypot(px-player.x,pz-player.z);if(d>1.6&&!circleHits(px,pz,.25)&&!furnitureHit(px,pz))candidates.push([px,pz]);}const p=pick(candidates)||[cellCX(r.x),cellCX(r.z)];
  const m=makeMonster('gnome',new THREE.Vector3(p[0],0,p[1]));m.gnomeTime=rnd(13,23);m.gnomeElapsed=0;m.patrol=chooseGnomeGoal(m,r);monsters.push(m);playSample('gnome',()=>m.pos,.82,m);return m;
}
updateMonsters=function(dt){
  for(const d of doors){d.autoBlock=Math.max(0,(d.autoBlock||0)-dt);if(!d.autoBlock){for(const m of monsters){if(m.dead||m.concealed||m.ceilingState&&m.ceilingState!=='ground'||Math.hypot(m.pos.x-d.x,m.pos.z-d.z)>1.4||d.zombie&&m.mode!=='flee')continue;d.open=true;if(m.mode==='flee')m.fleeDoors.add(d);}}d.amount=clamp(d.amount+(d.open?dt*2.7:-dt*5),0,1);d.hinge.rotation.y=-d.amount*Math.PI*.49;}
  for(const l of lockers){l.amount=lerp(l.amount,l.target,Math.min(1,dt*7));l.hinge.rotation.y=l.amount*Math.PI*.54;}
  const r=roomAt(player.x,player.z);if(r&&r!==currentRoom){currentRoom=r;if(!visitedRooms.has(r.id)){visitedRooms.add(r.id);if(Math.random()<ENCOUNTER_RULES.gnomePerRoom)spawnGnome(r);}}
  if(residentType==='granny'&&grannyReturnT>=0){grannyReturnT=Math.max(0,grannyReturnT-dt);if(grannyReturnT===0&&!monsters.some(m=>!m.dead&&isKey(m))){const candidates=rooms.filter(q=>q.kind!=='start'&&Math.hypot(cellCX(q.x)-player.x,cellCX(q.z)-player.z)>6);const q=pick(candidates);if(q){const m=placeResident('granny',q);if(m){m.roamStarted=true;m.roamTime=rnd(7,12);m.roamElapsed=0;grannyReturnT=-1;}}}}
  threatWarning=threatLife=0;baseMonsterUpdate(dt);monsters=monsters.filter(m=>!m.dead);
};
