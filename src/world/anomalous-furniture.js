const standardChair=createEventChair;createEventChair=function(r){const c=standardChair(r);if(c)c.haunted=Math.random()<.10;return c;};
function startChairScare(c){
  if(scareTime>0||gameState!=='playing')return false;
  clearScare();scareMesh=c.mesh.clone(true);scareMesh.position.set(0,0,0);scareMesh.scale.setScalar(1.25);scareScene.add(scareMesh);scareDuration=scareTime=.78;scareCooldown=18;playSample('scaryImpact',{x:player.x,z:player.z},.65);noise(.56,.26,1100,1);tone(175,.36,'sawtooth',.12,48);shakeAmt=.8;return true;
}
function removePropCollider(c){const i=furnitureColliders.indexOf(c.collider);if(i>=0)furnitureColliders.splice(i,1);}
const previousChairUpdate=updateChair;updateChair=function(c,dt){
  const p=c.mesh.position,dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),dot=(-Math.sin(yaw)*dx-Math.cos(yaw)*dz)/Math.max(.01,d);
  if(c.haunted&&c.state==='idle'&&d<2.4&&d>.25&&dot>.92&&Math.abs(pitch)<.95&&hasLOS(player.x,player.z,p.x,p.z)&&!closedDoorBetween(player.x,player.z,p.x,p.z)){
    c.state='jump';c.t=0;c.jumpFrom=p.clone();c.jumpTo=new THREE.Vector3(player.x,0,player.z);removePropCollider(c);anomalyVoice('chair',p.x,p.z,1);}
  if(c.state==='jump'){c.t+=dt;const t=clamp(c.t/.25,0,1);p.copy(c.jumpFrom).lerp(c.jumpTo,t);p.y=Math.sin(t*Math.PI)*1.15;c.mesh.rotation.x=-t*.45;if(t===1){startChairScare(c);c.state='gone';c.mesh.visible=false;}return;}
  previousChairUpdate(c,dt);
};
function createEventCabinet(r){
  const g=new THREE.Group(),body=new THREE.Group(),steel=propMat(0x6d7570),dark=propMat(0x343c3a);g.add(body);boxLocker(body,steel,dark);eventGroup.add(g);
  const side=freeRoomSides(r)[0]||'E',b=safeFurniturePlacement(r,g,side,1);if(!b||anomalies.some(o=>boxesOverlapXZ(b,new THREE.Box3().setFromObject(o.group),.13))){eventGroup.remove(g);disposeTree(g);return null;}furnitureColliders.push(b);return {room:r,mesh:g,body,collider:b,state:'idle',t:0,stepT:0,path:[],x:g.position.x,z:g.position.z};
}
const previousEventPlacement=placeHospitalEvents;placeHospitalEvents=function(){previousEventPlacement();eventChairs.push(...hospitalChairs);eventCabinets=[];if(isSafeFloor())return;const pool=rooms.filter(r=>r.kind==='normal'&&r.layout!=='narrow'&&r.layout!=='nested').sort(()=>Math.random()-.5);for(const r of pool){const c=createEventCabinet(r);if(c){eventCabinets.push(c);break;}}};
function startCabinet(c){if(!c||c.state!=='idle')return false;c.state='crawl';c.t=0;c.stepT=0;removePropCollider(c);const q=roomLinks.filter(([a,b])=>a===c.room||b===c.room).map(([a,b])=>a===c.room?b:a)[0];c.path=q?bfs(Math.floor(c.x/BLOCK),Math.floor(c.z/BLOCK),q.x,q.z)||[]:[];anomalyVoice('chair',c.x,c.z,.9);return true;}
function updateCabinet(c,dt){if(c.state!=='crawl')return;c.t+=dt;c.stepT-=dt;const g=c.mesh,p=g.position,wp=c.path[0],tilt=clamp(c.t*2.5,0,1);c.body.rotation.x=lerp(0,Math.PI*.48,tilt);c.body.position.y=.33*tilt+Math.abs(Math.sin(c.t*9))*.055*tilt;c.body.rotation.z=Math.sin(c.t*8)*.045*tilt;if(wp){const x=cellCX(wp[0]),z=cellCX(wp[1]),dx=x-p.x,dz=z-p.z,d=Math.hypot(dx,dz);if(d<.12)c.path.shift();else{const s=Math.min(d,dt*3.5);g.rotation.y=Math.atan2(-dx,-dz);for(const door of doors)if(Math.hypot(p.x-door.x,p.z-door.z)<1.6&&!door.zombie)door.open=true;if(!circleHits(p.x+dx/d*s,p.z,.24))p.x+=dx/d*s;if(!circleHits(p.x,p.z+dz/d*s,.24))p.z+=dz/d*s;}}if(c.stepT<=0){c.stepT=.26;spatialStep({pos:p,type:'buried'},.65);anomalyVoice('chair',p.x,p.z,.23);}if(!c.path.length||c.t>12){c.state='gone';g.visible=false;}}
const previousEventTrigger=triggerHospitalEvent;triggerHospitalEvent=function(r,forced=null){
  if(forced==='gnome'||forced==='shadow')return previousEventTrigger(r,'echo');
  const cabinet=eventCabinets.find(c=>c.state==='idle'&&Math.hypot(player.x-c.x,player.z-c.z)<10&&hasLOS(player.x,player.z,c.x,c.z)&&!closedDoorBetween(player.x,player.z,c.x,c.z));
  if(cabinet&&(forced==='cabinet'||Math.random()<.48)){startCabinet(cabinet);lastEventKind='cabinet';eventCount++;return true;}
  if(forced==='cabinet')return false;
  return previousEventTrigger(r,forced||['chair','blackout','echo','slam'][Math.random()*4|0]);
};
const previousEventsUpdate=updateHospitalEvents;updateHospitalEvents=function(dt){previousEventsUpdate(dt);for(const c of eventCabinets){if(c.state==='idle'&&Math.hypot(player.x-c.x,player.z-c.z)<5&&hasLOS(player.x,player.z,c.x,c.z)&&!closedDoorBetween(player.x,player.z,c.x,c.z)&&Math.random()<dt*.24)startCabinet(c);updateCabinet(c,dt);}};
