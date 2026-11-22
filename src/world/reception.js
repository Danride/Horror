// The authored Blockbench glTF contains embedded buffers and one atlas.
const RECEPTION_DATA=/*__RECEPTION__*/{};
let receptionist=null,vendingMachines=[];
function receptionModel(){
  const d=RECEPTION_DATA,bytes=Uint8Array.from(atob(d.buffers[0].uri.split(',')[1]),c=>c.charCodeAt(0));
  const sizes={SCALAR:1,VEC2:2,VEC3:3,VEC4:4},types={5126:Float32Array,5123:Uint16Array,5125:Uint32Array,5121:Uint8Array};
  function access(i){const a=d.accessors[i],v=d.bufferViews[a.bufferView],T=types[a.componentType],n=sizes[a.type],stride=v.byteStride||n*T.BYTES_PER_ELEMENT,off=(v.byteOffset||0)+(a.byteOffset||0),out=new T(a.count*n);for(let j=0;j<a.count;j++)out.set(new T(bytes.buffer,off+j*stride,n),j*n);return new THREE.BufferAttribute(out,n);}
  const texture=new THREE.TextureLoader().load(d.images[0].uri);texture.flipY=false;texture.colorSpace=THREE.SRGBColorSpace;texture.minFilter=texture.magFilter=THREE.NearestFilter;texture.generateMipmaps=false;hospitalTextures.push(texture);
  const mat=new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide,alphaTest:.05});
  const nodes=d.nodes.map(n=>{const g=new THREE.Group();g.name=n.name||'';if(n.translation)g.position.fromArray(n.translation);if(n.rotation)g.quaternion.fromArray(n.rotation);if(n.scale)g.scale.fromArray(n.scale);if(n.mesh!==undefined)for(const p of d.meshes[n.mesh].primitives){const geo=new THREE.BufferGeometry();geo.setAttribute('position',access(p.attributes.POSITION));if(p.attributes.NORMAL!==undefined)geo.setAttribute('normal',access(p.attributes.NORMAL));if(p.attributes.TEXCOORD_0!==undefined)geo.setAttribute('uv',access(p.attributes.TEXCOORD_0));if(p.indices!==undefined)geo.setIndex(access(p.indices));g.add(new THREE.Mesh(geo,mat));}return g;});
  d.nodes.forEach((n,i)=>{for(const child of n.children||[])nodes[i].add(nodes[child]);});const root=new THREE.Group();for(const i of d.scenes[d.scene||0].nodes)root.add(nodes[i]);root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root),h=b.max.y-b.min.y;root.scale.setScalar(1.78/Math.max(h,.01));root.position.y=-b.min.y*root.scale.y;const head=nodes[d.nodes.findIndex(n=>n.name==='head')];return {root,head,rest:head.quaternion.clone()};
}
function putDecoration(r,g,offset=1){const sides=freeRoomSides(r);const b=safeFurniturePlacement(r,g,sides[0]||'E',offset);if(!b){disposeTree(g);return false;}hospitalGroup.add(g);furnitureColliders.push(b);return true;}
function buildReception(r){
  const g=new THREE.Group(),wood=propMat(0xc5b8a7),top=propMat(0xe7ded0),black=propMat(0x25282a),red=propMat(0x813238);
  propBox(g,wood,0,.55,-.48,2.8,1.1,.67);propBox(g,top,0,1.12,-.48,3,.13,.84);propBox(g,red,0,.65,-.83,2.55,.13,.035);propBox(g,black,.68,1.39,-.43,.47,.39,.09);propBox(g,black,.68,1.19,-.43,.22,.12,.22);
  const model=receptionModel();model.root.position.z=.32;g.add(model.root);
  if(putDecoration(r,g,-1)){receptionist={...model,group:g,spoken:false,t:0,headYaw:0};return true;}return false;
}
function addPainting(r,i){
  const g=new THREE.Group(),frame=propMat(0x483529),paper=propMat(0xc7c1b5),ink=propMat(i%2?0x713c43:0x394b52),light=propMat(0xd5a85b);propBox(g,frame,0,2.05,0,1.15,1.15,.12);propBox(g,paper,0,2.05,-.075,1.02,1.02,.045);
  for(let n=0;n<6;n++){const x=(n%3-1)*.27,y=1.71+Math.floor(n/3)*.38;propBox(g,ink,x,y,-.103,.12+(n%2)*.09,.24,.026);}propBox(g,light,0,2.09,-.13,.42,.12,.02);putDecoration(r,g,.45);
}
function addVending(r,i){
  const g=new THREE.Group(),body=propMat(i%2?0x8c3f3e:0x45657a),metal=propMat(0x44494b),glass=propMat(0x182a32),white=propMat(0xd3d5c9);propBox(g,body,0,1.05,0,.92,2.1,.7);propBox(g,glass,-.1,1.43,-.36,.62,1.12,.04);
  for(let x=0;x<3;x++)for(let y=0;y<3;y++)propBox(g,propMat([0xb44e38,0xc5a85c,0x588a70,0x637ca9][(x+y+i)%4]),-.33+x*.21,1.13+y*.32,-.398,.13,.19,.03);
  propBox(g,metal,0,.37,-.36,.65,.27,.07);propBox(g,white,.35,1.39,-.38,.09,.3,.04);propBox(g,white,.35,1.07,-.38,.07,.07,.035);
  if(putDecoration(r,g,1)){const a=g.rotation.y;vendingMachines.push({x:g.position.x-Math.sin(a)*.85,z:g.position.z-Math.cos(a)*.85,group:g,used:false});}
}
function buildSafeDecor(){receptionist=null;vendingMachines=[];const r=rooms.find(q=>q.reception);if(r)buildReception(r);for(let i=0;i<rooms.length;i++){const q=rooms[i];addPainting(q,i);if(!q.reception)addVending(q,i);}}
function updateReception(dt){if(!receptionist)return;const r=receptionist;r.t+=dt;const p=r.root.getWorldPosition(new THREE.Vector3()),local=r.group.worldToLocal(new THREE.Vector3(player.x,EYE,player.z));const wanted=clamp(Math.atan2(-local.x,-(local.z-r.root.position.z)),-1.3,1.3);r.headYaw=lerp(r.headYaw,wanted,Math.min(1,dt*3.5));r.head.quaternion.copy(r.rest).multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),r.headYaw));if(!r.spoken&&audioBuffers.has('receptionVoice')&&Math.hypot(p.x-player.x,p.z-player.z)<9&&hasLOS(p.x,p.z,player.x,player.z)&&!closedDoorBetween(p.x,p.z,player.x,player.z)){if(playSample('receptionVoice',{x:p.x,z:p.z},.95))r.spoken=true;}}
