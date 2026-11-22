/* ==========================================================
   ИИ МОНСТРОВ
   ========================================================== */
function hasLOS(ax,az,bx,bz){
  let x=Math.floor(ax/BLOCK),z=Math.floor(az/BLOCK);
  const endX=Math.floor(bx/BLOCK),endZ=Math.floor(bz/BLOCK),dx=bx-ax,dz=bz-az,sx=Math.sign(dx),sz=Math.sign(dz);
  const deltaX=dx?BLOCK/Math.abs(dx):Infinity,deltaZ=dz?BLOCK/Math.abs(dz):Infinity;
  let tx=dx?((sx>0?(x+1)*BLOCK:x*BLOCK)-ax)/dx:Infinity,tz=dz?((sz>0?(z+1)*BLOCK:z*BLOCK)-az)/dz:Infinity;
  const blocked=(i,j)=>i<0||j<0||i>=GW||j>=GW||grid[gidx(i,j)]===1;
  if(blocked(x,z)||blocked(endX,endZ))return false;
  for(let n=0;n<GW*2+2;n++){
    if(x===endX&&z===endZ)return true;
    if(Math.abs(tx-tz)<1e-9){if(blocked(x+sx,z)||blocked(x,z+sz))return false;x+=sx;z+=sz;tx+=deltaX;tz+=deltaZ;}
    else if(tx<tz){x+=sx;tx+=deltaX;}
    else {z+=sz;tz+=deltaZ;}
    if(blocked(x,z))return false;
  }
  return false;
}

function turnMonster(m,tx,tz,dt){
  const wanted=Math.atan2(m.pos.x-tx,m.pos.z-tz);
  const delta=Math.atan2(Math.sin(wanted-m.angle),Math.cos(wanted-m.angle));
  m.angle+=delta*Math.min(1,dt*12);m.mesh.rotation.y=m.angle;
}
function moveMonster(m,tx,tz,speed,dt,stop=0){
  const dx=tx-m.pos.x,dz=tz-m.pos.z,d=Math.hypot(dx,dz);if(d<=stop+.018)return 0;
  const k=Math.min(speed*dt,d-stop)/d,ox=m.pos.x,oz=m.pos.z;
  const nx=ox+dx*k,nz=oz+dz*k,r=m.type==='gnome'?.15:.32;
  if(!circleHits(nx,nz,r)){m.pos.x=nx;m.pos.z=nz;}
  else{
    if(!circleHits(nx,oz,r))m.pos.x=nx;
    if(!circleHits(m.pos.x,nz,r))m.pos.z=nz;
  }
  // Gentle separation avoids stacking both rigs in doorways.
  for(const other of monsters){
    if(other===m||other.dead||other.concealed||other.ceilingState&&other.ceilingState!=='ground'||m.type==='gnome'||other.type==='gnome')continue;
    const x=m.pos.x-other.pos.x,z=m.pos.z-other.pos.z,dd=Math.hypot(x,z);
    if(dd>0.001&&dd<.64){
      const overlap=Math.min(.07,(.64-dd)*.35),rx=m.pos.x+x/dd*overlap,rz=m.pos.z+z/dd*overlap;
      if(!circleHits(rx,rz,r)&&Math.hypot(rx-player.x,rz-player.z)>.78){m.pos.x=rx;m.pos.z=rz;}
    }
  }
  if(Math.hypot(m.pos.x-ox,m.pos.z-oz)>.002)turnMonster(m,tx,tz,dt);
  return Math.hypot(m.pos.x-ox,m.pos.z-oz);
}
function selectPatrol(m){
  const list=rooms.filter(r=>Math.hypot(m.pos.x-cellCX(r.x),m.pos.z-cellCX(r.z))>3);
  if(!list.length)return null;const a=list[Math.random()*list.length|0];return [a.x,a.z];
}
function followMonsterPath(m,goal,speed,dt){
  if(!goal)return 0;
  m.pathTimer-=dt;
  const key=gidx(...goal),x=Math.floor(m.pos.x/BLOCK),z=Math.floor(m.pos.z/BLOCK);
  if(m.pathTimer<=0&&(!m.path||m.pathGoal!==key)){
    m.path=bfs(x,z,...goal);m.pathGoal=key;m.pathTimer=.26;
    // Start with the current cell center so diagonal corner cutting cannot strand a creature.
    if(m.path&&m.path.length>1&&Math.hypot(m.pos.x-cellCX(x),m.pos.z-cellCX(z))<.24)m.path.shift();
  }
  if(!m.path?.length)return 0;
  const p=m.path[0],tx=cellCX(p[0]),tz=cellCX(p[1]);
  if(Math.hypot(tx-m.pos.x,tz-m.pos.z)<.12){m.path.shift();if(!m.path.length)return 0;}
  const wp=m.path[0];
  return moveMonster(m,cellCX(wp[0]),cellCX(wp[1]),speed,dt);
}
function removeMonsterQuietly(m){if(m.dead)return;m.dead=true;m.mesh.visible=false;stopSamples(null,m);monsterGroup.remove(m.mesh);disposeRig(m.mesh);}
function resolveGrannyRoam(m,roll=Math.random()){
  m.roamTime=0;stopSamples('laugh',m);
  // Each laughing visit has its own independent 80/20 outcome.
  if(roll<.8){removeMonsterQuietly(m);grannyReturnT=rnd(22,42);threatLife=0;threatCooldown=Math.max(8,grannyReturnT);return false;}
  m.alert=32;m.path=null;m.pathTimer=0;m.chasing=false;m.wait=0;grannyReturnT=-1;playSample('scream',()=>m.pos,.57,m);showMsg('ОНА БЕЖИТ ЗА ВАМИ',2,true);return true;
}
function updateGnome(m,dt){
  m.gnomeTime=(m.gnomeTime??8)-dt;m.gnomeElapsed=(m.gnomeElapsed||0)+dt;m.alert=0;m.chasing=false;m.attackT=0;
  if(m.gnomeTime<=0){removeMonsterQuietly(m);return 0;}
  if(!m.patrol)m.patrol=chooseGnomeGoal(m,roomAt(m.pos.x,m.pos.z));
  let moved=0;if(m.patrol){moved=followMonsterPath(m,m.patrol,m.cfg.run,dt);const d=Math.hypot(m.pos.x-cellCX(m.patrol[0]),m.pos.z-cellCX(m.patrol[1]));
    if(d<.25){const r=roomAt(m.pos.x,m.pos.z);m.patrol=null;m.path=null;m.pathTimer=0;m.patrol=chooseGnomeGoal(m,r);}}
  poseCreature(m.mesh,moved>.002?'run':'idle',dt,moved>.002?1.22:1);return moved;
}
function updateEnemy(m,dt){
  if(m.type==='gnome')return updateGnome(m,dt);
  const cfg=m.cfg,dx=player.x-m.pos.x,dz=player.z-m.pos.z,dist=Math.hypot(dx,dz);
  const openLine=hasLOS(m.pos.x,m.pos.z,player.x,player.z)&&!closedDoorBetween(m.pos.x,m.pos.z,player.x,player.z),seen=dist<cfg.detect&&openLine;
  if(m.type==='granny'&&m.roamTime>0){
    m.roamTime-=dt;m.roamElapsed=(m.roamElapsed||0)+dt;
    if(!m.laughStarted){m.laughStarted=true;playSample('laugh',()=>m.pos,2.25,m);}
    if(m.roamTime<=0||(m.roamElapsed>5.5&&seen&&dist<7.5)){
      if(!resolveGrannyRoam(m))return 0;
    }else{
      m.alert=0;m.chasing=false;m.attackT=0;
      if(!m.patrol){const near=rooms.filter(r=>Math.hypot(cellCX(r.x)-m.pos.x,cellCX(r.z)-m.pos.z)>4).sort((a,b)=>Math.hypot(cellCX(a.x)-player.x,cellCX(a.z)-player.z)-Math.hypot(cellCX(b.x)-player.x,cellCX(b.z)-player.z));if(near.length){const r=near[Math.random()*Math.min(3,near.length)|0];m.patrol=[r.x,r.z];}}
      const moved=followMonsterPath(m,m.patrol,cfg.run*.93,dt);
      if(m.patrol&&Math.hypot(m.pos.x-cellCX(m.patrol[0]),m.pos.z-cellCX(m.patrol[1]))<.28){m.patrol=null;m.path=null;}
      poseCreature(m.mesh,moved>.002?'run':'idle',dt,moved>.002?1.04:1);return moved;
    }
  }
  const was=m.chasing;
  if(seen||(openLine&&dist<cfg.hear)){m.alert=Math.max(m.alert,7);m.lastSeen=[Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK)];}
  else m.alert=Math.max(0,m.alert-dt);
  m.chasing=m.alert>0;
  if(m.chasing&&!was){creatureVoice(m,m.type==='granny'?'cry':'growl');m.path=null;m.pathTimer=0;m.growlT=rnd(2,3.5);}
  m.growlT-=dt;
  if(m.growlT<=0){m.growlT=m.chasing?rnd(2.3,4.5):rnd(7,14);if(dist<22)creatureVoice(m,m.type==='granny'?(m.chasing?'cry':'whisper'):'growl');}
  m.atkCd=Math.max(0,m.atkCd-dt);
  if(m.hitT>0){
    m.hitT=Math.max(0,m.hitT-dt);poseCreature(m.mesh,'hit',dt,1,cfg.hit-m.hitT);return 0;
  }
  if(m.attackT>0){
    const prev=m.attackT;m.attackT+=dt;
    if(prev<cfg.impact)turnMonster(m,player.x,player.z,dt);
    if(prev<cfg.impact&&m.attackT>=cfg.impact&&dist<cfg.range+.35&&openLine)attackPlayer(m,cfg.damage+rnd(-2,2));
    poseCreature(m.mesh,'attack',dt,1,m.attackT);
    if(m.attackT>=cfg.duration){m.attackT=0;m.atkCd=cfg.recover;m.path=null;m.pathTimer=0;}
    return 0;
  }
  if(seen&&dist<cfg.range&&m.atkCd<=0){
    m.attackT=.001;m.path=null;turnMonster(m,player.x,player.z,dt);
    poseCreature(m.mesh,'attack',dt,1,0);creatureVoice(m,m.type==='granny'?'cry':'growl');return 0;
  }
  const speed=m.chasing?Math.min(4.95,cfg.run+Math.min(.15,floor*.015)):cfg.walk;
  let moved=0;
  if(m.chasing){
    if(seen){
      // When visible, close the distance directly; if the wall clips the path, use cell centers.
      if(dist>1.11)moved=moveMonster(m,player.x,player.z,speed,dt,1.11);
      else turnMonster(m,player.x,player.z,dt);
      if(moved<.001&&dist>cfg.range+.1){
        moved=followMonsterPath(m,[Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK)],speed,dt);
      }else{m.path=null;m.pathTimer=0;}
    } else {
      moved=followMonsterPath(m,m.lastSeen||m.patrol,speed,dt);
    }
  }else{
    if(m.wait>0)m.wait-=dt;
    else {
      if(!m.patrol)m.patrol=selectPatrol(m);
      if(m.patrol){
        moved=followMonsterPath(m,m.patrol,speed,dt);
        if(Math.hypot(m.pos.x-cellCX(m.patrol[0]),m.pos.z-cellCX(m.patrol[1]))<.24){m.patrol=null;m.path=null;m.wait=rnd(.3,1.6);}
      }
    }
  }
  const state=moved>.002?(m.chasing?'run':'walk'):'idle';
  const playback=state==='run'?(m.type==='buried'?2.05:1.05):state==='walk'?.8:1;
  poseCreature(m.mesh,state,dt,playback);
  return moved;
}
function updateMonsters(dt){
  for(const m of monsters){
    if(gameState!=='playing'||scareTime>0)break;
    if(m.dead)continue;
    const moved=updateEnemy(m,dt);
    if(m.dead)continue;
    m.mesh.position.copy(m.pos);m.mesh.rotation.y=m.angle;
    m.mesh.visible=!m.concealed&&Math.hypot(m.pos.x-player.x,m.pos.z-player.z)<28;
    m.stepAcc+=moved;
    const step=m.cfg.step*(m.chasing||m.roamTime>0||m.type==='gnome'?1:1.16);
    if(m.stepAcc>=step){m.stepAcc-=step;spatialStep(m,m.type==='buried'?1.15:m.type==='gnome'?1.0:1.04);}
  }
}

function attackPlayer(m, dmg){
  if(gameState!=='playing'||scareTime>0||m.type==='gnome'||m.roamTime>0)return;
  player.hp -= dmg;
  hurtFlash = Math.max(hurtFlash, 0.75);
  shakeAmt = Math.max(shakeAmt, 1.0);

  tone(70, 0.28, 'sawtooth', 0.11, 38);
  noise(0.22, 0.14, 260, 0.7);

  const dx = player.x - m.pos.x, dz = player.z - m.pos.z;
  const d = Math.hypot(dx,dz) || 1;
  const nx = player.x + (dx/d)*0.55;
  const nz = player.z + (dz/d)*0.55;
  if (!circleHits(nx, player.z, PLAYER_R)) player.x = nx;
  if (!circleHits(player.x, nz, PLAYER_R)) player.z = nz;

  if (player.hp <= 0){ player.hp = 0; die(); }
  else if(Math.random()<(m.type==='granny'?.30:.18))triggerScreamer(m.type);
}
