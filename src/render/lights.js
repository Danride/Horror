/* ==========================================================
   СВЕТ
   ========================================================== */
function updateLights(dt){
  ambientLight.color.setHex(isSafeFloor()?0xe6e3dc:0x1b2534);ambientLight.intensity=isSafeFloor()?1.6:.85;
  if(isSafeFloor()){for(const L of lamps){L.cur=1;L.mat.color.setHex(0xfff3df);}}
  for (const L of lamps){
    if(isSafeFloor())continue;
    L.dropT -= dt;
    if (L.dropT <= 0){
      L.dropDur = rnd(0.05, 0.40);
      L.dropT = rnd(1.4, 7.5);
    }
    if (L.dropDur > 0) L.dropDur = Math.max(0, L.dropDur - dt);

    let v = 0.80 + 0.20*Math.sin(TIME*9.7 + L.phase)*Math.sin(TIME*3.3 + L.phase*2.1);
    if (L.dropDur > 0) v *= (Math.random()<0.55 ? 0.05 : 0.42);
    L.cur = v;

    L.mat.color.setRGB(
      clamp(v*1.00,0,1),
      clamp(v*0.76,0,1),
      clamp(v*0.44,0,1)
    );
  }

  const cp = camera.position;
  const sorted = lamps.slice().sort((a,b) =>
    a.pos.distanceToSquared(cp) - b.pos.distanceToSquared(cp));

  for (let i=0;i<lightPool.length;i++){
    const L = lightPool[i];
    if (i < sorted.length){
      const lp = sorted[i];
      L.position.copy(lp.pos);
      L.intensity = lp.cur * 16;
    } else {
      L.intensity = 0;
    }
  }

  stairsLight.intensity = 0;
}
