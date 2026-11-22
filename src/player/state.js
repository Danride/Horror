/* ==========================================================
   ИГРОК
   ========================================================== */
const player = {
  x:0, z:0, vx:0, vz:0,
  hp:100, st:100,
  bob:0, stepAcc:0
};

let yaw = 0, pitch = 0;
const keys = Object.create(null);

let gameState = 'ready';
let TIME = 0;
let shakeAmt = 0;
let hurtFlash = 0;
let floor = 1;
let descending = false, descendT=0;
let heartbeatT = 0;
let ambientT = 6;
