/* ==========================================================
   ЦИКЛ ОБНОВЛЕНИЯ
   ========================================================== */
function update(dt){
  if(gameState==='playing'){TIME += dt;runStats.time+=dt;}

  if (msgTimer > 0){
    msgTimer -= dt;
    if (msgTimer <= 0) msgEl.style.opacity = '0';
  }

  if(gameState==='playing'&&descending){descendT-=dt;if(descendT<=0)finishDescend();return;}
  if (gameState === 'playing'){
    scareCooldown=Math.max(0,scareCooldown-dt);
    if(scareTime>0){
      scareTime-=dt;
      if(scareTime<=0){clearScare();}
      else return;
    }
    const px=player.x,pz=player.z;updatePlayer(dt);runStats.walked+=Math.hypot(player.x-px,player.z-pz);
    if(descending){updateHUD();return;}
    updateAxe(dt);
    updateMonsters(dt);
    if(gameState!=='playing'||scareTime>0||descending){updateHUD();return;}
    updateAnomalies(dt);
    updateHospitalEvents(dt);
    updateSamples(dt);
    if(gameState!=='playing'||scareTime>0){updateHUD();return;}
    updateLights(dt);
    updateParticles(dt);

    if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt*1.9);

    // спуск
    const dStairs = Math.hypot(player.x - stairsPos.x, player.z - stairsPos.z);
    if(descending)return;

    // сердцебиение
    if (player.hp < 45){
      heartbeatT -= dt;
      if (heartbeatT <= 0){
        heartbeatT = 0.55 + (player.hp/45)*0.7;
        tone(52, 0.16, 'sine', 0.09);
        setTimeout(()=>{if(gameState==='playing'&&!descending)tone(44, 0.20, 'sine', 0.07);},150);
      }
    }

    // Неопознанные пространственные звуки из другой комнаты (не новый монстр).
    ambientT -= dt;
    if (ambientT <= 0&&!isSafeFloor()){
      ambientT = rnd(6,14);
      const near=rooms.filter(r=>{const d=Math.hypot(cellCX(r.x)-player.x,cellCX(r.z)-player.z);return d>5&&d<23;});
      if(near.length){const r=near[Math.random()*near.length|0];anomalyVoice('unknown',cellCX(r.x),cellCX(r.z),.8);}
    }

    // No random fullscreen scream on a timer: it follows an actual encounter.

    updateHUD();
  } else {
    camera.position.set(player.x, EYE, player.z);
    camera.rotation.set(pitch, yaw, 0);
    updateLights(dt);
    // Pause also freezes particles and gameplay timers.
    if (hurtFlash > 0) hurtFlash = Math.max(0, hurtFlash - dt*1.9);
    hurtEl.style.opacity = hurtFlash > 0 ? String(Math.min(0.85, hurtFlash)) : '0';
  }
}

let lastTime = performance.now();
function loop(now){
  const dt = Math.min(0.05, (now - lastTime)/1000);
  lastTime = now;
  update(dt);
  if(scareTime>0&&scareMesh){
    const t=clamp(1-scareTime/scareDuration,0,1),r=scareMesh.userData.rig;
    if(!r){scareMesh.rotation.set(.12+Math.sin(t*25)*.08,Math.PI+Math.sin(t*24)*.09,Math.sin(t*18)*.07);scareCamera.position.set(0,.91,lerp(-2.4,-.66,Math.min(1,t*4)));scareCamera.lookAt(0,.82,0);renderer.autoClear=true;renderer.render(scareScene,scareCamera);requestAnimationFrame(loop);return;}
    const clip=r.asset.clips[BB_CLIPS[r.type].scare];poseCreature(scareMesh,'scare',dt,1,t*clip.length);
    scareMesh.updateMatrixWorld(true);
    const head=r.head?r.head.getWorldPosition(new THREE.Vector3()):new THREE.Vector3(0,1.65,0);head.y+=.14;
    scareCamera.position.set(head.x+Math.sin(t*25)*.025,head.y+.04,head.z+lerp(-1.65,-.67,Math.min(1,t*2.65)));
    scareCamera.lookAt(head.x,head.y-.03,head.z);
    renderer.autoClear=true;renderer.render(scareScene,scareCamera);
  } else {
    renderer.autoClear=true;renderer.render(scene,camera);
    renderer.autoClear=false;renderer.clearDepth();renderer.render(viewScene,viewCamera);renderer.autoClear=true;
  }
  requestAnimationFrame(loop);
}
