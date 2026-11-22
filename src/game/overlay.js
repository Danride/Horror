/* ==========================================================
   ОВЕРЛЕЙ
   ========================================================== */
const overlayEl = document.getElementById('overlay');

function showOverlay(title, sub, btn, cls){
  overlayEl.innerHTML = `
    <h1 class="${cls||''}">${title}</h1>
    <p>${sub}</p>
    <div class="btn pulse">${btn}</div>
  `;
  overlayEl.style.display = 'flex';
}
function hideOverlay(){ overlayEl.style.display = 'none';overlayEl.classList.remove('white'); }

function showStartScreen(){
  overlayEl.innerHTML = `
    <h1>ЛАБИРИНТ</h1>
    <p>Шесть–восемь комнат. Два существа. Один путь вниз.<br>
       Вещи здесь не подчиняются законам природы.</p>
    <p style="color:#8c3a3a">Слушайте шаги. Не бегите без причины. Бабка и Погребённый уже ищут вас.</p>
    <div class="keys">
      <b>WASD</b> — идти &nbsp;•&nbsp; <b>МЫШЬ</b> — смотреть &nbsp;•&nbsp; <b>SHIFT</b> — бежать<br>
      <b>ЛКМ</b> — взмах топором &nbsp;•&nbsp; <b>R</b> — заново
    </div>
    <div class="btn pulse">НАЧАТЬ СПУСК</div>
  `;
  overlayEl.style.display = 'flex';
}
