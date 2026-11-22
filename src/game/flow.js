/* ==========================================================
   ФЛОУ ИГРЫ
   ========================================================== */
let runStats={time:0,walked:0,rooms:0,kills:0,hits:0,damage:0,cleared:0,safe:0};
function runSummary(){const t=Math.floor(runStats.time),clock=Math.floor(t/60)+':'+String(t%60).padStart(2,'0');const rows=[['Пройдено этажей',runStats.cleared+' / 15'],['Время забега',clock],['Пройдено метров',Math.floor(runStats.walked)+' м'],['Посещено комнат',runStats.rooms],['Побеждено монстров',runStats.kills],['Попаданий топором',runStats.hits],['Получено урона',Math.round(runStats.damage)],['Безопасных этажей',runStats.safe],['Рекорд спуска',bestDistance+' м']];return '<div class="run-stats">'+rows.map(([k,v])=>'<div><span>'+k+'</span><b>'+v+'</b></div>').join('')+'</div>';}
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
    runStats.cleared++;runCompleted+=Math.max(0,routeDist[gidx(...startCell)])*BLOCK;floorProgress=0;saveDistanceRecord(runCompleted);
    if(floor===15){gameState='won';descending=false;fadeEl.style.opacity='0';for(const k in keys)keys[k]=false;document.exitPointerLock();stopSamples();showOverlay('ВЫ ВЫБРАЛИСЬ',runSummary(),'ИГРАТЬ СНОВА','green');return;}
    floor++;
    // Regenerate everything
    generateMaze();
    if(isSafeFloor())runStats.safe++;
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
    runSummary(),
    'ПОПРОБОВАТЬ СНОВА', 'red');
}
