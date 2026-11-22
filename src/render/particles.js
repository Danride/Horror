/* ==========================================================
   ЧАСТИЦЫ
   ========================================================== */
const particles = [];
const partGeo = new THREE.BoxGeometry(0.10,0.10,0.10);

function spawnParticles(pos, color, n, spread=3){
  for (let i=0;i<n;i++){
    if (particles.length > 140) break;
    const m = new THREE.Mesh(partGeo, new THREE.MeshBasicMaterial({ color }));
    m.position.copy(pos);
    m.position.x += rnd(-0.3,0.3);
    m.position.y += rnd(-0.3,0.3);
    m.position.z += rnd(-0.3,0.3);
    scene.add(m);
    particles.push({
      mesh: m,
      vx: rnd(-spread,spread),
      vy: rnd(0.5,spread),
      vz: rnd(-spread,spread),
      life: rnd(0.5,1.0)
    });
  }
}

function updateParticles(dt){
  for (let i=particles.length-1;i>=0;i--){
    const p = particles[i];
    p.vy -= 16*dt;
    p.mesh.position.x += p.vx*dt;
    p.mesh.position.y += p.vy*dt;
    p.mesh.position.z += p.vz*dt;
    if (p.mesh.position.y < 0.05){
      p.mesh.position.y = 0.05; p.vy *= -0.3; p.vx *= 0.7; p.vz *= 0.7;
    }
    p.life -= dt;
    p.mesh.scale.setScalar((p.size||1)*Math.max(0.05, Math.min(1, p.life*1.8)));
    if(p.spin){p.mesh.rotation.x+=p.spin*dt;p.mesh.rotation.y+=p.spin*.7*dt;}
    if (p.life <= 0){
      scene.remove(p.mesh);
      p.mesh.material.dispose();
      particles.splice(i,1);
    }
  }
}
