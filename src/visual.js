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
  const stairs=[];
  // Hide only original modular wall instances: keep gates, castle and terrain.
  let retiredWalls=0;
  for(const child of g.terreno.group.children){
    if(child===g.fort.grupo||!child.isGroup)continue;
    const bounds=new nr().setFromObject(child), center=bounds.getCenter(new U());
    if(sides.some(s=>{const dx=s.B.x-s.A.x,dz=s.B.z-s.A.z,l2=dx*dx+dz*dz;
      const u=((center.x-s.A.x)*dx+(center.z-s.A.z)*dz)/l2;
      return u>=0&&u<=1&&Math.hypot(center.x-s.A.x-u*dx,center.z-s.A.z-u*dz)<1;
    })&&bounds.max.y>4&&bounds.max.y<10){child.visible=false;retiredWalls++;}
  }
  // Remove corner obstruction and shorten adjoining cardinal wall colliders.
  for(let i=g.terreno.colliders.length-1;i>=0;i--){const c=g.terreno.colliders[i];
    if(c.tipo==='circulo'&&towers.some(t=>Math.hypot(c.x-t.x,c.z-t.z)<4.8)){g.terreno.colliders.splice(i,1);continue;}
    if(c.tipo==='caja'&&c.alto===height-.35){for(const t of towers){
      if(c.maxX-c.minX>c.maxZ-c.minZ&&t.z>=c.minZ&&t.z<=c.maxZ){if(Math.abs(c.minX-t.x)<.1)c.minX+=4.5;if(Math.abs(c.maxX-t.x)<.1)c.maxX-=4.5;}
      if(c.maxZ-c.minZ>c.maxX-c.minX&&t.x>=c.minX&&t.x<=c.maxX){if(Math.abs(c.minZ-t.z)<.1)c.minZ+=4.5;if(Math.abs(c.maxZ-t.z)<.1)c.maxZ-=4.5;}
    }}
  }
  towers.forEach((t,index)=>{
    const entry=Math.atan2(-t.z,-t.x);t.entry=entry;
    // 48 facets make a round, hollow shell; the city-facing entrance is open.
    for(let j=0;j<48;j++){
      const a=entry+j*Math.PI*2/48, delta=Math.atan2(Math.sin(a-entry),Math.cos(a-entry));
      const x=t.x+Math.cos(a)*4.15,z=t.z+Math.sin(a)*4.15;
      const opening=Math.abs(delta)<.27;
      box(.62,opening?height-3:height,.5,x,opening?(height+3)/2:height/2,z,stone,Math.PI/2-a);
      if(!opening)g.terreno.colliders.push(pf(x,z,.34,height));
      box(.62,.24,1.3,t.x+Math.cos(a)*4,height-.12,t.z+Math.sin(a)*4,trim,Math.PI/2-a);
      // Ring cornice; no solid roof over the stairwell.
      box(.64,.3,.7,x,height-.15,z,trim,Math.PI/2-a);
      if(j%3===0)box(.65,.9,.6,x,height+.45,z,trim,Math.PI/2-a);
    }
    for(let j=0;j<64;j++){
      const a=entry+.35+j*Math.PI*2/64,y=(j+1)*height/64;
      const x=t.x+Math.cos(a)*2.65,z=t.z+Math.sin(a)*2.65;
      box(1.75,.18,.42,x,y-.09,z,trim,-a);
      stairs.push({x,z,y,tower:index,angle:a});
      for(const radius of [1.72,3.58]){
        box(.07,.95,.07,t.x+Math.cos(a)*radius,y+.475,t.z+Math.sin(a)*radius,iron);
        box(.08,.08,.42,t.x+Math.cos(a)*radius,y+.95,t.z+Math.sin(a)*radius,iron,-a);
      }
    }
    const landingAngle=entry+.35+63*Math.PI*2/64;
    box(1.7,.24,.9,t.x+Math.cos(landingAngle)*3.45,height-.12,t.z+Math.sin(landingAngle)*3.45,trim,-landingAngle);
    // Central column, radial ribs, and two landings join the wall approaches.
    const pillar=sf(.45,.55,height,'#777466',24);pillar.position.set(t.x,height/2,t.z);architecture.add(pillar);
    g.terreno.colliders.push(pf(t.x,t.z,.55,height));
    const door=doors[index];if(door){door.pos.set(t.x+Math.cos(entry)*4.3,0,t.z+Math.sin(entry)*4.3);door.abierta=true;}
  });
  function segment(x,z,s){const dx=s.B.x-s.A.x,dz=s.B.z-s.A.z,l2=dx*dx+dz*dz;
    const u=Math.max(0,Math.min(1,((x-s.A.x)*dx+(z-s.A.z)*dz)/l2));
    const px=s.A.x+dx*u,pz=s.A.z+dz*u;return {x:px,z:pz,d:Math.hypot(x-px,z-pz)};}
  sides.forEach(s=>{
    const dx=s.B.x-s.A.x,dz=s.B.z-s.A.z,len=Math.hypot(dx,dz),a=Math.atan2(dx,dz),nx=dz/len,nz=-dx/len;
    // Independent deck starts outside the hollow towers, avoiding coplanar roofs.
    box(3,.35,len-7.8,s.medio.x,height-.175,s.medio.z,stone,a);
    const body=(start,end)=>{if(end<=start)return;const mid=(start+end)/2;
      box(3,height-.35,end-start,s.A.x+dx*mid/len,(height-.35)/2,s.A.z+dz*mid/len,stone,a);};
    if(s.cardinal){body(4.5,len/2-5);body(len/2+5,len-4.5);}else body(4.5,len-4.5);
    for(const sign of [-1,1]) {
      box(.28,.7,len-9,s.medio.x+sign*nx*1.6,height+.35,s.medio.z+sign*nz*1.6,trim,a);
      for(let k=5;k<len-5;k+=2.4) box(.5,.55,1,s.A.x+dx*k/len+sign*nx*1.6,height+.975,s.A.z+dz*k/len+sign*nz*1.6,stone,a);
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
  const onDeck=(x,z)=>towers.some(t=>{const d=Math.hypot(t.x-x,t.z-z);return d>=3.35&&d<=4.65;})||sides.some(s=>segment(x,z,s).d<=1.65&&towers.every(t=>Math.hypot(x-t.x,z-t.z)>3.8));
  const turn=Math.PI*2, stairArc=63*turn/64;
  const phaseAt=(t,x,z)=>((Math.atan2(z-t.z,x-t.x)-t.entry-.35)%turn+turn)%turn;
  const rampAt=(t,x,z)=>{
    const radius=Math.hypot(x-t.x,z-t.z),phase=phaseAt(t,x,z);
    if(radius<1.75||radius>3.6||phase>stairArc+.025)return null;
    return Math.min(height,height/64+phase/stairArc*(height-height/64));
  };
  const landingAt=(t,x,z)=>{
    const angle=t.entry+.35+stairArc,dx=x-t.x,dz=z-t.z;
    const radial=dx*Math.cos(angle)+dz*Math.sin(angle),side=-dx*Math.sin(angle)+dz*Math.cos(angle);
    return radial>=2.55&&radial<=4.3&&Math.abs(side)<=.45;
  };
  g.terreno.alturaSuelo=(x,z,y)=>{
    let floor=ground(x,z,y);
    for(const t of towers){const ramp=rampAt(t,x,z);
      if(ramp!==null&&ramp<=y+.6)floor=Math.max(floor,ramp);
      if(y>=height-.6&&landingAt(t,x,z))floor=Math.max(floor,height);
    }
    if(y>=height-.6&&onDeck(x,z))floor=Math.max(height,floor);
    return floor;
  };
  const updateKing=g.rey.update.bind(g.rey);
  g.rey.update=(dt,input,camera,terrain)=>{
    const king=g.rey,near=towers.find(t=>Math.hypot(king.pos.x-t.x,king.pos.z-t.z)<7);
    if(!near&&!(king.pos.y>=height-.3&&onDeck(king.pos.x,king.pos.z))){updateKing(dt,input,camera,terrain);return;}
    // Bound movement distance per physics step, including sprint and dodge.
    const steps=Math.max(1,Math.ceil(dt/(1/120)));
    const heldInput=Object.create(input);heldInput.presionada=()=>false;
    for(let i=0;i<steps;i++){
      const previous=king.pos.clone(),wasGrounded=king.enSuelo;
      const ramp=near?rampAt(near,previous.x,previous.z):null;
      updateKing(dt/steps,i===0?input:heldInput,camera,terrain);
      if(king.muerto)continue;
      if(near&&ramp!==null&&Math.abs(previous.y-ramp)<.65&&previous.y>.3&&previous.y<height-.25){
        const radius=Math.hypot(king.pos.x-near.x,king.pos.z-near.z);
        let phase=phaseAt(near,previous.x,previous.z);
        const oldAngle=Math.atan2(previous.z-near.z,previous.x-near.x),newAngle=Math.atan2(king.pos.z-near.z,king.pos.x-near.x);
        phase=Math.max(0,Math.min(stairArc,phase+Math.atan2(Math.sin(newAngle-oldAngle),Math.cos(newAngle-oldAngle))));
        const angle=near.entry+.35+phase,clamped=Math.max(2.1,Math.min(3.15,radius));
        king.pos.x=near.x+Math.cos(angle)*clamped;king.pos.z=near.z+Math.sin(angle)*clamped;
      }
      if(previous.y>=height-.25&&(onDeck(previous.x,previous.z)||(near&&landingAt(near,previous.x,previous.z)))){
        const nextRamp=near?rampAt(near,king.pos.x,king.pos.z):null;
        if(!onDeck(king.pos.x,king.pos.z)&&!(near&&landingAt(near,king.pos.x,king.pos.z))&&!(nextRamp!==null&&nextRamp>height-.7)){
          king.pos.x=previous.x;king.pos.z=previous.z;
        }
      }
      const floor=terrain.alturaSuelo(king.pos.x,king.pos.z,previous.y);
      if((wasGrounded&&king.velY<=0)||king.esquiva){king.pos.y=floor;king.velY=0;king.enSuelo=true;}
      king.modelo.position.copy(king.pos);
    }
  };
  const teleport=(x,y,z)=>{g.rey.pos.set(x,y,z);g.rey.modelo.position.copy(g.rey.pos);g.rey.velY=0;g.rey.velHorizontal.set(0,0,0);g.rey.enSuelo=true;g.camRig.iniciado=false;};
  g._entrarTorre=door=>{const t=door.ref.centro,a=Math.atan2(-t.z,-t.x);teleport(t.x+Math.cos(a)*3.1,0,t.z+Math.sin(a)*3.1);};
  // Preserve old saved callers, but normal play uses the physical staircase.
  g._subirTorre=()=>{if(!g.enTorre)return;const t=g.enTorre.puerta.ref.centro;g.enTorre.interior.dispose(g.terreno);g.enTorre=null;teleport(t.x+3,height,t.z);};
  const tip=document.createElement('div');tip.id='muralla-ayuda';document.getElementById('hud').append(tip);
  const oldFort=g._gestionarFortaleza.bind(g);
  g._gestionarFortaleza=()=>{
    const t=towers.find(t=>Math.hypot(t.x-g.rey.pos.x,t.z-g.rey.pos.z)<7);
    if(t&&!g.enInterior){g._eTomada=false;g._textoFort=null;return;}
    oldFort();
  };
  const originalFrame=g._frame.bind(g);
  g._frame=now=>{
    const t=towers.find(t=>Math.hypot(t.x-g.rey.pos.x,t.z-g.rey.pos.z)<7);
    tip.hidden=!t||g.enInterior||g.menu.abierto||g._hayPanelAbierto();
    tip.textContent=g.rey.pos.y>height-.3?'Escalera interior · Baja caminando por el caracol':'Torre de guardia · Entra y sube por la escalera de caracol';
    originalFrame(now);
  };
  const ambient=g._actualizarAmbiente.bind(g);
  g._actualizarAmbiente=dt=>{ambient(dt);g.hemi.intensity*=1.25;};
  g.renderer.toneMappingExposure=1.12;
  g.visualUpgrade={height,towers,sides,onDeck,meshes:meshes.length,stairs,retiredWalls};

  // Compact treasury with all resources still accessible.
  const treasury=document.createElement('section');treasury.id='tesoreria';
  treasury.innerHTML='<button type="button" aria-expanded="false">TESORERÍA <span>Ver recursos ▾</span></button>';
  document.getElementById('hud').append(treasury);
  treasury.append(document.getElementById('recursos'));
  const toggle=treasury.querySelector('button');toggle.onclick=()=>{const open=treasury.classList.toggle('expandido');toggle.setAttribute('aria-expanded',String(open));};
  const brand=document.createElement('div');brand.id='marca-reino';brand.innerHTML='<span>♜</span> REINO DE HIERRO <small>GUARDIÁN DE LA FORTALEZA</small>';document.getElementById('hud').append(brand);
  document.getElementById('hint').textContent='WASD Mover · Shift Correr · C Esquivar · E Interactuar · H Ayuda · Esc Pausa';
  const note=document.createElement('p');note.textContent='Murallas: entra por el arco de una torre desde la ciudad. Recorre la escalera de caracol con WASD hasta la pasarela. Para bajar, recorre los peldaños en sentido contrario.';
  document.querySelector('#guia-juego ol').after(note);
})();
