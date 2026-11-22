/* ==========================================================
   THREE.JS — БАЗА
   ========================================================== */
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
scene.fog = new THREE.FogExp2(0x000000, 0.085);

const camera = new THREE.PerspectiveCamera(78, 1, 0.05, 90);
camera.rotation.order = 'YXZ';
scene.add(camera);

let renderer;
try{renderer=new THREE.WebGLRenderer({ antialias:false, powerPreference:'high-performance' });}
catch(e){document.getElementById('overlay').innerHTML='<h1>НЕТ WEBGL</h1><p>Включите аппаратное ускорение браузера или откройте игру в актуальном Chrome / Edge.</p>';throw e;}
renderer.setClearColor(0x000000);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
renderer.domElement.id = 'game';
document.body.insertBefore(renderer.domElement, document.body.firstChild);
const scareScene = new THREE.Scene();
scareScene.background = new THREE.Color(0x080605);
const scareCamera = new THREE.PerspectiveCamera(58,1,.05,20);
scareScene.add(new THREE.AmbientLight(0x9eabae,2.1));
const scareLamp = new THREE.PointLight(0xffb497,9,8,1.5);
scareLamp.position.set(-.8,2.3,-1.3);scareScene.add(scareLamp);

function resize(){
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(Math.max(1,Math.ceil(w/PIXEL_SCALE)), Math.max(1,Math.ceil(h/PIXEL_SCALE)), false);
  renderer.domElement.style.width = w+'px';
  renderer.domElement.style.height = h+'px';
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
  scareCamera.aspect=w/h;scareCamera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

/* ---------- свет ---------- */
const ambientLight=new THREE.AmbientLight(0x1b2534, 0.85);scene.add(ambientLight);

const playerLight = new THREE.PointLight(0xffb070, 6.4, 11, 1.7);
playerLight.position.set(0,-0.1,0.1);
camera.add(playerLight);

const lightPool = [];
for (let i=0;i<6;i++){
  const L = new THREE.PointLight(0xffb070, 0, 14, 1.75);
  L.position.set(0,-100,0);
  scene.add(L);
  lightPool.push(L);
}

const stairsLight = new THREE.PointLight(0xb070ff, 14, 16, 1.6);
stairsLight.position.set(0,-100,0);
scene.add(stairsLight);
