/* ==========================================================
   РЕЖИССЁР СОБЫТИЙ — предметы, звуки, темнота и ловушки
   ========================================================== */
const eventGroup=new THREE.Group();scene.add(eventGroup);
const shadowGroup=new THREE.Group();scene.add(shadowGroup);const shadowMat=new THREE.MeshBasicMaterial({color:0x101415});let apparition=null;
let eventChairs=[],echoSteps=[],eventTimer=12,blackoutT=0,blackoutRoom=null,lastEventRoom=null,lastEventKind='',eventCount=0,grannyReturnT=-1,gnomeCooldown=0;
let runCompleted=0,floorProgress=0,bestDistance=0;
const RECORD_KEY='palata13.bestDistance.v1';
try{const stored=Number(localStorage.getItem(RECORD_KEY));if(Number.isFinite(stored)&&stored>=0&&stored<1e9)bestDistance=Math.floor(stored);}catch{}
function saveDistanceRecord(value){const n=Math.floor(Math.max(0,value));if(n>bestDistance){bestDistance=n;try{localStorage.setItem(RECORD_KEY,String(n));}catch{}}}
function updateDistance(){
  const x=Math.floor(player.x/BLOCK),z=Math.floor(player.z/BLOCK),total=Math.max(0,routeDist[gidx(...startCell)]),left=routeDist[gidx(x,z)];
  if(left>=0)floorProgress=Math.max(floorProgress,clamp((total-left)*BLOCK,0,total*BLOCK));
  saveDistanceRecord(runCompleted+floorProgress);
}
function createEventChair(r){
  const g=new THREE.Group(),wood=propMat(0x68503c),metal=propMat(0x454d4b),legs=[];eventGroup.add(g);
  propBox(g,wood,0,.61,0,.72,.115,.70);for(const x of [-.29,.29]){propBox(g,wood,x,.98,.29,.085,.72,.085);for(const z of [-.27,.27]){const p=new THREE.Group();p.position.set(x,.56,z);g.add(p);propBox(p,metal,0,-.275,0,.078,.55,.078);legs.push(p);}}
  propBox(g,wood,0,1.30,.29,.68,.19,.09);propBox(g,wood,0,1.07,.29,.68,.13,.09);
  let best=null;const sides=freeRoomSides(r),allSides=[...sides,...['E','W','S','N'].filter(s=>!sides.includes(s))],obstacles=furnitureColliders.concat(anomalies.map(a=>new THREE.Box3().setFromObject(a.group)));
  for(const side of allSides)for(const offset of [-1,1,0,-.45,.45]){
    const b=snapRoomWall(r,g,side,offset,.09);let score=0;
    for(const f of obstacles){const x=Math.min(b.max.x+.12,f.max.x)-Math.max(b.min.x-.12,f.min.x),z=Math.min(b.max.z+.12,f.max.z)-Math.max(b.min.z-.12,f.min.z);if(x>0&&z>0)score+=x*z+1;}
    if(!sides.includes(side)){const cx=cellCX(r.x),cz=cellCX(r.z);if(side==='E'||side==='W'){if(b.min.z<cz+1.0&&b.max.z>cz-1.0)score+=20;}else if(b.min.x<cx+1.0&&b.max.x>cx-1.0)score+=20;}
    if(!best||score<best.score)best={side,offset,score};
  }
  if(!best||best.score>0){eventGroup.remove(g);disposeTree(g);return null;}
  const collider=snapRoomWall(r,g,best.side,best.offset,.09);if(!clearBoxInRoom(collider)||roomReservedHit(r,collider)){eventGroup.remove(g);return null;}furnitureColliders.push(collider);return {room:r,mesh:g,legs,collider,state:'idle',t:0,stepT:0,path:[],x:g.position.x,z:g.position.z};
}
function placeHospitalEvents(){
  disposeTree(eventGroup);clearApparition();eventChairs=[];echoSteps=[];eventTimer=rnd(8,13);blackoutT=0;blackoutRoom=null;lastEventRoom=null;lastEventKind='';eventCount=0;grannyReturnT=-1;gnomeCooldown=0;
  const main=rooms.filter(r=>!r.branch&&r.kind!=='start'&&r.kind!=='exit');const side=rooms.filter(r=>r.branch);
  // Chairs are ordinary static objects until the director triggers an encounter.
  for(const r of [...main.slice(0,6),...side,...main.slice(6)]){if(eventChairs.length>=6)break;if(r.layout==='nested'||r.layout==='narrow'||zoneIndex()===3)continue;const c=createEventChair(r);if(c)eventChairs.push(c);}
}
const baseEventsPlacement=placeAnomalies;placeAnomalies=function(){baseEventsPlacement();placeHospitalEvents();};
function startChair(c){if(!c||c.haunted||c.state!=='idle')return false;c.state='ready';c.t=rnd(.45,1.0);return true;}
function updateChair(c,dt){
  if(c.state==='ready'){c.t-=dt;if(c.t>0)return;const neighbors=roomLinks.filter(([a,b])=>a===c.room||b===c.room).map(([a,b])=>a===c.room?b:a);if(!neighbors.length){c.state='idle';return;}
    const target=neighbors.sort((a,b)=>Math.hypot(player.x-cellCX(b.x),player.z-cellCX(b.z))-Math.hypot(player.x-cellCX(a.x),player.z-cellCX(a.z)))[0];
    c.path=bfs(Math.floor(c.mesh.position.x/BLOCK),Math.floor(c.mesh.position.z/BLOCK),target.x,target.z)||[];if(!c.path.length){c.state='idle';return;}c.state='running';c.t=0;c.stepT=0;const colliderIndex=furnitureColliders.indexOf(c.collider);if(colliderIndex>=0)furnitureColliders.splice(colliderIndex,1);anomalyVoice('chair',c.mesh.position.x,c.mesh.position.z,.75);
  }
  if(c.state!=='running')return;c.t+=dt;c.stepT-=dt;
  const g=c.mesh,p=g.position,w=c.path[0];
  if(w){const tx=cellCX(w[0]),tz=cellCX(w[1]),dx=tx-p.x,dz=tz-p.z,len=Math.hypot(dx,dz);
    if(len<.13)c.path.shift();else{const s=Math.min(len,dt*6.6),nx=p.x+dx/len*s,nz=p.z+dz/len*s;let wait=false;
      for(const d of doors)if(Math.hypot(p.x-d.x,p.z-d.z)<1.4&&d.amount<.72){if(!d.zombie)d.open=true;wait=true;}
      if(!wait){if(!circleHits(nx,p.z,.20))p.x=nx;if(!circleHits(p.x,nz,.20))p.z=nz;}
      const angle=Math.atan2(-dx,-dz),delta=Math.atan2(Math.sin(angle-g.rotation.y),Math.cos(angle-g.rotation.y));g.rotation.y+=delta*Math.min(1,dt*15);
    }
    g.position.y=.065+.085*Math.abs(Math.sin(c.t*17));g.rotation.z=Math.sin(c.t*14)*.045;c.legs.forEach((l,i)=>{l.rotation.x=Math.sin(c.t*21+(i%2?Math.PI:0)+(i>=2?Math.PI:0))*.65;});
    if(c.stepT<=0){c.stepT=.19;spatialStep({pos:p,type:'granny'},.5);}
  }
  if(!c.path.length||c.t>9){c.state='gone';g.visible=false;}
}
function clearApparition(){if(apparition){shadowGroup.remove(apparition.mesh);disposeRig(apparition.mesh);apparition=null;}}
function spawnApparition(r){if(apparition)return false;const mesh=makeCreature(floor%2?'granny':'buried');mesh.traverse(o=>{if(o.isMesh)o.material=shadowMat;});mesh.position.set(cellCX(r.x),0,cellCX(r.z));mesh.rotation.y=Math.atan2(mesh.position.x-player.x,mesh.position.z-player.z);shadowGroup.add(mesh);apparition={mesh,life:rnd(1.6,2.7),look:0};return true;}
function updateApparition(dt){if(!apparition)return;const a=apparition,p=a.mesh.position,dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),dot=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(.01,d);a.life-=dt;if(dot>.965&&hasLOS(player.x,player.z,p.x,p.z))a.look+=dt;else a.look=0;if(a.life<=0||a.look>.65||d<3){clearApparition();return;}poseCreature(a.mesh,'idle',dt,.55);}
function triggerHospitalEvent(r,forced=null){
  if(!r||hidden)return false;const px=player.x,pz=player.z;
  const visible=(x,z,max=10)=>Math.hypot(x-px,z-pz)<max&&hasLOS(px,pz,x,z)&&!closedDoorBetween(px,pz,x,z);
  const choices=[];const chairs=eventChairs.filter(c=>!c.haunted&&c.state==='idle'&&(c.room===r||visible(c.x,c.z,8))&&Math.hypot(c.x-px,c.z-pz)>1.3);
  if(chairs.length)choices.push('chair','chair');if(gnomeCooldown<=0&&!monsters.some(m=>m.type==='gnome'&&!m.dead))choices.push('gnome','gnome','gnome');choices.push('blackout','echo','echo');
  const shadows=rooms.filter(q=>q!==r&&Math.hypot(cellCX(q.x)-px,cellCX(q.z)-pz)>7&&visible(cellCX(q.x),cellCX(q.z),21)&&(-Math.sin(yaw)*(cellCX(q.x)-px)-Math.cos(yaw)*(cellCX(q.z)-pz))/Math.hypot(cellCX(q.x)-px,cellCX(q.z)-pz)>.48);if(shadows.length&&!apparition)choices.push('shadow');
  const slams=doors.filter(d=>d.open&&d.amount>.9&&Math.hypot(d.x-px,d.z-pz)>2&&Math.hypot(d.x-px,d.z-pz)<10);if(slams.length)choices.push('slam');
  const options=choices.filter(x=>x!==lastEventKind),kind=forced||(options.length?options:choices)[Math.random()*(options.length||choices.length)|0];
  if(kind==='chair'){if(!chairs.length)return false;startChair(chairs[Math.random()*chairs.length|0]);}
  else if(kind==='gnome'){if(!spawnGnome(r))return false;}
  else if(kind==='blackout') {blackoutRoom=r;blackoutT=rnd(2.2,4.8)+Math.min(1.8,floor*.15);anomalyDim=Math.max(anomalyDim,.9);noise(.22,.045,420,1.1);tone(48,.8,'sine',.045,36);}
  else if(kind==='shadow'){if(!shadows.length||!spawnApparition(shadows[Math.random()*shadows.length|0]))return false;}
  else if(kind==='slam'){if(!slams.length)return false;const d=slams[Math.random()*slams.length|0];d.open=false;anomalyVoice('door',d.x,d.z,.86);spatialStep({pos:{x:d.x,z:d.z},type:'buried'},1.25);}
  else{const near=rooms.filter(q=>q!==r&&Math.hypot(cellCX(q.x)-px,cellCX(q.z)-pz)<23);if(near.length){const q=near[Math.random()*near.length|0],path=bfs(q.x,q.z,r.x,r.z)||[];for(let i=0;i<Math.min(6,path.length);i++){const p=path[i];echoSteps.push({t:.25+i*.48,x:cellCX(p[0]),z:cellCX(p[1])});}}else anomalyVoice('unknown',px+4,pz,.45);}
  lastEventKind=kind;eventCount++;return true;
}
function updateHospitalEvents(dt){
  blackoutT=Math.max(0,blackoutT-dt);gnomeCooldown=Math.max(0,gnomeCooldown-dt);
  for(const c of eventChairs)updateChair(c,dt);updateApparition(dt);
  for(let i=echoSteps.length-1;i>=0;i--){const e=echoSteps[i];e.t-=dt;if(e.t<=0){spatialStep({pos:{x:e.x,z:e.z},type:'buried'},.55);echoSteps.splice(i,1);}}
  const r=roomAt(player.x,player.z);if(r&&r!==lastEventRoom){lastEventRoom=r;if(r.kind!=='start'&&eventCount<2)eventTimer=Math.min(eventTimer,rnd(1.6,4.0));}
  eventTimer-=dt;
  if(eventTimer<=0&&r&&r.kind!=='start'&&!hidden&&threatWarning<=0&&threatLife<=0){
    // Early encounters show distinct physical events; further ones are mixed with silence and sound.
    let ok=false;if(eventCount===0)ok=triggerHospitalEvent(r,Math.random()<.50?'chair':'gnome');else if(eventCount===1)ok=triggerHospitalEvent(r,lastEventKind==='gnome'?'chair':'gnome');if(!ok)ok=triggerHospitalEvent(r);
    const pace=Math.min(.48,(floor-1)*.035);eventTimer=ok?rnd(13,24)*(1-pace):4;
  }
}
const baseHospitalLights=updateLights;updateLights=function(dt){baseHospitalLights(dt);if(blackoutT>0&&blackoutRoom){const cx=cellCX(blackoutRoom.x),cz=cellCX(blackoutRoom.z);for(const l of lightPool)if(Math.hypot(l.position.x-cx,l.position.z-cz)<8)l.intensity*=.025;if(Math.hypot(player.x-cx,player.z-cz)<8)playerLight.intensity*=.47;}};
/* Decoy doors. */
const extrasGroup=new THREE.Group();scene.add(extrasGroup);let exitDoor=null,fakeDoors=[];
function fakeDoor(r,side){const q=wallDoorTransform(r,side),g=new THREE.Group();g.position.set(q.x,0,q.z);g.rotation.y=q.angle;extrasGroup.add(g);const frame=propMat(0x55564c),panel=propMat(r.falseExit?0x888273:ward().doors),dark=propMat(0x16191a),hinge=new THREE.Group();hinge.position.x=-.82;g.add(hinge);
  propBox(g,frame,0,1.42,0,1.88,2.84,.14);propBox(g,dark,0,1.34,-.09,1.62,2.63,.055);propBox(hinge,panel,.82,1.34,-.13,1.64,2.66,.10);propBox(hinge,frame,1.42,1.2,-.22,.13,.085,.10);
  const x=q.x-Math.sin(q.angle)*.60,z=q.z-Math.cos(q.angle)*.60;return {x,z,room:r,group:g,hinge,opened:false,t:0};}
function activateFake(d){if(d.opened){showMsg('ЗА ДВЕРЬЮ СТЕНА.',1.5);return;}d.opened=true;d.t=0;anomalyVoice('door',d.x,d.z,.65);showMsg('ЗА ДВЕРЬЮ НИЧЕГО НЕТ.',2);if(Math.random()<.5){blackoutRoom=d.room;blackoutT=1.7;}}
function buildExtras(){disposeTree(extrasGroup);fakeDoors=[];
  const pool=rooms.filter(r=>r.kind!=='start'&&r.kind!=='exit').sort(()=>Math.random()-.5);
  const decoys=pool.slice().sort((a,b)=>Number(b.falseExit)-Number(a.falseExit));for(const r of decoys){if(fakeDoors.length>=Math.min(4,2+Math.floor((floor-1)/5)))break;if(r.layout==='nested'||r.layout==='narrow')continue;for(const side of freeRoomSides(r)){const q=wallDoorTransform(r,side),dirX=Math.sin(q.angle),dirZ=Math.cos(q.angle),x=q.x-dirX*1.05,z=q.z-dirZ*1.05;const zone={min:{x:Math.min(x,q.x)-.98,z:Math.min(z,q.z)-.98},max:{x:Math.max(x,q.x)+.98,z:Math.max(z,q.z)+.98}};if(circleHits(x,z,.35)||furnitureColliders.some(b=>boxesOverlapXZ(b,zone))||anomalies.some(a=>Math.hypot(a.x-x,a.z-z)<1.35))continue;fakeDoors.push(fakeDoor(r,side));break;}}
}
const buildAllRooms=placeAnomalies;placeAnomalies=function(){buildAllRooms();buildExtras();};
const baseUpdateHospitalEvents=updateHospitalEvents;updateHospitalEvents=function(dt){baseUpdateHospitalEvents(dt);for(const f of fakeDoors)if(f.opened){f.t=Math.min(1,f.t+dt*2.4);f.hinge.rotation.y=Math.PI*.48*f.t;}};
const baseHud=updateHUD;
