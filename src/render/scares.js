/* ==========================================================
   СКРИМЕР
   ========================================================== */

let scareTime = 0, scareCooldown = 0, scareDuration = .78, scareMesh = null;
function triggerScreamer(type='granny'){
  if (gameState !== 'playing' || descending || scareTime>0 || scareCooldown>0) return;
  if (scareMesh) { scareScene.remove(scareMesh); disposeRig(scareMesh); }
  scareMesh = makeCreature(type);
  scareScene.add(scareMesh);
  scareDuration=type==='granny'?1.05:1.15;scareTime = scareDuration; scareCooldown = 24;
  noise(.68,.22,1350,.75); noise(.28,.16,320,1.2);
  tone(116,.65,'sawtooth',.095,52);
  tone(710,.46,'triangle',.13,180); tone(943,.35,'sawtooth',.065,270);
  shakeAmt = Math.max(shakeAmt, .75);
}
function clearScare(){
  scareTime = 0;
  if (scareMesh){ scareScene.remove(scareMesh); disposeRig(scareMesh); scareMesh=null; }
}
