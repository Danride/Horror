/* ==========================================================
   ВВОД — клавиатура, мышь, сенсорный экран и VK WebView
   ========================================================== */
let inputMode = 'drag';
let lookPointer = null;
let stickPointer = null;
let lastLookX = 0, lastLookY = 0;
let interactTimer = null;

const touchControls = document.getElementById('touch-controls');
const dragHint = document.getElementById('drag-hint');
const moveStick = document.getElementById('move-stick');
const stickThumb = document.getElementById('stick-thumb');

function isTouchInput(){
  return Boolean(window.matchMedia?.('(pointer: coarse)').matches ||
    ((window.navigator?.maxTouchPoints || 0) > 0 && window.innerWidth < 1000));
}

function clearInput(){
  for (const key in keys) keys[key] = false;
  lookPointer = stickPointer = null;
  stickThumb.style.transform = '';
  clearTimeout(interactTimer);
}

function refreshInputControls(){
  const playing = gameState === 'playing';
  touchControls.hidden = !playing || inputMode !== 'touch';
  dragHint.hidden = !playing || inputMode !== 'drag';
  document.body.classList?.toggle('touch-playing', playing && inputMode === 'touch');
}

function releasePointerLock(){
  if (document.pointerLockElement === renderer.domElement && typeof document.exitPointerLock === 'function') {
    try { document.exitPointerLock(); } catch (_) {}
  }
}

function pauseGame(){
  if (gameState !== 'playing') return;
  gameState = 'paused';
  clearScare();
  clearInput();
  swinging = false;
  if (actx && actx.state === 'running') {try{Promise.resolve(actx.suspend()).catch(()=>{});}catch(_){}}
  if (inputMode === 'locked') inputMode = 'drag';
  releasePointerLock();
  refreshInputControls();
  showOverlay('ПАУЗА', 'Темнота ждёт.', 'ПРОДОЛЖИТЬ');
}

// Start immediately. Pointer lock is optional in an iframe or mobile WebView.
function requestLock(){
  if (gameState === 'dead' || gameState === 'won') resetGame();
  gameState = 'playing';
  clearInput();
  inputMode = isTouchInput() ? 'touch' : 'drag';
  hideOverlay();
  refreshInputControls();
  resumeAudio();
  if (inputMode === 'touch' || typeof renderer.domElement.requestPointerLock !== 'function') return;
  if (document.pointerLockElement === renderer.domElement) {
    inputMode = 'locked';
    refreshInputControls();
    return;
  }
  try {
    const result = renderer.domElement.requestPointerLock();
    if (result && typeof result.catch === 'function') result.catch(() => {});
  } catch (_) {}
}

function startGameFromGesture(){
  initAudio();
  resumeAudio();
  if (!musicStarted) {
    try { startMusic(); } catch (_) {}
  }
  requestLock();
}

overlayEl.addEventListener('click', e=>{
  const action=e.target.closest?.('[data-menu]')?.dataset.menu;
  if(action==='shop'){showShop();return;}
  if(action==='back'){showStartScreen();return;}
  if(action==='axe'){applyAxeSkin(e.target.closest('[data-menu]').dataset.skin);showShop();return;}
  if(overlayEl.classList.contains('white')&&action!=='start')return;
  startGameFromGesture();
});

renderer.domElement.addEventListener('click', ()=>{
  if (gameState !== 'playing') startGameFromGesture();
});

document.addEventListener('pointerlockchange', ()=>{
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked && gameState === 'playing') {
    inputMode = 'locked';
    refreshInputControls();
  } else if (locked) {
    releasePointerLock();
  } else if (inputMode === 'locked') {
    inputMode = 'drag';
    pauseGame();
  }
});

function rotateView(dx, dy, sensitivity){
  if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
  yaw -= dx * sensitivity;
  pitch = clamp(pitch - dy * sensitivity, -Math.PI/2+.03, Math.PI/2-.03);
}

document.addEventListener('mousemove', e=>{
  if (gameState === 'playing' && document.pointerLockElement === renderer.domElement) rotateView(e.movementX,e.movementY,.0022);
});

document.addEventListener('mousedown', e=>{
  if (gameState === 'playing' && inputMode !== 'touch' && e.button === 0 && (inputMode === 'locked' || e.target === renderer.domElement)) startSwing();
});

renderer.domElement.addEventListener('pointerdown', e=>{
  if (gameState !== 'playing' || inputMode === 'locked') return;
  if (e.pointerType !== 'touch' && e.button !== 2) return;
  if (lookPointer !== null) return;
  e.preventDefault();
  lookPointer = e.pointerId;
  lastLookX = e.clientX;
  lastLookY = e.clientY;
  renderer.domElement.setPointerCapture?.(e.pointerId);
});
renderer.domElement.addEventListener('pointermove', e=>{
  if (e.pointerId !== lookPointer || gameState !== 'playing') return;
  rotateView(e.clientX-lastLookX,e.clientY-lastLookY,inputMode==='touch' ? .004 : .003);
  lastLookX=e.clientX;
  lastLookY=e.clientY;
});
function releaseLook(e){if(e.pointerId===lookPointer)lookPointer=null;}
for(const type of ['pointerup','pointercancel','lostpointercapture'])renderer.domElement.addEventListener(type,releaseLook);

function updateStick(e){
  const r = moveStick.getBoundingClientRect();
  const dx = e.clientX-r.left-r.width/2, dy = e.clientY-r.top-r.height/2;
  const limit = r.width*.32, length = Math.hypot(dx,dy), scale = length>limit?limit/length:1;
  stickThumb.style.transform = 'translate('+(dx*scale)+'px,'+(dy*scale)+'px)';
  keys.KeyW=dy < -10; keys.KeyS=dy > 10;
  keys.KeyA=dx < -10; keys.KeyD=dx > 10;
}
moveStick.addEventListener('pointerdown',e=>{
  if(gameState!=='playing'||stickPointer!==null)return;
  e.preventDefault();stickPointer=e.pointerId;
  moveStick.setPointerCapture?.(e.pointerId);
  updateStick(e);
});
moveStick.addEventListener('pointermove',e=>{if(e.pointerId===stickPointer)updateStick(e);});
function releaseStick(e){
  if(e.pointerId!==stickPointer)return;
  stickPointer=null;stickThumb.style.transform='';
  keys.KeyW=keys.KeyA=keys.KeyS=keys.KeyD=false;
}
for(const type of ['pointerup','pointercancel','lostpointercapture'])moveStick.addEventListener(type,releaseStick);

const sprintButton=document.getElementById('touch-sprint');
sprintButton.addEventListener('pointerdown',e=>{e.preventDefault();sprintButton.setPointerCapture?.(e.pointerId);keys.ShiftLeft=true;});
for(const type of ['pointerup','pointercancel','lostpointercapture'])sprintButton.addEventListener(type,()=>{keys.ShiftLeft=false;});
document.getElementById('touch-interact').addEventListener('pointerdown',e=>{
  e.preventDefault();keys.KeyE=true;
  clearTimeout(interactTimer);
  interactTimer=setTimeout(()=>{keys.KeyE=false;},120);
});
document.getElementById('touch-attack').addEventListener('pointerdown',e=>{e.preventDefault();startSwing();});
document.getElementById('touch-pause').addEventListener('click',pauseGame);

document.addEventListener('keydown', e=>{
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code)) e.preventDefault();
  if(e.code==='Escape'&&gameState==='playing'){pauseGame();return;}
  keys[e.code]=true;
  if(e.code==='KeyR'&&!e.repeat&&gameState!=='ready'){
    resetGame();
    requestLock();
  }
});
document.addEventListener('keyup', e=>{keys[e.code]=false;});
window.addEventListener('blur', clearInput);
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseGame();});
window.addEventListener('palata:vk-hide',pauseGame);
window.addEventListener('palata:vk-restore',resize);
document.addEventListener('contextmenu',e=>e.preventDefault());
