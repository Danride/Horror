/* ==========================================================
   СБРОС
   ========================================================== */
function resetGame(){
  floor = 1;
  runCompleted=0;floorProgress=0;
  runStats={time:0,walked:0,rooms:0,kills:0,hits:0,damage:0,cleared:0,safe:0};
  stopSamples();distantTimer=rnd(30,55);
  clearScare();scareCooldown=15;fadeEl.style.opacity='0';descendT=0;

  for (const m of monsters){monsterGroup.remove(m.mesh);disposeRig(m.mesh);}
  monsters = [];

  for (const p of particles){ scene.remove(p.mesh); p.mesh.material.dispose(); }
  particles.length = 0;

  generateMaze();
  if(isSafeFloor())runStats.safe++;
  buildMazeMesh();
  placeStairs();
  placeAnomalies();
  placeLamps();

  player.x = cellCX(startCell[0]);
  player.z = cellCX(startCell[1]);
  player.vx = player.vz = 0;
  player.hp = 100;
  player.st = 100;
  player.bob = 0;
  player.stepAcc = 0;

  yaw = startYaw;
  pitch = 0;

  swinging = false; swingT = 0;
  shakeAmt = 0; hurtFlash = 0;
  heartbeatT = 0;
  ambientT = 6;
  msgTimer = 0;
  msgEl.style.opacity = '0';
  descending = false;

  spawnFloorMonsters();
  updateMusicIntensity();

  gameState = 'ready';
  updateHUD();
}
