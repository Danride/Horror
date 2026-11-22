/* ==========================================================
   ДВИЖЕНИЕ
   ========================================================== */
function updatePlayer(dt){
  let f = 0, s = 0;
  if (keys['KeyW']||keys['ArrowUp'])    f += 1;
  if (keys['KeyS']||keys['ArrowDown'])  f -= 1;
  if (keys['KeyD']||keys['ArrowRight']) s += 1;
  if (keys['KeyA']||keys['ArrowLeft'])  s -= 1;

  const wantsSprint = (keys['ShiftLeft']||keys['ShiftRight']) && (f!==0 || s!==0);
  const sprinting = wantsSprint && player.st > 2;

  if (sprinting) player.st = Math.max(0, player.st - dt*26);
  else player.st = Math.min(100, player.st + dt*15);

  const speed = sprinting ? 5.3 : 3.1;

  const fx = -Math.sin(yaw), fz = -Math.cos(yaw);
  const rx =  Math.cos(yaw), rz = -Math.sin(yaw);

  let mx = fx*f + rx*s;
  let mz = fz*f + rz*s;
  const len = Math.hypot(mx,mz);
  if (len > 0){ mx /= len; mz /= len; }

  const k = Math.min(1, 13*dt);
  player.vx += (mx*speed - player.vx)*k;
  player.vz += (mz*speed - player.vz)*k;

  let nx = player.x + player.vx*dt;
  if (!circleHits(nx, player.z, PLAYER_R)) player.x = nx; else player.vx = 0;

  let nz = player.z + player.vz*dt;
  if (!circleHits(player.x, nz, PLAYER_R)) player.z = nz; else player.vz = 0;

  const spd = Math.hypot(player.vx, player.vz);
  player.bob += dt * spd * 2.6;
  const bobY = Math.sin(player.bob) * 0.035 * Math.min(1, spd/3);

  player.stepAcc += spd*dt;
  const stepLen = sprinting ? 1.15 : 1.55;
  if (player.stepAcc > stepLen){
    player.stepAcc = 0;
    noise(0.10, 0.055, 240 + Math.random()*140, 1.4);
    tone(70 + Math.random()*20, 0.06, 'sine', 0.03);
    if (sprinting) for (const m of monsters)
      if (!m.dead && m.type!=='gnome' && (!m.ceilingState||m.ceilingState==='ground') && Math.hypot(m.pos.x-player.x,m.pos.z-player.z)<m.cfg.hear*1.7 && hasLOS(m.pos.x,m.pos.z,player.x,player.z)&&!closedDoorBetween(m.pos.x,m.pos.z,player.x,player.z)){
        m.alert=Math.max(m.alert,6.5);m.lastSeen=[Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK)];}
  }

  if (shakeAmt > 0) shakeAmt = Math.max(0, shakeAmt - dt*2.4);
  const sh = shakeAmt * 0.09;

  camera.position.set(
    player.x + (Math.random()-0.5)*sh,
    EYE + bobY + (Math.random()-0.5)*sh,
    player.z + (Math.random()-0.5)*sh
  );
  camera.rotation.set(pitch, yaw, 0);

  playerLight.intensity = (6.4 + Math.sin(TIME*17.3)*0.5 + Math.sin(TIME*6.1)*0.4)*(1-Math.min(.22,(floor-1)*.018))*(anomalyDim>0?.34+.66*Math.abs(Math.sin(TIME*16)):1);
}
