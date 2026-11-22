/* ==========================================================
   ФЛОУ ИГРЫ
   ========================================================== */
function descend(){
  if (descending || gameState!=='playing') return;
  descending = true;
  descendT=.38;clearScare();swinging=false;

  tone(220, 0.6, 'sine', 0.08, 55);
  tone(110, 0.9, 'sine', 0.05, 30);
  noise(0.7, 0.08, 300, 0.5);

  fadeEl.style.opacity = '1';

}
function finishDescend(){
    if(gameState!=='playing'||!descending)return;
    stopSamples();distantTimer=rnd(32,60);
    runCompleted+=Math.max(0,routeDist[gidx(...startCell)])*BLOCK;floorProgress=0;saveDistanceRecord(runCompleted);
    if(floor===15){gameState='won';descending=false;fadeEl.style.opacity='0';for(const k in keys)keys[k]=false;document.exitPointerLock();stopSamples();showOverlay('ВЫ ВЫБРАЛИСЬ',`15 / 15 этажей<br>Дистанция: ${Math.floor(runCompleted)} м<br>Глава завершена.`,'ИГРАТЬ СНОВА','green');return;}
    floor++;
    // Regenerate everything
    generateMaze();
    buildMazeMesh();
    placeStairs();
    placeAnomalies();
    placeLamps();

    // clear monsters
    for (const m of monsters){monsterGroup.remove(m.mesh);disposeRig(m.mesh);}
    monsters = [];
    for(const p of particles){scene.remove(p.mesh);p.mesh.material.dispose();}particles.length=0;

    // player reset
    player.x = cellCX(startCell[0]);
    player.z = cellCX(startCell[1]);
    player.vx = player.vz = 0;
    player.bob=0;player.stepAcc=0;
    yaw = startYaw;
    pitch = 0;

    player.hp = Math.min(100, player.hp + Math.max(5,12-Math.floor(floor/2)));
    player.st = 100;

    spawnFloorMonsters();
    updateMusicIntensity();

    scareCooldown = 12;ambientT=rnd(5,11);

    fadeEl.style.opacity = '0';
    descending = false;

    showMsg(`ЭТАЖ ${floor}`, 2.5);

    updateHUD();
}

function die(){
  if (gameState !== 'playing') return;
  stopSamples();
  gameState = 'dead';
  clearScare();swinging=false;descending=false;fadeEl.style.opacity='0';
  for (const k in keys) keys[k] = false;
  document.exitPointerLock();
  tone(120, 1.2, 'sawtooth', 0.09, 30);
  noise(1.0, 0.10, 200, 0.6);
  // Keep the one existing ambient scheduler alive across retries.
  updateDistance();
  showOverlay('ВЫ ПОГИБЛИ',
    `Этаж: <b style="color:#e0483a">${floor}</b><br>Дистанция: ${Math.floor(runCompleted+floorProgress)} м · Рекорд: ${bestDistance} м<br>Тьма забрала ещё одного.`,
    'ПОПРОБОВАТЬ СНОВА', 'red');
}
