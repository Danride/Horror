/* ==========================================================
   МОНСТРЫ
   ========================================================== */
const monsterGroup = new THREE.Group();
scene.add(monsterGroup);
let monsters = [];


/* Imported Blockbench Bedrock models, embedded with their original texture atlases and clips.
   The build replaces the marker below with the two uploaded model assets. */
const BB_MODELS=/*__MODELS__*/{};
const MODEL_NAMES={granny:'Ночная бабка',buried:'Погребённый',gnome:'Гном',multi:'Многоручка',patient:'Заражённый пациент',orderly:'Заражённый санитар'};
const BB_CLIPS={
  granny:{idle:0,walk:1,run:2,attack:4,hit:5,death:6,scare:10},
  buried:{idle:0,walk:1,run:1,attack:2,hit:4,death:5,scare:3},
  gnome:{idle:0,walk:1,run:2,attack:7,hit:9,death:10,scare:8},multi:{idle:0,walk:1,run:2,attack:5,hit:8,death:9,scare:7,shriek:4},
  patient:{idle:0,walk:1,run:2,alert:3,attack:4,hit:6,death:7,scare:8},orderly:{idle:0,walk:1,run:2,alert:3,attack:4,hit:6,death:7,scare:8}
};
const creatureAssets=new Map();
const rad=Math.PI/180, faceNames=['east','west','up','down','south','north'];
/* Merge one bone's rigid cubes into one mesh, preserving every face's atlas UV and pivot. */
function buildBoneGeometry(cubes,origin,width,height){
  const p=[],n=[],uv=[],indices=[];
  for(const c of cubes){
    const size=c.to.map((v,i)=>Math.max(.001,v-c.from[i]));
    const center=c.to.map((v,i)=>(v+c.from[i])*.5);
    const pivot=c.origin||center, r=c.rotation||[0,0,0];
    const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(...r.map(v=>v*rad),'ZYX'));
    const local=new THREE.Vector3(...center).sub(new THREE.Vector3(...pivot)).applyQuaternion(rotation)
      .add(new THREE.Vector3(...pivot)).sub(new THREE.Vector3(...origin));
    const geom=new THREE.BoxGeometry(...size);
    geom.applyQuaternion(rotation);geom.translate(local.x,local.y,local.z);
    const pa=geom.attributes.position,na=geom.attributes.normal,ta=geom.attributes.uv,gi=geom.index;
    const offset=p.length/3;
    for(let f=0;f<6;f++){
      const rect=c.faces[faceNames[f]];
      for(let k=0;k<4;k++){
        const i=f*4+k;p.push(pa.getX(i),pa.getY(i),pa.getZ(i));n.push(na.getX(i),na.getY(i),na.getZ(i));
        const u=ta.getX(i),v=ta.getY(i),[u0,v0,u1,v1]=rect||[0,0,width,height];
        uv.push(lerp(u0+.04,u1-.04,u)/width,1-lerp(v1-.04,v0+.04,v)/height);
      }
    }
    for(let i=0;i<gi.count;i++)indices.push(offset+gi.getX(i));
    geom.dispose();
  }
  if(!p.length)return null;
  const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  out.setAttribute('normal',new THREE.Float32BufferAttribute(n,3));out.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));out.setIndex(indices);out.computeBoundingSphere();
  return out;
}
function compileCreature(type){
  if(creatureAssets.has(type))return creatureAssets.get(type);
  const d=BB_MODELS[type];if(!d)throw new Error('Unknown creature '+type);
  const map=new THREE.TextureLoader().load(d.texture);
  map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;
  map.wrapS=map.wrapT=THREE.ClampToEdgeWrapping;
  const material=new THREE.MeshLambertMaterial({map,emissive:0x222222,emissiveIntensity:.18});
  const sourceGroups=new Map(d.groups.map(g=>[g.uuid,g])),cubes=new Map(d.elements.map(c=>[c.uuid,c]));
  const nodes=[],byId=new Map();
  function addEntry(entry,parent=-1,parentOrigin=[0,0,0]){
    if(typeof entry==='string')return;
    const source=sourceGroups.get(entry.uuid);if(!source)return;
    const origin=source.origin||[0,0,0],ix=nodes.length;
    const children=entry.children||[],geometry=buildBoneGeometry(children.filter(c=>typeof c==='string').map(c=>cubes.get(c)).filter(Boolean),origin,d.width,d.height);
    const pos=origin.map((v,i)=>v-parentOrigin[i]),rot=(source.rotation||[0,0,0]).slice();
    nodes.push({name:source.name,uuid:source.uuid,parent,pos,rot,geometry});byId.set(source.uuid,ix);
    for(const child of children)if(typeof child!=='string')addEntry(child,ix,origin);
  }
  for(const root of d.outliner)addEntry(root);
  const clips=d.animations.map(a=>{
    const tracks=new Map();
    for(const channel of a.tracks){const ix=byId.get(channel.bone);if(ix===undefined)continue;
      if(!tracks.has(ix))tracks.set(ix,{});
      tracks.get(ix)[channel.channel]=channel.keys;
    }
    return {name:a.name,length:a.length,loop:a.loop,tracks};
  });
  const head=nodes.findIndex(n=>/^head(\b|_|\s|\/)/i.test(n.name)||n.name==='skull_main');
  const asset={type,nodes,clips,material,head,scale:type==='gnome'?.0205:type==='multi'?.040:type==='granny'?.062:type==='patient'?.046:type==='orderly'?.049:.064,sourceCubes:d.elements.length};
  creatureAssets.set(type,asset);return asset;
}
function sampleTrack(keys,time){
  if(!keys||!keys.length)return null;
  if(time<=keys[0][0])return keys[0].slice(1,4);
  if(time>=keys[keys.length-1][0])return keys[keys.length-1].slice(1,4);
  let i=0;while(i+1<keys.length-1&&time>keys[i+1][0])i++;
  const a=keys[i],b=keys[i+1],t=clamp((time-a[0])/Math.max(.0001,b[0]-a[0]),0,1),out=[];
  const prev=keys[Math.max(0,i-1)],next=keys[Math.min(keys.length-1,i+2)];
  for(let k=1;k<=3;k++){
    if(a[4]==='step')out.push(a[k]);
    else if(a[4]==='catmullrom'){const v=.5*((2*a[k])+(-prev[k]+b[k])*t+(2*prev[k]-5*a[k]+4*b[k]-next[k])*t*t+(-prev[k]+3*a[k]-3*b[k]+next[k])*t*t*t);
      out.push(clamp(v,Math.min(a[k],b[k])-Math.abs(b[k]-a[k])*.18,Math.max(a[k],b[k])+Math.abs(b[k]-a[k])*.18));
    } else out.push(lerp(a[k],b[k],t));
  }
  return out;
}
function makeHallBoss(){
  const root=new THREE.Group(),body=new THREE.Group();root.add(body);
  const rubber=propMat(0x733a32),dark=propMat(0x302421),rim=propMat(0x986259),eye=propMat(0xc8ba91),pupil=propMat(0x1a1110);
  const bulb=new THREE.Mesh(new THREE.SphereGeometry(1,12,8),rubber);bulb.scale.set(.78,.96,.72);bulb.position.y=1.45;body.add(bulb);
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.13,.24,.53,8),rim);neck.position.y=2.55;body.add(neck);
  const nozzle=new THREE.Mesh(new THREE.CylinderGeometry(.075,.12,.66,8),dark);nozzle.position.set(0,2.88,-.18);nozzle.rotation.x=-.4;body.add(nozzle);
  for(const x of [-.23,.23]){const e=new THREE.Mesh(new THREE.SphereGeometry(.13,8,6),eye);e.position.set(x,1.78,-.66);body.add(e);propBox(body,pupil,x,1.78,-.77,.07,.09,.035);}
  propBox(body,dark,0,1.37,-.71,.39,.12,.08);
  const legs=[];for(const x of [-.41,.41]){const leg=new THREE.Group();leg.position.set(x,.82,0);root.add(leg);propBox(leg,dark,0,-.30,0,.15,.63,.19);propBox(leg,rubber,0,-.71,-.12,.34,.23,.55);legs.push(leg);}
  root.userData.hallBoss={body,legs,time:0};return root;
}
function makeCreature(type){
  if(type==='enema')return makeHallBoss();
  const asset=compileCreature(type),g=new THREE.Group(),model=new THREE.Group(),bones=[];
  g.add(model);model.scale.setScalar(asset.scale);
  asset.nodes.forEach((d,i)=>{
    const bone=new THREE.Group();bone.name=d.name;bone.position.set(...d.pos);bone.rotation.set(...d.rot.map(v=>v*rad),'ZYX');
    (d.parent<0?model:bones[d.parent]).add(bone);
    if(d.geometry)bone.add(new THREE.Mesh(d.geometry,asset.material));
    bones.push(bone);
  });
  g.userData.rig={type,asset,bones,model,head:bones[asset.head],state:null,time:0,blendT:.2,from:null};
  poseCreature(g,'idle',0,1,0);return g;
}
function disposeRig(g){if(g.userData.hallBoss){disposeTree(g);return;}g.traverse(o=>{if(o.isMesh&&o.userData.ceilingShade)o.material.dispose();});g.clear();} // Creature geometry and permanent materials are shared.
const poseEuler=new THREE.Euler(0,0,0,'ZYX'),poseQ=new THREE.Quaternion(),poseP=new THREE.Vector3();
function poseCreature(g,state,dt=0,rate=1,forceTime=null){
  if(g.userData.hallBoss){const b=g.userData.hallBoss;b.time+=dt*rate;const t=forceTime??b.time,walking=state==='walk'||state==='run',attack=state==='attack';b.body.position.y=walking?Math.abs(Math.sin(t*9))*.12:attack?Math.sin(Math.min(1,t/1.5)*Math.PI)*.35:Math.sin(t*2)*.025;b.body.scale.y=attack?1-.17*Math.sin(Math.min(1,t/1.5)*Math.PI):1;b.body.rotation.x=attack?-.26*Math.sin(Math.min(1,t/1.5)*Math.PI):0;b.legs.forEach((leg,i)=>leg.rotation.x=walking?Math.sin(t*9+i*Math.PI)*.42:attack?-.12:0);return;}
  const r=g.userData.rig;if(!r)return;
  const clip=r.asset.clips[BB_CLIPS[r.type][state]];
  if(!clip)return;
  if(r.state!==state){
    const initial=r.state===null;r.from=initial?null:r.bones.map(b=>({p:b.position.clone(),q:b.quaternion.clone()}));
    r.state=state;r.time=0;r.blendT=initial?.12:0;
  }
  r.time=forceTime===null?r.time+dt*rate:forceTime;r.blendT+=dt;
  const loop=state==='idle'||state==='walk'||state==='run';
  const t=loop?r.time%clip.length:clamp(r.time,0,clip.length);
  const blend=r.from?clamp(r.blendT/.105,0,1):1;
  for(let i=0;i<r.bones.length;i++){
    const bone=r.bones[i],spec=r.asset.nodes[i],track=clip.tracks.get(i);
    const rot=sampleTrack(track?.rotation,t)||spec.rot.slice(),pos=sampleTrack(track?.position,t)||[0,0,0];
    // The mummy has a walk but no run clip. Re-time that exact authored cycle with larger strides and a forward lean.
    if(state==='run'&&r.type==='buried'){
      if(/hip|shoulder/i.test(spec.name))rot[0]*=1.38;
      if(/knee/i.test(spec.name))rot[0]*=1.28;
      if(/Torso/i.test(spec.name))rot[0]-=10;
      if(/Root/i.test(spec.name))pos[1]+=.40*Math.sin(t/clip.length*Math.PI*4);
    }
    // Granny's attack clip had backward-facing upper-arm motion in the source's north-facing frame.
    if(r.type==='granny'&&(state==='attack'||state==='scare')&&/arm_upper/i.test(spec.name))rot[0]=-rot[0];
    poseEuler.set(rot[0]*rad,rot[1]*rad,rot[2]*rad,'ZYX');poseQ.setFromEuler(poseEuler);
    poseP.set(spec.pos[0]+pos[0],spec.pos[1]+pos[1],spec.pos[2]+pos[2]);
    if(blend<1){bone.position.copy(r.from[i].p).lerp(poseP,blend);bone.quaternion.copy(r.from[i].q).slerp(poseQ,blend);}
    else{bone.position.copy(poseP);bone.quaternion.copy(poseQ);}
  }
  if(blend===1)r.from=null;
}
function spatialStep(m,force=1){
  if(!actx||actx.state!=='running')return;
  const dx=m.pos.x-player.x,dz=m.pos.z-player.z,d=Math.hypot(dx,dz);
  const profile=m.type==='gnome'?{range:25,gain:.24,band:730,thump:125,tail:.13}:m.type==='multi'?{range:30,gain:.24,band:920,thump:99,tail:.12}:m.type==='buried'?{range:34,gain:.30,band:210,thump:56,tail:.23}:{range:31,gain:.27,band:440,thump:82,tail:.17};
  if(d>=profile.range)return;
  const occluded=!hasLOS(m.pos.x,m.pos.z,player.x,player.z)||closedDoorBetween(m.pos.x,m.pos.z,player.x,player.z);
  const vol=Math.pow(1-d/profile.range,1.25)*force*(occluded?.46:1),volume=clamp(profile.gain*vol,.0002,.42);
  const g=actx.createGain(),pan=audioPan(),now=actx.currentTime;
  pan.pan.value=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,d),-1,1);
  g.gain.setValueAtTime(.0001,now);g.gain.linearRampToValueAtTime(volume,now+.009);g.gain.exponentialRampToValueAtTime(.0001,now+profile.tail);
  const src=actx.createBufferSource();src.buffer=getNoise();
  const f=actx.createBiquadFilter();f.type='bandpass';f.frequency.value=profile.band*(occluded?.60:1)*rnd(.86,1.14);f.Q.value=.64;
  const o=actx.createOscillator();o.type='triangle';o.frequency.setValueAtTime(profile.thump*rnd(.92,1.08),now);o.frequency.exponentialRampToValueAtTime(profile.thump*.48,now+profile.tail*.72);
  src.connect(f);f.connect(g);o.connect(g);g.connect(pan);pan.connect(master);
  src.start(now,rnd(0,1));src.stop(now+profile.tail+.02);o.start(now);o.stop(now+profile.tail+.02);
}
function creatureVoice(m,kind='growl'){
  if(m.type==='patient'||m.type==='orderly'){const key=kind==='cry'?'zombieCry':kind==='whisper'?'zombieWhisper':m.type==='patient'?'zombieGrowl':'zombieWhisper';playSample(key,()=>m.pos,.62,m);return;}
  if(m.type==='granny'||m.type==='gnome'||m.type==='multi')return; // Original uploaded samples replace synthetic voices.
  if(!actx||actx.state!=='running')return;
  const dx=m.pos.x-player.x,dz=m.pos.z-player.z,d=Math.hypot(dx,dz);
  if(d>=24)return;
  const occluded=!hasLOS(m.pos.x,m.pos.z,player.x,player.z), now=actx.currentTime;
  const vol=(1-d/24)**1.6*(occluded?.36:1), duration=kind==='cry'?.72:kind==='whisper'?1.1:rnd(.55,1.3);
  const env=actx.createGain(), pan=audioPan(), filter=actx.createBiquadFilter();
  pan.pan.value=clamp((dx*Math.cos(yaw)-dz*Math.sin(yaw))/Math.max(1,d),-1,1);
  filter.type='lowpass';filter.frequency.value=occluded?430:kind==='whisper'?2900:1900;
  env.gain.setValueAtTime(.0001,now);env.gain.linearRampToValueAtTime(.11*vol,now+.095);env.gain.linearRampToValueAtTime(.058*vol,now+duration*.63);env.gain.exponentialRampToValueAtTime(.0001,now+duration);
  filter.connect(env);env.connect(pan);pan.connect(master);
  const src=actx.createBufferSource();src.buffer=getNoise();src.loop=true;
  const rasp=actx.createBiquadFilter();rasp.type='bandpass';rasp.frequency.value=kind==='whisper'?1750:kind==='cry'?800:190;rasp.Q.value=kind==='whisper'?2.8:.9;src.connect(rasp);rasp.connect(filter);src.start();src.stop(now+duration);
  if(kind!=='whisper')for(let i=0;i<2;i++){
    const o=actx.createOscillator(),g=actx.createGain();o.type=i?'triangle':'sawtooth';
    const f=(kind==='cry'?rnd(275,415):rnd(42,73))*(i?1.48:1);
    o.frequency.setValueAtTime(f,now);o.frequency.exponentialRampToValueAtTime(f*1.34,now+duration*.28);o.frequency.exponentialRampToValueAtTime(f*.63,now+duration);
    g.gain.value=i?.17:.29;o.connect(g);g.connect(filter);o.start();o.stop(now+duration);
  }
}

/* ---------- ровно два существа на каждом этаже ---------- */
const ENEMY_CONFIG={
  granny:{hp:3,run:4.3,walk:1.48,range:1.60,impact:.22,duration:.75,damage:16,recover:.60,hit:.35,step:.75,detect:16,hear:6},
  buried:{hp:4,run:3.8,walk:1.30,range:1.77,impact:.59,duration:1.30,damage:21,recover:.82,hit:.65,step:.92,detect:12,hear:5},
  multi:{hp:5,run:4.35,walk:1.8,range:2.05,impact:.46,duration:1.12,damage:23,recover:.85,hit:.45,step:.53,detect:ENCOUNTER_RULES.multiGroundRadius,hear:5.5},
  patient:{hp:2,run:3.6,walk:1.35,range:1.55,impact:.42,duration:1.02,damage:12,recover:.82,hit:.45,step:.65,detect:11,hear:5},
  orderly:{hp:3,run:3.1,walk:1.06,range:1.75,impact:.62,duration:1.28,damage:18,recover:1.0,hit:.55,step:.87,detect:13,hear:6},
  enema:{hp:9,run:2.65,walk:1.30,range:2.05,impact:.78,duration:1.50,damage:22,recover:1.45,hit:.42,step:.95,detect:20,hear:8},
  gnome:{hp:1,run:5.3,walk:1.65,range:0,impact:0,duration:0,damage:0,recover:0,hit:0,step:.48}
};
function makeMonster(type,pos){
  if(!pos)return null;
  const mesh=makeCreature(type),base=ENEMY_CONFIG[type],d=Math.max(0,floor-1);
  const cfg=type==='gnome'?{...base,run:Math.min(6.2,base.run+d*.06)}:{...base,hp:base.hp+2+Math.floor(d/2),run:Math.min(4.85,base.run+d*.045),walk:Math.min(1.95,base.walk+d*.025),detect:Math.min(28,base.detect+d*.12),hear:Math.min(10,base.hear+d*.08),damage:Math.min(75,Math.round(base.damage*1.35+d*.72)),recover:Math.max(.40,base.recover-d*.014)};
  mesh.position.copy(pos);monsterGroup.add(mesh);
  return {type,cfg,mesh,pos:pos.clone(),angle:Math.random()*Math.PI*2,hp:cfg.hp,dead:false,
    path:null,pathGoal:-1,pathTimer:0,patrol:null,wait:rnd(.2,1.1),alert:0,chasing:false,atkCd:0,
    attackT:0,deathT:0,hitT:0,stepAcc:0,growlT:rnd(2,6)};
}
function killMonster(m){
  if(m.dead)return;
  if(m.type!=='gnome')runStats.kills++;
  if(m.locker)m.locker.occupied=false;
  if(m.emergingLocker)m.emergingLocker.occupied=false;
  if(m.door?.zombie===m)m.door.zombie=null;
  m.dead = true;
  // Fragment the complete posed body, not a persistent corpse.
  const palette=m.type==='granny'?[0xc4bcac,0x77766b,0x4a4a44,0x9b9892]:[0x958c74,0x5b594e,0x61574b,0xb7ae98];
  m.mesh.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(m.mesh);
  for(let i=0;i<96&&particles.length<140;i++){
    const frag=new THREE.Mesh(partGeo,new THREE.MeshLambertMaterial({color:palette[Math.random()*palette.length|0]}));
    frag.position.set(rnd(bounds.min.x,bounds.max.x),rnd(Math.max(.08,bounds.min.y),bounds.max.y),rnd(bounds.min.z,bounds.max.z));frag.rotation.set(rnd(0,6.28),rnd(0,6.28),rnd(0,6.28));scene.add(frag);
    particles.push({mesh:frag,vx:rnd(-2.9,2.9),vy:rnd(.6,3.8),vz:rnd(-2.9,2.9),life:rnd(.85,1.65),size:rnd(.75,2.0),spin:rnd(-9,9)});
  }
  m.mesh.visible=false;monsterGroup.remove(m.mesh);disposeRig(m.mesh);
  stopSamples(null,m);
  tone(220, 0.35, 'sawtooth', 0.06, 60);
  noise(0.4, 0.10, 300, 0.7);
}
