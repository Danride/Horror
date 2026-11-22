/* ==========================================================
   МУЗЫКА (мрачный эмбиент)
   ========================================================== */
let musicStarted = false;
let droneGain, droneFilter, padTimer;

function startMusic(){
  if (!actx || musicStarted) return;
  musicStarted = true;

  const o1 = actx.createOscillator(), o2 = actx.createOscillator();
  o1.type='sawtooth'; o1.frequency.value = 55;
  o2.type='sawtooth'; o2.frequency.value = 55.7;

  droneFilter = actx.createBiquadFilter();
  droneFilter.type='lowpass';
  droneFilter.frequency.value = 170;
  droneFilter.Q.value = 4;

  droneGain = actx.createGain();
  droneGain.gain.value = 0.017;

  o1.connect(droneFilter); o2.connect(droneFilter);
  droneFilter.connect(droneGain); droneGain.connect(master);
  o1.start(); o2.start();

  const windSrc = actx.createBufferSource();
  windSrc.buffer = getNoise(); windSrc.loop = true;
  const windF = actx.createBiquadFilter();
  windF.type='lowpass'; windF.frequency.value = 320; windF.Q.value = 0.7;
  const windG = actx.createGain(); windG.gain.value = 0.0055;
  windSrc.connect(windF); windF.connect(windG); windG.connect(master);
  windSrc.start();

  updateMusicIntensity();schedulePad();
}

function schedulePad(){
  if (!musicStarted) return;
  if(actx.state!=='running'){padTimer=setTimeout(schedulePad,2000);return;}
  if(isSafeFloor()){padTimer=setTimeout(schedulePad,2000);return;}
  const now = actx.currentTime;
  const bases = [55, 58.27, 61.74, 65.41, 69.30, 73.42];
  const root = bases[Math.floor(Math.random()*bases.length)];

  for (let i=0;i<3;i++){
    const o = actx.createOscillator();
    o.type = i===0 ? 'triangle' : 'sine';
    o.frequency.value = root * (1 + i*0.5) * (1 + (Math.random()-0.5)*0.008);
    const g = actx.createGain();
    const dur = 7 + Math.random()*7;
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(0.022/(i+1), now+2.5);
    g.gain.linearRampToValueAtTime(0.012/(i+1), now+dur-2.5);
    g.gain.linearRampToValueAtTime(0, now+dur);
    o.connect(g); g.connect(master);
    o.start(now); o.stop(now+dur+0.5);
  }
  padTimer = setTimeout(schedulePad, rnd(9000, 17000));
}

function updateMusicIntensity(){
  if (!musicStarted || !droneGain) return;
  droneGain.gain.setTargetAtTime(isSafeFloor()?.002:0.017 + Math.min(0.03, floor*0.0035), actx.currentTime, 2);
  if (droneFilter) droneFilter.frequency.setTargetAtTime(170 + Math.min(300, floor*22), actx.currentTime, 2);
}
