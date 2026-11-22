// Node.js only; no npm dependencies. The output is a standalone offline HTML.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const read = filename => fs.readFileSync(path.join(root, filename), 'utf8');
const manifest = JSON.parse(read('assets/manifest.json'));

// Ordered subsystems are bundled into a single lexical scope. This preserves the
// original engine's shared scene state while allowing each subsystem to be edited.
const modules = [
  'core/config', 'audio/sound', 'audio/ambience', 'render/scares',
  'world/generation', 'render/scene', 'render/textures', 'world/geometry',
  'render/particles', 'entities/axe', 'entities/models', 'entities/ai',
  'player/state', 'player/hud', 'player/movement', 'render/lights',
  'game/flow', 'game/overlay', 'game/input', 'game/reset', 'game/loop',
  'world/hospital', 'world/reception', 'world/events', 'entities/encounters',
  'world/anomalous-furniture', 'game/presentation', 'game/startup'
];

function compact(filename) {
  const d = JSON.parse(read('assets/' + filename));
  const {width,height} = d.resolution;
  const texture = d.textures[0].source;
  assert.ok(texture.startsWith('data:image/png;base64,'), filename);
  const elements = d.elements.filter(e => e.type === 'cube' && e.export !== false && e.visibility !== false).map(e => ({
    uuid:e.uuid, from:e.from, to:e.to, origin:e.origin, rotation:e.rotation,
    faces:Object.fromEntries(Object.entries(e.faces).map(([name,f]) => [name,f.uv]))
  }));
  const groups = (d.groups || []).map(g => ({uuid:g.uuid,name:g.name,origin:g.origin,rotation:g.rotation}));
  const animations = (d.animations || []).map(a => ({name:a.name,length:a.length,loop:a.loop,
    tracks:Object.entries(a.animators).flatMap(([bone,b]) => ['rotation','position'].flatMap(channel => {
      const keys = (b.keyframes || []).filter(k => k.channel === channel).map(k => {
        const v=k.data_points[0]; return [k.time,Number(v.x),Number(v.y),Number(v.z),k.interpolation];
      }).sort((a,b) => a[0]-b[0]);
      assert.ok(keys.every(k => k.slice(0,4).every(Number.isFinite)), `Non-numeric keys in ${filename}: ${a.name}`);
      return keys.length ? [{bone,channel,keys}] : [];
    }))}));
  return {width,height,texture,elements,groups,outliner:d.outliner,animations};
}
const models = Object.fromEntries(Object.entries(manifest.models).map(([key,filename]) => [key,compact(filename)]));
const samples = Object.fromEntries(Object.entries(manifest.audio).map(([key,filename]) => [key,fs.readFileSync(path.join(root,'assets',filename)).toString('base64')]));
const embed = value => JSON.stringify(value).replace(/<\/script/gi,'<\\/script');
const game = modules.map(name => `\n// ===== ${name}.js =====\n${read('src/'+name+'.js')}`).join('\n')
  .replace('/*__MODELS__*/{}',()=>embed(models)).replace('/*__AUDIO__*/{}',()=>embed(samples)).replace('/*__RECEPTION__*/{}',()=>embed(JSON.parse(read('assets/models/reception.gltf'))));
const code = read('src/index.template.html')
  .replace('/*__CSS__*/',()=>read('src/style.css'))
  .replace('/*__ENGINE__*/',()=> '\n'+read('vendor/three.min.js'))
  .replace('/*__GAME__*/',()=>game);
assert.ok(!code.includes('https://unpkg.com'));
assert.ok(!code.includes('/*__MODELS__*/'));
const output = path.join(root,'index.html');
fs.writeFileSync(output,code);
console.log(`Built index.html (${Buffer.byteLength(code).toLocaleString()} bytes, ${modules.length} subsystems, ${Object.keys(models).length} models, ${Object.keys(samples).length} audio assets)`);
