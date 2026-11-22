/* ==========================================================
   БОЛЬНИЦА — ОТДЕЛЕНИЯ, ДВЕРИ, РЕДКИЕ ВСТРЕЧИ
   ========================================================== */
const WARDS=[
 {name:'БОЛЬНИЦА',top:[185,182,169],bottom:[98,128,115],floor:[130,133,124],light:0xd0e0da,doors:0x55665c,labels:['Регистратура','Палата','Осмотровая','Ожидание']},
 {name:'ХИРУРГИЯ',top:[156,170,159],bottom:[88,112,105],floor:[116,120,111],light:0xced9cd,doors:0x396c66,labels:['Операционная','Стерилизация','Перевязочная','Анестезия']},
 {name:'МОРГ',top:[126,136,143],bottom:[69,78,88],floor:[79,85,94],light:0xa7b9d1,doors:0x444d56,labels:['Морг','Холодильная','Секционная','Архив']},
 {name:'КАНАЛИЗАЦИЯ',top:[82,85,77],bottom:[48,57,47],floor:[59,66,52],light:0xa7b599,doors:0x514a37,labels:['Коллектор','Насосная','Дренаж','Тоннель']},
 {name:'ЗОНА БОССА',top:[105,95,92],bottom:[62,49,50],floor:[78,68,67],light:0xc39888,doors:0x4f3836,labels:['Изолятор','Карантин','Камера','Барьер']}
];
const SAFE_WARD={name:'ТИХИЙ ЭТАЖ',top:[240,237,228],bottom:[216,219,215],floor:[215,218,208],light:0xfff6e4,doors:0xb2b5af,labels:['Регистрация','Зал ожидания']};
const YELLOW_WARD={name:'ЖЁЛТЫЕ КОМНАТЫ',top:[213,184,76],bottom:[180,151,53],floor:[168,146,74],light:0xffd978,doors:0x9c8244,labels:['Комната']};
const zoneIndex=()=>0;const ward=()=>floorType==='safe'?SAFE_WARD:floorType==='yellow'?YELLOW_WARD:WARDS[0];
const hospitalGroup=new THREE.Group();scene.add(hospitalGroup);
let hospitalTextures=[],doors=[],lockers=[],furnitureColliders=[],hidden=null,visitedRooms=new Set(),currentRoom=null,threatWarning=0,threatLife=0,threatCooldown=0,threatCount=0,interactHeld=false;
const baseBuildMaze=buildMazeMesh;
buildMazeMesh=function(){
  document.body.classList?.toggle('safe-floor',isSafeFloor());
  const w=ward(),oldW=wallMaterial.map,oldF=floorMaterial.map,oldC=ceilMaterial.map;
  const zone=zoneIndex(),stains=Array.from({length:zone===1?8:2},()=>({x:rnd(0,64),y:rnd(14,64),rx:rnd(3,10),ry:rnd(3,17)}));
  wallMaterial.map=makeTex(64,(x,y)=>{const lower=y>34,b=lower?w.bottom:w.top;let v=rnd(-13,13);if(zone===3){if(y%10===0||(x+(Math.floor(y/10)%2)*8)%16===0)v-=28;if(y>44)v-=13;}else if(lower&&(x%16===0||y%12===0))v-=25;if(y===34||y===35)v-=22;if(zone===1&&stains.some(s=>((x-s.x)/s.rx)**2+((y-s.y)/s.ry)**2<rnd(.7,1.2)))return [94+v*.3,38+v*.3,34+v*.3];if(zone===2&&x%32===0)v-=22;if(zone===4&&stains.some(s=>((x-s.x)/s.rx)**2+((y-s.y)/s.ry)**2<1))v-=23;return b.map(c=>c+v);});
  floorMaterial.map=makeTex(32,(x,y)=>{const v=(x%16===0||y%16===0)?-35:rnd(-10,10)+((x>>4)+(y>>4))%2*13;if(zone===1&&((x-12)**2+(y-22)**2<42||((x-25)*1.8)**2+(y-8)**2<27))return [79+v*.25,35+v*.25,31+v*.25];if(zone===3&&x>8&&x<23)return [42+v*.2,55+v*.3,43+v*.25];return w.floor.map(c=>c+v);});
  floorMaterial.map.repeat.set(GW,GW);wallMaterial.needsUpdate=floorMaterial.needsUpdate=true;
  ceilMaterial.map=isSafeFloor()||floorType==='yellow'?makeTex(32,(x,y)=>{const v=x===0||y===0?-15:rnd(-4,4);return (isSafeFloor()?[220,218,210]:[201,176,90]).map(c=>c+v);}):ceilTex;ceilMaterial.map.repeat.set(GW,GW);ceilMaterial.color.setHex(isSafeFloor()||floorType==='yellow'?0xffffff:0x555555);ceilMaterial.needsUpdate=true;if(oldC!==ceilTex&&oldC!==ceilMaterial.map)oldC.dispose();
  if(oldW!==wallTex)oldW.dispose();if(oldF!==floorTex)oldF.dispose();
  baseBuildMaze();for(const l of lightPool)l.color.setHex(w.light);scene.fog.density=isSafeFloor()?.035:.079+zone*.009+Math.min(.020,(floor-1)*.0014);floorMaterial.color.setHex(isSafeFloor()?0xffffff:0x8a8a8a);scene.background.setHex(isSafeFloor()?0x545454:0x000000);scene.fog.color.setHex(isSafeFloor()?0x545454:0x000000);
};
// Select intact room walls, then align the real mesh bounding box with the wall plane.
function freeRoomSides(r){const used=new Set();for(const [a,b] of roomLinks){if(a!==r&&b!==r)continue;const q=a===r?b:a;used.add(q.x>r.x?'E':q.x<r.x?'W':q.z>r.z?'S':'N');}return ['E','W','S','N'].filter(s=>!used.has(s));}
function wallDoorTransform(r,side){const nx=side==='E'?1:side==='W'?-1:0,nz=side==='S'?1:side==='N'?-1:0;return {x:cellCX(r.x)+nx*((r.hx+.5)*BLOCK-.12),z:cellCX(r.z)+nz*((r.hz+.5)*BLOCK-.12),angle:Math.atan2(nx,nz)};}
function snapRoomWall(r,g,side,offset=1,margin=.045){
  const cx=cellCX(r.x),cz=cellCX(r.z),hx=(r.hx+.5)*BLOCK,hz=(r.hz+.5)*BLOCK;
  g.position.set(0,g.position.y,0);g.rotation.set(0,{E:Math.PI/2,W:-Math.PI/2,S:0,N:Math.PI}[side],0);g.updateMatrixWorld(true);
  const b=new THREE.Box3().setFromObject(g),w=b.max.x-b.min.x,d=b.max.z-b.min.z;
  const clampCenter=(half,halfObj,sign)=>sign*Math.max(0,half-halfObj-.24);
  if(side==='E'||side==='W'){g.position.x=side==='E'?cx+hx-b.max.x-margin:cx-hx-b.min.x+margin;g.position.z=cz+clampCenter(hz,d/2,offset)-(b.min.z+b.max.z)/2;}
  else{g.position.z=side==='S'?cz+hz-b.max.z-margin:cz-hz-b.min.z+margin;g.position.x=cx+clampCenter(hx,w/2,offset)-(b.min.x+b.max.x)/2;}
  g.updateMatrixWorld(true);return new THREE.Box3().setFromObject(g);
}
function safeFurniturePlacement(r,g,wanted,offset){
  const cx=cellCX(r.x),cz=cellCX(r.z),hx=(r.hx+.5)*BLOCK,hz=(r.hz+.5)*BLOCK;
  const reserved=[{min:{x:cx-.73,z:cz-.73},max:{x:cx+.73,z:cz+.73}}];
  for(const [a,b] of roomLinks){if(a!==r&&b!==r)continue;const q=a===r?b:a,tx=q.x>r.x?cx+hx:q.x<r.x?cx-hx:cx,tz=q.z>r.z?cz+hz:q.z<r.z?cz-hz:cz;
    reserved.push({min:{x:Math.min(cx,tx)-.72,z:Math.min(cz,tz)-.72},max:{x:Math.max(cx,tx)+.72,z:Math.max(cz,tz)+.72}});}
  if(r.kind==='exit'&&exitDoor){const x=exitDoor.x,z=exitDoor.z;reserved.push({min:{x:Math.min(cx,x)-1.15,z:Math.min(cz,z)-1.15},max:{x:Math.max(cx,x)+1.15,z:Math.max(cz,z)+1.15}});}
  let best=null;const sides=[wanted,...['E','W','S','N'].filter(s=>s!==wanted)];
  function overlap(a,b,gap=0){return Math.max(0,Math.min(a.max.x+gap,b.max.x)-Math.max(a.min.x-gap,b.min.x))*Math.max(0,Math.min(a.max.z+gap,b.max.z)-Math.max(a.min.z-gap,b.min.z));}
  for(const s of sides)for(const o of [offset,-offset,0,.45,-.45]){const b=snapRoomWall(r,g,s,o);const conflict=reserved.some(q=>overlap(b,q,.05)>0)||furnitureColliders.some(q=>overlap(b,q,.12)>0)||!clearBoxInRoom(b);if(!conflict){best={s,o};break;}}
  return best?snapRoomWall(r,g,best.s,best.o):null;
}
function clearBoxInRoom(b){for(let x=b.min.x+.025;x<=b.max.x+.001;x+=.20)for(let z=b.min.z+.025;z<=b.max.z+.001;z+=.20)if(wallAt(x,z))return false;return !wallAt(b.max.x-.025,b.max.z-.025)&&!wallAt(b.min.x+.025,b.max.z-.025)&&!wallAt(b.max.x-.025,b.min.z+.025);}
function hospitalFurniture(r,idx){
  if(r.layout==='nested'||r.layout==='narrow')return;
  const g=new THREE.Group();hospitalGroup.add(g);const sides=freeRoomSides(r),side=sides[0]||'E';
  const steel=propMat(0x626e70),white=propMat(0xabaeaa),fabric=propMat(ward().doors),dark=propMat(0x313b3d),wood=propMat(0x776e58);
  const box=(m,x,y,z,a,b,c)=>propBox(g,m,x,y,z,a,b,c);
  const k=zoneIndex();
  if(idx%7===1){box(steel,0,.91,0,1.24,.10,.62);for(const x of [-.52,.52])for(const z of [-.24,.24]){box(steel,x,.45,z,.06,.9,.06);box(dark,x,.075,z,.15,.15,.11);}box(steel,0,.47,0,1.20,.08,.60);for(let n=0;n<3;n++)box(white,-.38+n*.35,1.02,0,.25,.13,.34);}
  else if(idx%7===2){box(steel,0,.94,0,1.7,.15,.55);box(white,0,1.06,0,1.77,.1,.61);box(steel,0,.46,0,1.6,.85,.49);box(dark,0,1.13,-.1,.7,.1,.39);box(steel,.16,1.42,.15,.06,.48,.07);box(steel,.03,1.63,.15,.29,.06,.07);}
  else if(idx%7===3){box(steel,0,.17,0,.85,.14,.73);box(steel,0,1.2,0,.075,2.0,.075);box(steel,0,2.2,0,.64,.07,.07);box(white,.25,1.95,0,.27,.4,.07);box(dark,.25,1.68,0,.03,.19,.03);}
  else if(idx%7===4){box(steel,0,.52,0,2.1,.13,.54);box(fabric,0,.91,.24,2.1,.63,.11);for(const x of [-.9,0,.9])box(steel,x,.26,0,.08,.52,.49);}
  else if(idx%7===5){box(steel,0,.94,0,.85,.12,.61);box(dark,0,.44,0,.71,.85,.53);for(let n=0;n<3;n++){box(white,0,.21+n*.23,-.29,.73,.20,.045);box(steel,0,.23+n*.23,-.33,.19,.04,.055);}box(dark,0,1.18,0,.33,.36,.30);}
  else if(k===0&&idx%3!==0){box(steel,0,.52,0,1.08,.15,2.05);box(white,0,.67,0,1.04,.19,1.92);box(fabric,0,.79,-.19,1.03,.09,1.32);box(white,0,.83,.65,.62,.17,.4);for(const a of [-.43,.43])for(const b of [-.8,.8])box(steel,a,.26,b,.08,.52,.08);box(steel,0,.76,.99,1.1,.59,.08);}
  else if(k===1||k===2){box(steel,0,.48,0,.42,.96,.82);box(k===2?steel:dark,0,1.02,0,1.05,.11,2.02);if(k===1){box(white,0,1.11,-.5,.7,.11,.5);box(steel,.73,.8,.2,.09,1.6,.09);box(white,.73,1.42,.2,.3,.35,.2);}else{box(dark,0,.32,.74,.84,.32,.20);box(steel,0,1.19,.1,.87,.10,1.60);}}
  else if(k===3){box(steel,0,.32,.1,1.34,.64,.66);box(dark,0,.68,0,1.0,.12,.78);for(const n of [-.38,.38]){const pipe=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,2.5,8),steel);pipe.position.set(n,1.27,.32);g.add(pipe);}box(fabric,0,2.44,.32,1.05,.14,.35);}
  else if(k===4){box(steel,0,.5,0,1.5,1,.66);box(dark,0,1.05,0,1.55,.12,.72);for(let n=0;n<3;n++)box(n%2?fabric:dark,-.48+n*.36,1.27,0,.22,.36,.21);}
  else {box(wood,0,.53,0,1.45,1.06,.67);box(white,0,1.09,0,1.5,.12,.73);box(dark,.35,1.36,-.12,.48,.4,.22);for(let n=0;n<3;n++)box(white,-.45,1.17+n*.055,.07,.32,.035,.25);}
  const furniture=safeFurniturePlacement(r,g,side,-1);if(furniture)furnitureColliders.push(furniture);else hospitalGroup.remove(g);
  if(furniture&&k===0&&idx%3===0){const chair=new THREE.Group();hospitalGroup.add(chair);const m=propMat(0x57554b);propBox(chair,m,0,.49,0,.46,.09,.45);for(const x of [-.18,.18])for(const z of [-.17,.17])propBox(chair,m,x,.23,z,.055,.46,.055);propBox(chair,m,0,.76,.20,.43,.34,.07);chair.position.copy(g.position);chair.rotation.copy(g.rotation);chair.translateZ(-.90);chair.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(chair);if(!clearBoxInRoom(b)||furnitureColliders.some(f=>boxesOverlapXZ(f,b,.11))||roomReservedHit(r,b))hospitalGroup.remove(chair);else{furnitureColliders.push(b);hospitalChairs.push({room:r,mesh:chair,legs:[],collider:b,state:'idle',t:0,stepT:0,path:[],x:chair.position.x,z:chair.position.z,haunted:Math.random()<.10});}}
  // Locker doors look towards the accessible center of the room.
  if(r.kind!=='exit'){
    const l=new THREE.Group();hospitalGroup.add(l);const hinge=boxLocker(l,steel,dark),ls=sides[1]||side;
    const b=safeFurniturePlacement(r,l,ls,1);if(b){furnitureColliders.push(b);lockers.push({x:l.position.x,z:l.position.z,group:l,room:r,hinge,amount:0,target:0,occupied:false});}else hospitalGroup.remove(l);
  }
}
function boxLocker(g,s,d){for(const x of [-.40,.40])propBox(g,s,x,1.13,0,.065,2.26,.62);propBox(g,s,0,2.23,0,.86,.065,.62);propBox(g,s,0,.04,0,.86,.08,.62);propBox(g,d,0,1.13,.29,.75,2.16,.05);const h=new THREE.Group();h.position.set(-.37,0,-.32);g.add(h);propBox(h,d,.37,1.13,0,.73,2.12,.055);for(let i=0;i<4;i++)propBox(h,s,.37,1.68+i*.06,-.035,.42,.024,.025);propBox(h,s,.62,1.05,-.05,.07,.22,.07);return h;}
function buildHospital(){
  disposeTree(hospitalGroup);for(const t of hospitalTextures)t.dispose();hospitalTextures=[];doors=[];lockers=[];hospitalChairs=[];furnitureColliders=[];hidden=null;axePivot.visible=true;visitedRooms=new Set();currentRoom=null;threatWarning=0;threatLife=0;threatCooldown=Math.max(8,16-(floor-1)*1.3);threatCount=0;interactHeld=false;
  receptionist=null;vendingMachines=[];const w=ward();if(isSafeFloor())buildSafeDecor();else rooms.forEach((r,i)=>{r.label=r.kind==='start'?w.name:r.kind==='exit'?'ВЫХОД':r.falseExit?'ВЫХОД':r.secret?'Подсобная':r.layout==='corridor'?'Коридор':r.layout==='hall'?'Зал':r.layout==='nested'?'Блок кабинетов':w.labels[(i-1+w.labels.length)%w.labels.length];r.number=r.branch?String(floor).padStart(2,'0')+'-'+String(r.parentSequence).padStart(2,'0')+'Б'+r.branchNumber:String(floor).padStart(2,'0')+'-'+String(r.sequence).padStart(2,'0');hospitalFurniture(r,i);});
  for(let i=0;i<roomLinks.length;i++){
    const [a,b,open]=roomLinks[i];if(open)continue;const x=cellCX((a.x+b.x)/2),z=cellCX((a.z+b.z)/2),axis=a.x!==b.x?'x':'z';
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=Math.atan2(b.x-a.x,b.z-a.z);hospitalGroup.add(g);
    const frame=propMat(0x4e5654),panel=propMat(a.secret||b.secret?0x4e5350:w.doors),handle=propMat(0xa0a19a);
    propBox(g,frame,-1.01,1.38,0,.17,2.76,.24);propBox(g,frame,1.01,1.38,0,.17,2.76,.24);propBox(g,frame,0,2.75,0,2.18,.19,.24);propBox(g,frame,0,3.65,0,2.2,1.64,.24);
    const h=new THREE.Group();h.position.set(-.92,0,0);g.add(h);propBox(h,panel,.92,1.32,0,1.84,2.64,.14);propBox(h,handle,1.64,1.2,-.10,.10,.27,.10);propBox(h,handle,1.64,1.2,.10,.10,.27,.10);
    doors.push({x,z,axis,hinge:h,open:false,amount:0,a,b});
  }
}
function boxesOverlapXZ(a,b,pad=0){return a.min.x-pad<b.max.x&&a.max.x+pad>b.min.x&&a.min.z-pad<b.max.z&&a.max.z+pad>b.min.z;}
function roomReservedHit(r,b){const cx=cellCX(r.x),cz=cellCX(r.z);if(boxesOverlapXZ(b,{min:{x:cx-.8,z:cz-.8},max:{x:cx+.8,z:cz+.8}}))return true;for(const [a,c] of roomLinks){if(a!==r&&c!==r)continue;const q=a===r?c:a,tx=cellCX(q.x),tz=cellCX(q.z);if(boxesOverlapXZ(b,{min:{x:Math.min(cx,tx)-.75,z:Math.min(cz,tz)-.75},max:{x:Math.max(cx,tx)+.75,z:Math.max(cz,tz)+.75}}))return true;}return false;}
const basePlaceAnomalies=placeAnomalies;
placeAnomalies=function(){
  basePlaceAnomalies();
  // Remove the generic crates from room centres; existing hospital props take their place.
  for(const g of anomalyGroup.children.slice())if(!anomalies.some(a=>a.group===g)){anomalyGroup.remove(g);disposeTree(g);}
  buildHospital();
  for(const a of anomalies){const r=rooms.find(r=>Math.abs(a.x-cellCX(r.x))<(r.hx+.5)*BLOCK&&Math.abs(a.z-cellCX(r.z))<(r.hz+.5)*BLOCK);if(!r)continue;
    const sides=freeRoomSides(r),order=[...sides.slice(2),...['S','N','E','W'].filter(s=>!sides.includes(s)),...sides.slice(0,2)];let best=null;
    for(const side of order)for(const offset of [1,-1]){
      const b=snapRoomWall(r,a.group,side,offset,a.kind==='chair'||a.kind==='bricks'?.40:.055);
      let score=0;for(const f of furnitureColliders){const x=Math.min(b.max.x+.17,f.max.x)-Math.max(b.min.x-.17,f.min.x),z=Math.min(b.max.z+.17,f.max.z)-Math.max(b.min.z-.17,f.min.z);if(x>0&&z>0)score+=10+x*z;}
      if(!sides.includes(side)){const cx=cellCX(r.x),cz=cellCX(r.z);if(side==='E'||side==='W'){if(b.min.z<cz+1.15&&b.max.z>cz-1.15)score+=30;}else if(b.min.x<cx+1.15&&b.max.x>cx-1.15)score+=30;}
      if(!best||score<best.score)best={side,offset,score};
    }
    if(best&&best.score<.001){const box=snapRoomWall(r,a.group,best.side,best.offset,a.kind==='chair'||a.kind==='bricks'?.40:.055);if(clearBoxInRoom(box)&&!roomReservedHit(r,box)&&!anomalies.some(o=>o!==a&&o.placed&&boxesOverlapXZ(new THREE.Box3().setFromObject(o.group),box,.12))){a.x=a.group.position.x;a.z=a.group.position.z;a.placed=true;continue;}}a.disabled=true;a.group.visible=false;
  }
  anomalies=anomalies.filter(a=>!a.disabled);
};
const originalAttack=attackPlayer;attackPlayer=function(m,d){if(!hidden)originalAttack(m,d);};
function roomAt(x,z){return rooms.find(r=>Math.abs(x-cellCX(r.x))<(r.hx+.5)*BLOCK&&Math.abs(z-cellCX(r.z))<(r.hz+.5)*BLOCK);}
function closedDoorBetween(ax,az,bx,bz){for(const d of doors){if(d.amount>=.72)continue;const u=d.axis==='x'?bx-ax:bz-az;if(Math.abs(u)<.0001)continue;const t=(d.axis==='x'?d.x-ax:d.z-az)/u;if(t<=0||t>=1)continue;const cross=d.axis==='x'?az+(bz-az)*t-d.z:ax+(bx-ax)*t-d.x;if(Math.abs(cross)<1.12)return true;}return false;}
function nearestInteract(){let best=null,dist=2.4;const test=(type,o,range=2.4)=>{const a=Math.hypot(player.x-o.x,player.z-o.z);if(a<dist&&a<range&&hasLOS(player.x,player.z,o.x,o.z)&&!closedDoorBetween(player.x,player.z,o.x,o.z)){best={type,o};dist=a;}};if(exitDoor)test('exit',exitDoor,1.9);for(const d of fakeDoors)test('fake',d,1.9);for(const d of doors)if(!d.open)test('door',d);for(const v of vendingMachines)if(!v.used&&player.hp<100)test('food',v,1.6);return best;}
function furnitureHit(x,z){for(const b of furnitureColliders){const dx=x-clamp(x,b.min.x,b.max.x),dz=z-clamp(z,b.min.z,b.max.z);if(dx*dx+dz*dz<PLAYER_R*PLAYER_R)return true;}return false;}
const originalPlayer=updatePlayer;
updatePlayer=function(dt){
  const press=!!keys.KeyE&&!interactHeld;interactHeld=!!keys.KeyE;
  const it=nearestInteract();if(press&&it){if(it.type==='exit'){anomalyVoice('door',it.o.x,it.o.z,.6);descend();return;}else if(it.type==='food'){it.o.used=true;player.hp=Math.min(100,player.hp+20);tone(260,.2,'sine',.1);return;}else if(it.type==='fake'){activateFake(it.o);return;}else if(it.type==='door'){it.o.open=true;onPlayerOpenDoor(it.o);anomalyVoice('door',it.o.x,it.o.z,.6);}}
  const ox=player.x,oz=player.z;originalPlayer(dt);
  if(furnitureHit(player.x,player.z)){if(!furnitureHit(player.x,oz))player.z=oz;else if(!furnitureHit(ox,player.z))player.x=ox;else{player.x=ox;player.z=oz;}player.vx=player.vz=0;camera.position.set(player.x,EYE,player.z);}
  for(const d of doors)if(d.amount<.72){const u=d.axis==='x'?player.x-d.x:player.z-d.z,v=d.axis==='x'?player.z-d.z:player.x-d.x,prev=d.axis==='x'?ox-d.x:oz-d.z;if(Math.abs(u)<.43&&Math.abs(v)<1.3&&(Math.abs(prev)>.43||Math.abs(u)<Math.abs(prev))){player.x=ox;player.z=oz;player.vx=player.vz=0;camera.position.set(ox,EYE,oz);if(msgTimer<=0)showMsg('E — ОТКРЫТЬ ДВЕРЬ',1.1);}}
  if(it&&msgTimer<=0)showMsg('E',.8);
};
const baseMonsterUpdate=updateMonsters;
