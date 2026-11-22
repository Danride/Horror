/* ==========================================================
   ТЕКСТУРЫ
   ========================================================== */
function makeTex(size, fn){
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const img = g.createImageData(size,size);
  for (let y=0;y<size;y++)
    for (let x=0;x<size;x++){
      const [r,gg,b] = fn(x,y);
      const i = (y*size+x)*4;
      img.data[i]=r; img.data[i+1]=gg; img.data[i+2]=b; img.data[i+3]=255;
    }
  g.putImageData(img,0,0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace=THREE.SRGBColorSpace;
  t.magFilter = THREE.NearestFilter;
  t.minFilter = THREE.NearestMipmapLinearFilter;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

const wallTex = makeTex(16,(x,y)=>{
  let v = 104 + (Math.random()*40-20);
  if (y===0||y===15) v -= 26;
  if (y%8===0) v -= 12;
  if (Math.random()<0.05) v -= 32;
  return [v*0.94, v*0.92, v];
});
const floorTex = makeTex(16,()=>{
  let v = 46 + Math.random()*24;
  if (Math.random()<0.09) v += 28;
  if (Math.random()<0.05) v -= 18;
  return [v*1.06, v*0.97, v*0.86];
});
floorTex.repeat.set(GW,GW);
const ceilTex = makeTex(16,()=>{
  const v = 22 + Math.random()*14;
  return [v, v*0.96, v*0.92];
});
ceilTex.repeat.set(GW,GW);
