/* ==========================================================
   КОНСТАНТЫ
   ========================================================== */
const BLOCK = 2.2;
const CELLS = 24;
const GW = CELLS * 2 + 1;
const WALL_H = 4.4;
const WORLD = GW * BLOCK;
const PLAYER_R = 0.32;
const EYE = 1.62;
const PIXEL_SCALE = 3;
const GAME_VERSION = '3.0.0';
// All probabilities are evaluated once at their encounter/room boundary.
const ENCOUNTER_RULES = Object.freeze({
  maximumRegulars: 4,
  gnomePerRoom: .15,
  grannyAttackChance: .65,
  zombieDoor: .20,
  zombieLocker: .20,
  zombieWandering: .20,
  multiCeilingRadius: 6.5,
  multiGroundRadius: 19
});

const clamp = (v,a,b)=>v<a?a:v>b?b:v;
const rnd = (a,b)=>a+Math.random()*(b-a);
const lerp = (a,b,t)=>a+(b-a)*t;
