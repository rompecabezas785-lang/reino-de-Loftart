// Original procedural architecture and textures. No external asset downloads.
(() => {
  document.head.append(document.getElementById('visual-theme'));
  const g = window.__juego, height = g.terreno.cfg.fortaleza.altoMuralla + .35;
  const towers = Kp(g.terreno.cfg.fortaleza.apotema);
  const sides = Jp(g.terreno.cfg.fortaleza.apotema);
  const architecture = new Mn(); architecture.name = 'Fortaleza transitable';
  g.scene.add(architecture);
  // Deterministic 1024px masonry: mortar, varied blocks, mineral grain and moss.
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1024;
  const ctx = canvas.getContext('2d'); let seed = 785;
  const random = () => ((seed = (Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  ctx.fillStyle = '#41484b'; ctx.fillRect(0,0,1024,1024);
  for(let row=0;row<16;row++) for(let col=-1;col<9;col++) {
    const x=col*128+(row%2)*64, y=row*64, light=85+random()*35;
    ctx.fillStyle=`rgb(${light+9},${light+12},${light+10})`; ctx.fillRect(x+3,y+3,122,58);
    ctx.fillStyle='#b1b3a36b';ctx.fillRect(x+4,y+4,120,2);
    for(let n=0;n<140;n++) {ctx.fillStyle=random()>.5?'#e0dac51c':'#101c2433';ctx.fillRect(x+random()*124,y+random()*60,2,2);}
    if(random()<.25){ctx.fillStyle='#66734770';ctx.fillRect(x+4,y+52,120,7);}
  }
  const texture = new Fs().load(canvas.toDataURL()); texture.colorSpace=Ge;
  texture.wrapS=texture.wrapT=1000; texture.anisotropy=Math.min(4,g.renderer.capabilities.getMaxAnisotropy());
  const stone=new Xo({map:texture,bumpMap:texture,bumpScale:.08,roughness:.93,color:0xc6c5b4});
  const trim=new Xo({color:0xc2b69b,roughness:.85});
  const iron=new Xo({color:0x39454b,roughness:.42,metalness:.65});
  const gold=new Xo({color:0xb9934b,roughness:.38,metalness:.55});
  const cloth=new Xo({color:0x284d65,roughness:1});
  const meshes=[];
  function box(w,h,d,x,y,z,mat=stone,angle=0){
    const mesh=Z(w,h,d,'#ffffff'); mesh.material.dispose(); mesh.material=mat;
    mesh.position.set(x,y,z);mesh.rotation.y=angle;mesh.castShadow=true;mesh.receiveShadow=true;
    architecture.add(mesh);meshes.push(mesh);return mesh;
  }
  const doors=g.fort.puertas.filter(p=>p.nombre.startsWith('Puerta de la torre'));
  for(const door of doors) door.root.visible=false;
  towers.forEach(t=>{
    box(7,height-.3,7,t.x,(height-.3)/2,t.z);
    box(7.6,.45,7.6,t.x,height-.225,t.z,trim);
    for(const dx of [-1,1]) for(const dz of [-1,1]) box(.65,height+.2,.65,t.x+dx*3.2,height/2,t.z+dz*3.2,trim);
    // Crenellations leave wide openings in the middle for adjoining walkways.
    for(const sign of [-1,1]) for(const off of [-3,-2,2,3]) {
      box(.7,1.1,.65,t.x+off,height+.55,t.z+sign*3.5,trim);
      box(.65,1.1,.7,t.x+sign*3.5,height+.55,t.z+off,trim);
    }
    const len=Math.hypot(t.x,t.z), nx=-t.x/len,nz=-t.z/len;
    // Door canopy and heraldic banner face the city.
    const a=Math.atan2(nx,nz);
    box(1.5,2.7,.16,t.x+nx*3.6,1.35,t.z+nz*3.6,iron,a);
    box(1.9,.25,.5,t.x+nx*3.65,2.8,t.z+nz*3.65,trim,a);
    box(1.1,2,.12,t.x+nx*3.6,5.4,t.z+nz*3.6,cloth,a);
    box(.15,1.4,.14,t.x+nx*3.7,5.4,t.z+nz*3.7,gold,a);
    for(const c of g.terreno.colliders) if(c.tipo==='circulo'&&Math.hypot(c.x-t.x,c.z-t.z)<.1)c.alto=height;
  });
  function segment(x,z,s){const dx=s.B.x-s.A.x,dz=s.B.z-s.A.z,l2=dx*dx+dz*dz;
    const u=Math.max(0,Math.min(1,((x-s.A.x)*dx+(z-s.A.z)*dz)/l2));
    const px=s.A.x+dx*u,pz=s.A.z+dz*u;return {x:px,z:pz,d:Math.hypot(x-px,z-pz)};}
  sides.forEach(s=>{
    const dx=s.B.x-s.A.x,dz=s.B.z-s.A.z,len=Math.hypot(dx,dz),a=Math.atan2(dx,dz),nx=dz/len,nz=-dx/len;
    box(3,.35,len,s.medio.x,height-.175,s.medio.z,stone,a);
    for(const sign of [-1,1]) {
      box(.28,.7,len-7,s.medio.x+sign*nx*1.6,height+.35,s.medio.z+sign*nz*1.6,trim,a);
      for(let k=4;k<len-4;k+=2.4) box(.5,.55,1,s.A.x+dx*k/len+sign*nx*1.6,height+.975,s.A.z+dz*k/len+sign*nz*1.6,stone,a);
    }
  });
  // Batch repeated stonework into one draw call per shared material.
  const unit=Z(1,1,1,'#ffffff');const geometry=unit.geometry;unit.material.dispose();
  for(const material of [stone,trim,iron,gold,cloth]){
    const pieces=meshes.filter(m=>m.material===material);
    const batch=new Fi(geometry,material,pieces.length),dummy=new jn();
    pieces.forEach((piece,index)=>{const p=piece.geometry.parameters;
      dummy.position.copy(piece.position);dummy.rotation.copy(piece.rotation);
      dummy.scale.set(p.width,p.height,p.depth);dummy.updateMatrix();batch.setMatrixAt(index,dummy.matrix);
      architecture.remove(piece);piece.geometry.dispose();
    });
    batch.castShadow=true;batch.receiveShadow=true;architecture.add(batch);
  }
  const ground=g.terreno.alturaSuelo.bind(g.terreno);
  const onDeck=(x,z)=>towers.some(t=>Math.max(Math.abs(t.x-x),Math.abs(t.z-z))<=3.8)||sides.some(s=>segment(x,z,s).d<=1.65);
  g.terreno.alturaSuelo=(x,z,y)=>y>=height-.6&&onDeck(x,z)?Math.max(height,ground(x,z,y)):ground(x,z,y);
  const teleport=(x,y,z)=>{g.rey.pos.set(x,y,z);g.rey.modelo.position.copy(g.rey.pos);g.rey.velY=0;g.rey.velHorizontal.set(0,0,0);g.rey.enSuelo=true;g.camRig.iniciado=false;};
  g._subirTorre=()=>{
    const t=g.enTorre.puerta.ref.centro;g.enTorre.interior.dispose(g.terreno);g.enTorre=null;
    teleport(t.x,height,t.z);g._avisoRey('Muralla · Recorre las pasarelas. R junto a una torre para bajar.');
  };
  const tip=document.createElement('div');tip.id='muralla-ayuda';document.getElementById('hud').append(tip);
  const originalUpdate=g.rey.update.bind(g.rey);
  g.rey.update=(dt,input,cam,terrain)=>{
    const previous=g.rey.pos.clone();originalUpdate(dt,input,cam,terrain);
    // Parapets keep walking, sprinting and dodging on the narrow battlements.
    if(previous.y>=height-.1&&onDeck(previous.x,previous.z)&&!onDeck(g.rey.pos.x,g.rey.pos.z)&&!g.enInterior){
      g.rey.pos.x=previous.x;g.rey.pos.z=previous.z;g.rey.modelo.position.copy(g.rey.pos);
    }
  };
  const originalFrame=g._frame.bind(g);
  g._frame=now=>{
    const nearest=towers.reduce((a,t)=>Math.hypot(t.x-g.rey.pos.x,t.z-g.rey.pos.z)<Math.hypot(a.x-g.rey.pos.x,a.z-g.rey.pos.z)?t:a);
    const near=Math.hypot(nearest.x-g.rey.pos.x,nearest.z-g.rey.pos.z)<8;
    const active=near&&!g.enInterior&&!g.mazmorra&&!g.menu.abierto&&!g._hayPanelAbierto()&&!g.rey.muerto;
    tip.hidden=!active;const above=g.rey.pos.y>=height-.5;
    tip.textContent=above?'R · Bajar de la muralla':'R · Subir a la torre';
    if(active&&g.input.presionada('KeyR')){
      if(above){const l=Math.hypot(nearest.x,nearest.z);teleport(nearest.x-nearest.x/l*7,0,nearest.z-nearest.z/l*7);}
      else teleport(nearest.x,height,nearest.z);
    }
    originalFrame(now);
  };
  const ambient=g._actualizarAmbiente.bind(g);
  g._actualizarAmbiente=dt=>{ambient(dt);g.hemi.intensity*=1.25;};
  g.renderer.toneMappingExposure=1.12;
  g.visualUpgrade={height,towers,sides,onDeck,meshes:meshes.length};

  // Compact treasury with all resources still accessible.
  const treasury=document.createElement('section');treasury.id='tesoreria';
  treasury.innerHTML='<button type="button" aria-expanded="false">TESORERÍA <span>Ver recursos ▾</span></button>';
  document.getElementById('hud').append(treasury);
  treasury.append(document.getElementById('recursos'));
  const toggle=treasury.querySelector('button');toggle.onclick=()=>{const open=treasury.classList.toggle('expandido');toggle.setAttribute('aria-expanded',String(open));};
  const brand=document.createElement('div');brand.id='marca-reino';brand.innerHTML='<span>♜</span> REINO DE HIERRO <small>GUARDIÁN DE LA FORTALEZA</small>';document.getElementById('hud').append(brand);
  document.getElementById('hint').textContent='WASD Mover · Shift Correr · C Esquivar · E Interactuar · R Muralla · H Ayuda · Esc Pausa';
  const note=document.createElement('p');note.textContent='Murallas: acércate a una torre y pulsa R para subir. Recorre las pasarelas y vuelve a pulsar R junto a una torre para bajar. También puedes subir por la escalera del interior con E.';
  document.querySelector('#guia-juego ol').after(note);
})();
