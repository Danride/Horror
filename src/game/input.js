/* ==========================================================
   ВВОД
   ========================================================== */
function requestLock(){
  try {
    const p = renderer.domElement.requestPointerLock();
    if (p && p.catch) p.catch(()=>showOverlay('НУЖЕН ЗАХВАТ МЫШИ','Разрешите захват курсора или откройте HTML в обычной вкладке браузера.','ПОВТОРИТЬ'));
  } catch(e){showOverlay('НУЖЕН ЗАХВАТ МЫШИ','Откройте файл в отдельной вкладке браузера.','ПОВТОРИТЬ');}
}
document.addEventListener('pointerlockerror',()=>{if(gameState!=='playing')showOverlay('НУЖЕН ЗАХВАТ МЫШИ','Разрешите захват курсора в браузере.','ПОВТОРИТЬ');});

overlayEl.addEventListener('click', (e)=>{
  const action=e.target.closest?.('[data-menu]')?.dataset.menu;
  if(action==='shop'){showShop();return;}
  if(action==='back'){showStartScreen();return;}
  if(action==='axe'){applyAxeSkin(e.target.closest('[data-menu]').dataset.skin);showShop();return;}
  if(overlayEl.classList.contains('white')&&action!=='start')return;
  initAudio(); resumeAudio();
  if (!musicStarted) startMusic();
  if (gameState === 'dead'||gameState==='won') resetGame();
  requestLock();
});

renderer.domElement.addEventListener('click', ()=>{
  initAudio(); resumeAudio();
  if (!musicStarted) startMusic();
  if (gameState === 'playing') return;
  if (gameState === 'dead'||gameState==='won') resetGame();
  requestLock();
});

document.addEventListener('pointerlockchange', ()=>{
  const locked = document.pointerLockElement === renderer.domElement;
  if (locked){
    if (gameState === 'ready' || gameState === 'paused') gameState = 'playing';
    hideOverlay();
    resumeAudio();
  } else {
    if (gameState === 'playing'){
      gameState = 'paused';
      clearScare();
      for (const k in keys) keys[k] = false;
      swinging = false;
      if (actx && actx.state==='running') actx.suspend();
      showOverlay('ПАУЗА', 'Темнота ждёт.', 'ПРОДОЛЖИТЬ');
    }
  }
});

document.addEventListener('mousemove', (e)=>{
  if (document.pointerLockElement !== renderer.domElement) return;
  yaw   -= e.movementX * 0.0022;
  pitch -= e.movementY * 0.0022;
  pitch = clamp(pitch, -Math.PI/2+0.03, Math.PI/2-0.03);
});

document.addEventListener('mousedown', (e)=>{
  if (document.pointerLockElement !== renderer.domElement) return;
  if (e.button === 0) startSwing();
});

document.addEventListener('keydown', (e)=>{
  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','ShiftLeft','ShiftRight'].includes(e.code))
    e.preventDefault();
  keys[e.code] = true;

  if (e.code === 'KeyR' && !e.repeat && gameState !== 'ready'){
    resetGame();
    if(document.pointerLockElement===renderer.domElement){gameState='playing';hideOverlay();}
    else requestLock();
  }
});
document.addEventListener('keyup', (e)=>{ keys[e.code] = false; });
window.addEventListener('blur', ()=>{ for (const k in keys) keys[k] = false; });
document.addEventListener('contextmenu', (e)=>e.preventDefault());
