/* ==========================================================
   АУДИО
   ========================================================== */
let actx = null, noiseBuf = null, master = null;
const SAMPLE_DATA=/*__AUDIO__*/{};
const audioBuffers=new Map(),sampleVoices=[];
let samplesReady=null, distantTimer=36;
function prepareSamples(){
  if(samplesReady||!actx||!actx.decodeAudioData)return;
  samplesReady=Promise.all(Object.entries(SAMPLE_DATA).map(async ([key,b64])=>{try{const bytes=Uint8Array.from(atob(b64),c=>c.charCodeAt(0));const buf=await actx.decodeAudioData(bytes.buffer);audioBuffers.set(key,buf);}catch(e){console.warn('Аудио не декодировано:',key);}}));
}
function updateSamplePosition(v,initial=false){
  const p=typeof v.position==='function'?v.position():v.position;if(!p)return;
  const dx=p.x-player.x,dz=p.z-player.z,d=Math.hypot(dx,dz),clear=hasLOS(player.x,player.z,p.x,p.z)&&!closedDoorBetween(player.x,player.z,p.x,p.z);
  const volume=v.level*(v.kind==='distant'?Math.max(.20,1-d/65):Math.pow(Math.max(0,1-d/(v.kind==='gnome'?29:42)),1.25))*(clear?1:.52);
  const pan=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,d),-1,1),hz=clear?18000:v.kind==='scream'?2200:v.kind==='laugh'?1900:v.kind==='gnome'?1750:1250;
  if(initial){v.gain.gain.value=volume;v.pan.pan.value=pan;v.filter.frequency.value=hz;}
  else {const now=actx.currentTime;v.gain.gain.setTargetAtTime(volume,now,.10);v.pan.pan.setTargetAtTime(pan,now,.10);v.filter.frequency.setTargetAtTime(hz,now,.14);}
}
function playSample(kind,position,level,owner=null){
  if(!actx||actx.state!=='running')return null;prepareSamples();const buf=audioBuffers.get(kind);
  if(!buf){if(samplesReady)samplesReady.then(()=>{if(gameState==='playing'&&(!owner||(!owner.dead&&monsters.includes(owner)&&(kind!=='laugh'||owner.roamTime>0)))&&audioBuffers.has(kind))playSample(kind,position,level,owner);});return null;}
  if(sampleVoices.some(v=>v.kind===kind&&v.owner===owner))return null;
  const src=actx.createBufferSource(),gain=actx.createGain(),pan=actx.createStereoPanner(),filter=actx.createBiquadFilter();src.buffer=buf;filter.type='lowpass';filter.Q.value=.5;
  const v={kind,owner,position,level,src,gain,pan,filter};sampleVoices.push(v);updateSamplePosition(v,true);
  src.connect(filter);filter.connect(gain);gain.connect(pan);pan.connect(master);
  src.onended=()=>{const i=sampleVoices.indexOf(v);if(i>=0)sampleVoices.splice(i,1);for(const n of [src,filter,gain,pan])try{n.disconnect();}catch{}};
  src.start();return v;
}
function stopSamples(kind=null,owner=null){for(const v of sampleVoices.slice())if((!kind||v.kind===kind)&&(!owner||v.owner===owner)){try{v.src.stop();}catch{}const i=sampleVoices.indexOf(v);if(i>=0)sampleVoices.splice(i,1);}}
function updateSamples(dt){
  for(const v of sampleVoices)updateSamplePosition(v);
  if(isSafeFloor())return;
  distantTimer-=dt;if(distantTimer<=0){distantTimer=rnd(75,145);const options=rooms.filter(r=>{const d=Math.hypot(cellCX(r.x)-player.x,cellCX(r.z)-player.z);return d>10&&d<37;});if(options.length){const r=options[Math.random()*options.length|0];playSample('distant',{x:cellCX(r.x),z:cellCX(r.z)},.40);}}
}
function initAudio(){
  if (actx) return;
  try {
    actx = new (window.AudioContext||window.webkitAudioContext)();
    master = actx.createGain(); master.gain.value = 0.65;
    const limit = actx.createDynamicsCompressor();
    limit.threshold.value = -16; limit.ratio.value = 8;
    master.connect(limit); limit.connect(actx.destination);
    prepareSamples();
  } catch(e){}
}
function resumeAudio(){ if (actx && actx.state==='suspended') actx.resume(); }
function getNoise(){
  if (!noiseBuf){
    noiseBuf = actx.createBuffer(1, actx.sampleRate*2, actx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i=0;i<d.length;i++) d[i] = Math.random()*2-1;
  }
  return noiseBuf;
}
function tone(freq, dur, type='square', vol=0.05, slideTo){
  if (!actx) return;
  const o = actx.createOscillator(), g = actx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, actx.currentTime);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20,slideTo), actx.currentTime+dur);
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+dur);
  o.connect(g); g.connect(master);
  o.start(); o.stop(actx.currentTime+dur+0.03);
}
function noise(dur, vol, freq, q=1){
  if (!actx) return;
  const src = actx.createBufferSource(); src.buffer = getNoise();
  const f = actx.createBiquadFilter();
  f.type='bandpass'; f.frequency.value=freq; f.Q.value=q;
  const g = actx.createGain();
  g.gain.setValueAtTime(vol, actx.currentTime);
  g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(); src.stop(actx.currentTime+dur+0.02);
}
