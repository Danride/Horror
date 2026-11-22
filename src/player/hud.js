/* ==========================================================
   ЭКРАННЫЕ УТИЛИТЫ
   ========================================================== */
const hurtEl = document.getElementById('hurt');
const fadeEl = document.getElementById('fade');
const msgEl = document.getElementById('msg');
const hpBar = document.getElementById('hpbar');
const stBar = document.getElementById('stbar');
const dFill = document.getElementById('dfill');
const crossEl = document.getElementById('cross');
const floorBox = document.getElementById('floorbox');
let msgTimer = 0;

function showMsg(text, dur=2.5, warn=false){
  msgEl.textContent = text;
  msgEl.classList.toggle('warn', warn);
  msgEl.style.opacity = '1';
  msgTimer = dur;
}

function updateHUD(){
  hpBar.style.width = clamp(player.hp,0,100) + '%';
  stBar.style.width = clamp(player.st,0,100) + '%';

  const d=routeDist[gidx(Math.floor(player.x/BLOCK),Math.floor(player.z/BLOCK))];
  const maxD=Math.max(1,routeDist[gidx(...startCell)]);
  const closeness = d<0?0:clamp(1 - d/maxD, 0, 1);
  dFill.style.width = (closeness*100).toFixed(1) + '%';

  hurtEl.style.opacity = hurtFlash > 0 ? String(Math.min(0.85, hurtFlash)) : '0';

  if(floorBox.dataset.floor!==String(floor)){floorBox.dataset.floor=String(floor);floorBox.innerHTML = `ЭТАЖ ${floor}<small>СПУСК</small>`;}
}
