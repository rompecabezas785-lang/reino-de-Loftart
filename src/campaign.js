// Twenty authored encounters. Progress belongs to the game's save slots, not a global flag.
(() => {
  const g=window.__juego,ui=g.experience,catalog=nh;
  g.mazmorraUI.el.id='campaign-dungeon-status';
  let completed=new Set(),sites=new Map(),elapsed=0,pendingGold=0;
  const geometry={box:new pa(1,1,1),cone:new ha(1,1,6),sphere:new _a(1,1)};
  const materials=new Map();
  const material=(color,glow=false)=>{const key=color+glow;if(!materials.has(key))materials.set(key,new Xo({color,roughness:.9,emissive:glow?color:'#000000',emissiveIntensity:glow?.35:0}));return materials.get(key);};
  function shape(root,kind,color,x,y,z,sx=1,sy=1,sz=1,glow=false){const m=new li(geometry[kind],material(color,glow));m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;root.add(m);return m;}
  function plant(root,type,x,z,color,scale=1){
    const p=new Mn();p.position.set(x,0,z);p.scale.setScalar(scale);root.add(p);
    const part=(kind,c,x,y,z,a,b,d,glow=false)=>shape(p,kind,c,x,y,z,a,b,d,glow);
    switch(type){
      case 'oak':case 'roots':case 'thorns':
        part('box','#66513b',0,1,0,.35,2,.35);
        for(let i=0;i<3;i++){const a=i*2.1;const branch=part('box','#66513b',Math.cos(a)*.5,1.5,Math.sin(a)*.5,.18,1.4,.18);branch.rotation.z=.7;}
        if(type==='oak')part('sphere',color,0,2.5,0,1.3,1.1,1.3);
        else for(let i=0;i<5;i++)part('cone',color,Math.cos(i)*.7,.3,Math.sin(i)*.7,.18,.6,.18);
        break;
      case 'mushrooms':part('box','#c6b6aa',0,.5,0,.2,1,.2);part('sphere',color,0,1,0,.9,.25,.9,true);break;
      case 'cactus':part('box',color,0,1,0,.45,2,.45);part('box',color,.5,.8,0,1,.3,.3);part('box',color,.9,1.25,0,.25,1,.25);break;
      case 'crystals':case 'obsidian':case 'frost':case 'astral':
        for(let i=0;i<3;i++){const m=part('cone',color,(i-1)*.45,.65,0,.4,1.3+i*.3,.4,type!=='obsidian');m.rotation.z=(i-1)*.2;}break;
      case 'coral':for(let i=0;i<5;i++){const m=part('box',color,(i-2)*.25,.6,Math.sin(i)*.2,.12,1.2,.12);m.rotation.z=(i-2)*.23;}break;
      case 'clockwork':part('box','#6d654a',0,.8,0,.25,1.6,.25);for(let i=0;i<4;i++)part('box',color,Math.cos(i*Math.PI/2)*.5,1+Math.sin(i*Math.PI/2)*.5,0,.3,.3,.2,true);break;
      case 'ash':part('cone','#333138',0,.55,0,.7,1.1,.7);part('cone',color,0,.8,0,.25,.5,.25,true);break;
      default:
        for(let i=0;i<5;i++){const x=(i-2)*.18,z=Math.sin(i)*.3;part('box','#627c4c',x,.35,z,.07,.7,.07);if(type==='flowers')part('sphere',color,x,.75,z,.18,.12,.18);else if(type==='reeds')part('cone','#c1b284',x,.9,z,.09,.4,.09);}
    }
    return p;
  }
  function batchStatic(root,exclude){
    root.updateMatrixWorld(true);const inverse=root.matrixWorld.clone().invert(),groups=new Map();
    root.traverse(mesh=>{if(!mesh.isMesh||mesh===exclude)return;const key=mesh.geometry.uuid+mesh.material.uuid;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(mesh);});
    for(const meshes of groups.values()){const batch=new Fi(meshes[0].geometry,meshes[0].material,meshes.length);meshes.forEach((mesh,i)=>{batch.setMatrixAt(i,mesh.matrixWorld.clone().premultiply(inverse));mesh.removeFromParent();});batch.castShadow=true;batch.receiveShadow=true;root.add(batch);}
  }
  function animal(species,root,x,z,index){
    const model=new Mn();model.name=species;root.add(model);const color={rabbit:'#bbb2a2',deer:'#98754f',fox:'#c97738',boar:'#655e58',heron:'#d2dad8',owl:'#aea08a',bat:'#605676',firefly:'#defa94',lizard:'#829d63'}[species];
    const flying=['owl','bat','firefly','heron'].includes(species),small=['rabbit','lizard','firefly'].includes(species);
    const body=shape(model,'sphere',color,0,.5,0,.35,.3,.65,species==='firefly');
    shape(model,'sphere',color,0,.8,.55,.25,.25,.3);
    const wings=[],legs=[];
    if(flying){for(const sign of [-1,1])wings.push(shape(model,'box',color,sign*.55,.6,0,.8,.07,.5));}
    else for(const sign of [-1,1])for(const front of [-1,1])legs.push(shape(model,'box',color,sign*.22,.2,front*.4,.12,.4,.12));
    if(['rabbit','deer','fox'].includes(species))for(const sign of [-1,1])shape(model,'cone',color,sign*.15,1.13,.55,.12,species==='rabbit'?.5:.3,.1);
    if(species==='deer')for(const sign of [-1,1]){const horn=shape(model,'box','#d0bd91',sign*.23,1.4,.5,.08,.6,.08);horn.rotation.z=sign*.45;}
    if(species==='fox'||species==='lizard'){const tail=shape(model,'cone',color,0,.45,-.85,.18,.8,.18);tail.rotation.x=Math.PI/2;}
    if(small)model.scale.setScalar(.6);
    return {species,model,wings,legs,body,home:{x,z},phase:index*2.4,flying};
  }
  const currentWave=()=>{for(let wave=0;wave<4;wave++)if(catalog.slice(wave*5,wave*5+5).some(s=>!completed.has(s.id)))return wave;return 4;};
  const state=site=>completed.has(site.id)?'completed':Math.floor(site.index/5)===currentWave()?'available':'locked';
  const available=()=>catalog.filter(s=>state(s)==='available');
  function releaseEnemy(enemy){g.scene.remove(enemy.modelo);enemy.modelo.traverse(o=>{if(o.geometry&&!Object.values(geometry).includes(o.geometry))o.geometry.dispose();if(o.material&&!Array.from(materials.values()).includes(o.material))o.material.dispose?.();});}
  function styleEnemy(enemy,site,boss=false){
    enemy.campaignSite=site.id;enemy.campaignBoss=boss;
    enemy.modelo.traverse(o=>{if(o.isMesh&&o.material?.color){o.material.color.set(boss?site.accent:site.ground);}});
    if(boss){enemy.vidaMax=site.bossHealth;enemy.vida=enemy.vidaMax;enemy.dano=9+Math.floor(site.index/5)*5;enemy.modelo.scale.setScalar(1.5);enemy.campaignName=site.bossName;shape(enemy.modelo,'cone',site.accent,0,1.9,0,.5,.7,.5,true);}
    else {enemy.vidaMax=Math.round(enemy.vidaMax*(.65+Math.floor(site.index/5)*.12));enemy.vida=enemy.vidaMax;enemy.dano=Math.round(enemy.dano*.75);}
    enemy.danoBase=enemy.dano;enemy.velBase=enemy.velocidad;
  }
  function buildSite(site){
    const root=new Mn();root.position.set(site.x,0,site.z);root.name=site.nombre;g.scene.add(root);
    const floor=shape(root,'box',site.ground,0,.035,0,20,.07,20);
    const seal=shape(root,'sphere',site.accent,0,1.4,0,.7,.7,.7,true);
    // Different camp silhouettes: varied tents, banners, cairns and a central relic.
    if(site.kind==='camp'){
      const count=3+site.layout%3;
      for(let i=0;i<count;i++){const a=(i+.5)/count*Math.PI*2,r=7,x=Math.cos(a)*r,z=Math.sin(a)*r;const tent=shape(root,'cone',site.accent,x,1.6,z,2,3.2,2);tent.rotation.y=a;shape(root,'box','#68543b',x,2.2,z,.12,4.4,.12);}
      for(let i=0;i<5;i++)shape(root,'box','#62513d',(i-2)*2,1,-10,.25,2,.25);
    }else{
      for(const x of [-2,2])shape(root,'box',site.ground,x,2.5,0,1,5,1);
      shape(root,'box',site.accent,0,5,0,5,1,1,true);shape(root,'box',site.accent,0,2.4,-.25,3.1,4.4,.12,true);
    }
    const rng=uh(785+site.index*29);
    for(let i=0;i<22;i++){const a=rng()*Math.PI*2,r=12+rng()*7;plant(root,site.flora,Math.cos(a)*r,Math.sin(a)*r,site.accent,.6+rng()*.7);}
    batchStatic(root,seal);
    const wildlife=[];for(let i=0;i<3;i++){const a=i*2.1+site.index;wildlife.push(animal(site.fauna,root,Math.cos(a)*17,Math.sin(a)*17,i));}
    return {root,seal,floor,wildlife,enemies:[],spawned:false,site};
  }
  function refreshSites(){
    for(const site of catalog){const status=state(site);let runtime=sites.get(site.id);if(status==='locked'){if(runtime){g.scene.remove(runtime.root);for(const e of runtime.enemies)releaseEnemy(e);sites.delete(site.id);}continue;}
      if(!runtime){runtime=buildSite(site);sites.set(site.id,runtime);}
      runtime.seal.material=material(status==='completed'?'#d9e5b2':site.accent,true);
      runtime.seal.visible=status!=='completed';
    }
  }
  function spawnCamp(runtime){
    if(runtime.spawned||state(runtime.site)!=='available')return;
    runtime.spawned=true;const s=runtime.site,types=ch(s.salas[0]);types.push(s.salas[0].jefe);
    types.forEach((type,i)=>{const a=i/types.length*Math.PI*2,e=new gg(s.x+Math.cos(a)*5,s.z+Math.sin(a)*5,type);styleEnemy(e,s,i===types.length-1);g.scene.add(e.modelo);g.enemigos.push(e);runtime.enemies.push(e);
      const update=e.update.bind(e);e.update=(dt,target,terrain,hit,castle)=>{
        // Camp guardians never chase the king into the city or another encounter.
        if(Math.hypot(target.pos.x-s.x,target.pos.z-s.z)>24){const dx=s.x-e.pos.x,dz=s.z-e.pos.z,d=Math.hypot(dx,dz);if(d>3){e.pos.x+=dx/d*Math.min(d-3,dt*e.velocidad);e.pos.z+=dz/d*Math.min(d-3,dt*e.velocidad);e.modelo.position.copy(e.pos);}return;}
        update(dt,target,terrain,hit,null);
      };
    });
  }
  function claimGold(){
    const room=Math.max(0,g.economia.capacidad(g.edificios)-(g.economia.recursos.oro||0)),amount=Math.min(room,pendingGold);
    if(amount>0){g.economia.añadir('oro',amount,g.edificios);pendingGold-=amount;}return amount;
  }
  function complete(site){
    if(state(site)!=='available')return false;
    const wave=currentWave();completed.add(site.id);pendingGold+=site.reward;claimGold();
    ui.log(`${site.nombre}: ${site.ending} (+${site.reward} oro)`,'world');refreshSites();
    if(currentWave()>wave)ui.log(currentWave()===4?'Campaña completada: los veinte sellos están a salvo.':`Se han revelado cinco nuevas aventuras del capítulo ${currentWave()+1}.`,'world');
    g.autoguardar();return true;
  }
  class CampaignInterior extends Xg {
    _construir(){
      const s=this.lugar,w=16+s.layout%3,h=4,gap=6;
      this.salas.forEach((room,i)=>{
        const x=room.cx,z=room.cz;
        this._suelo(x,z,w,w);
        this._muro(x,h/2,z-w/2,w+1,h,1,s.ground);this._muro(x,h/2,z+w/2,w+1,h,1,s.ground);
        for(const side of [-1,1]){
          const end=side<0?i===0:i===this.n-1;
          if(end)this._muro(x+side*w/2,h/2,z,1,h,w,s.ground);
          else for(const sign of [-1,1])this._muro(x+side*w/2,h/2,z+sign*(w+gap)/4,1,h,(w-gap)/2,s.ground);
        }
        if(i<this.n-1){const mid=x+13,len=26-w;this._suelo(mid,z,len,gap);this._muro(mid,h/2,z-gap/2-.5,len,h,1,s.ground);this._muro(mid,h/2,z+gap/2+.5,len,h,1,s.ground);const mesh=shape(this.grupo,'box',s.accent,mid,h/2,z,1,h,gap,true),collider=ff(mid,z,1,gap,h);this.colliders.push(collider);room.puerta={mesh,collider};}
        // Theme-specific room furniture stays outside the central combat corridor.
        for(let p=0;p<3;p++){const px=x+(p-1)*4,pz=z+(i%2?1:-1)*(w/2-2);plant(this.grupo,s.flora,px,pz,s.accent,1.2);}
        shape(this.grupo,'box',s.accent,x,2.6,z-w/2+.6,2+.25*i,.2,.1,true);
        const back=z-w/2+1.3;
        if(s.index===1){for(const dx of [-4,4]){shape(this.grupo,'box','#89928e',x+dx,.5,back,2,1,1.1);shape(this.grupo,'box',s.accent,x+dx,1.1,back,.2,.5,1,true);}}
        if(s.index===5){for(const dx of [-4,0,4]){shape(this.grupo,'box','#788fa3',x+dx,1.8,back,2.7,3.6,.4);for(let book=0;book<6;book++)shape(this.grupo,'box',book%2?s.accent:'#8e8ca5',x+dx-1+book*.4,1.8,back+.4,.25,1.5,.3);}}
        if(s.index===7){for(const dx of [-4,4]){shape(this.grupo,'cone','#d4c6a0',x+dx,1,back,1,2,1);shape(this.grupo,'sphere',s.accent,x+dx,2,back,.5,.5,.5);}}
        if(s.index===9){for(const dx of [-5,5]){const root=shape(this.grupo,'box','#716047',x+dx,2,back,.8,4,.8);root.rotation.z=dx>0?-.4:.4;}}
        if(s.index===11){shape(this.grupo,'sphere',s.accent,x,2.5,back,1.2,1.2,1.2,true);for(let star=0;star<8;star++)shape(this.grupo,'sphere','#e8db9b',x+Math.cos(star)*2.5,2.5+Math.sin(star)*1.3,back,.13,.13,.13,true);}
        if(s.index===13){shape(this.grupo,'sphere','#b3914b',x,2,back,2,2,.2);shape(this.grupo,'box','#f4e8b6',x,2.6,back+.3,.1,1.3,.1);const hand=shape(this.grupo,'box','#f4e8b6',x+.4,2.2,back+.3,.9,.1,.1);hand.rotation.z=.4;}
        if(s.index===15){for(const dx of [-5,5]){shape(this.grupo,'cone',s.accent,x+dx,2.7,back,.8,5.4,.8);shape(this.grupo,'box','#7cbac5',x+dx,2.5,back+.5,.9,2,.1,true);}}
        if(s.index===17){for(const dx of [-4,0,4]){shape(this.grupo,'box',s.accent,x+dx,2,back,2,3.6,.3);shape(this.grupo,'box','#141124',x+dx,2,back+.2,1.7,3.3,.1);}}
        if(s.index===19){for(let star=0;star<5;star++){shape(this.grupo,'sphere',s.accent,x+(star-2)*2,2+Math.sin(star),back,.4,.4,.4,true);if(star<4)shape(this.grupo,'box','#767ac9',x+(star-1.5)*2,2.3,back,2,.08,.08,true);}}

        if(room.def.cofre){const cx=x+w/2-2,cz=z+w/2-2;shape(this.grupo,'box','#756044',cx,.5,cz,1.2,1,.8);const lid=shape(this.grupo,'box',s.accent,cx,1.1,cz,1.3,.2,.9,true);room.cofres.push({x:cx,z:cz,tapa:lid,abierto:false});}
      });
      this.salidaInicio={x:this.salas[0].cx-5,z:this.salas[0].cz+5};shape(this.grupo,'cone',s.accent,this.salidaInicio.x,.2,this.salidaInicio.z,1.2,.3,1.2,true);
      this.grupo.traverse(o=>{if(o.isMesh&&o.geometry?.parameters?.height===.2){o.material.color.set(s.ground);o.material.emissive.set(s.ground);}});
    }
    _aparecer(room,enemies){super._aparecer(room,enemies);for(const e of room.enemigos)styleEnemy(e,this.lugar,e===room.jefe);ui.log(`${this.lugar.nombre} · Sala ${room.i+1}: ${room.def.story}`,'world');}
    abrirCofre(chest){super.abrirCofre(chest);ui.log(`Prueba recuperada: ${this.lugar.clue}`,'world');}
    dispose(terrain){super.dispose(terrain);const geometries=new Set(),mats=new Set();this.grupo.traverse(o=>{if(o.geometry&&!Object.values(geometry).includes(o.geometry))geometries.add(o.geometry);if(o.material&&!Array.from(materials.values()).includes(o.material))mats.add(o.material);});for(const geo of geometries)geo.dispose();for(const mat of mats)mat.dispose?.();}
    ready(){return this.jefeMuerto&&this.salas.every(r=>r.spawned&&r.limpia&&r.cofres.every(c=>c.abierto));}
  }
  const originalEnter=g._entrarMazmorra.bind(g),originalExit=g._salirMazmorra.bind(g),originalEvent=g._eventoMazmorra.bind(g),originalLoot=g._sumarBotin.bind(g);
  g._entrarMazmorra=site=>{
    if(!catalog.includes(site))return originalEnter(site);
    if(state(site)!=='available'||site.kind!=='dungeon'||g.mazmorra||g.enInterior||g.rey.muerto||g._hayPanelAbierto()||g.oleadas.activa||Math.hypot(g.rey.pos.x-site.x,g.rey.pos.z-site.z)>5)return false;
    const interior=new CampaignInterior(site,g.scene,g.terreno);g._enemigosCiudad=g.enemigos;g.enemigos=[];g.mazmorra={lugar:site,interior,botin:{oro:0,grimorios:[]},campaign:true};
    const entry=interior.entrada();g._teletransportar(entry.x,entry.z);g.camRig.iniciado=false;ui.log(site.intro,'world');return true;
  };
  g._sumarBotin=loot=>{if(!g.mazmorra?.campaign)return originalLoot(loot);};
  g._eventoMazmorra=event=>{if(!g.mazmorra?.campaign)return originalEvent(event);if(event.tipo==='jefe_muerto')ui.log(`${g.mazmorra.lugar.bossName} ha caído. Recupera las pruebas y vuelve al portal.`,'combat');else if(event.tipo==='sala_limpia')ui.log('Sala despejada: se abre el siguiente corredor.','combat');else if(event.tipo==='jefe_fase')ui.log(`El guardián entra en fase ${event.fase}.`,'combat');};
  g._salirMazmorra=success=>{
    if(!g.mazmorra?.campaign)return originalExit(success);
    const run=g.mazmorra,won=success&&!g.rey.muerto&&run.interior.ready();
    const enemies=new Set([...g.enemigos,...run.interior.salas.flatMap(s=>s.enemigos)]);for(const e of enemies)releaseEnemy(e);
    run.interior.dispose(g.terreno);g.enemigos=g._enemigosCiudad||[];g._enemigosCiudad=null;g.mazmorra=null;g.mazmorraUI.ocultar();g._teletransportar(run.lugar.x,run.lugar.z+5);g.camRig.iniciado=false;
    if(won)complete(run.lugar);else ui.log(success?'Te retiras sin completar el sello. Puedes volver a intentarlo.':'Has caído: el sello sigue pendiente.','world');g._refrescarPaneles();return won;
  };
  const legacyManage=g._gestionarMazmorras.bind(g);
  g._gestionarMazmorras=()=>{
    if(g.mazmorra){legacyManage();if(g.mazmorra?.campaign){const r=g.mazmorra,clues=r.interior.salas.flatMap(s=>s.cofres);g.mazmorraUI.mostrar(`${r.lugar.nombre} · Sala ${r.interior.indiceActual+1}/${r.interior.n} · Pruebas ${clues.filter(c=>c.abierto).length}/${clues.length} · ${r.interior.ready()?'Sal con vida para completar':'Derrota a los guardianes y recupera las pruebas'}`);}return;}
    g.mazmorraUI.ocultar();if(g.enInterior||g.rey.muerto||g._hayPanelAbierto()||g._eTomada)return;
    const site=available().find(s=>Math.hypot(s.x-g.rey.pos.x,s.z-g.rey.pos.z)<4);if(!site)return;
    const prompt=document.getElementById('prompt');prompt.style.display='';
    if(site.kind==='camp'){
      const runtime=sites.get(site.id);spawnCamp(runtime);const left=runtime.enemies.filter(e=>e.vivo).length;prompt.textContent=left?`${site.nombre} · ${left} guardianes restantes`:`E · Recuperar la reliquia de ${site.nombre}`;
      if(!left&&g.input.presionada('KeyE')){g._eTomada=true;complete(site);}
    }else{prompt.textContent=g.oleadas.activa?'Defiende primero el castillo: hay una oleada en marcha.':`E · Entrar en ${site.nombre}`;if(g.input.presionada('KeyE')){g._eTomada=true;g._entrarMazmorra(site);}}
  };
  // Bind progression into both manual slots and the existing automatic save serializer.
  const snapshot=g._estadoPartida.bind(g);g._estadoPartida=()=>({...snapshot(),campana:{version:1,completed:[...completed],pendingGold}});
  function restore(data){
    const ids=new Set(data?.version===1&&Array.isArray(data.completed)?data.completed.filter(id=>typeof id==='string'):[]),valid=new Set();
    for(let wave=0;wave<4;wave++){const batch=catalog.slice(wave*5,wave*5+5);for(const s of batch)if(ids.has(s.id))valid.add(s.id);if(batch.some(s=>!ids.has(s.id)))break;}
    const owned=new Set([...sites.values()].flatMap(r=>r.enemies));g.enemigos=g.enemigos.filter(e=>!owned.has(e));for(const e of owned)releaseEnemy(e);for(const r of sites.values()){g.scene.remove(r.root);r.root.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}
    sites=new Map();completed=valid;const earned=catalog.filter(s=>valid.has(s.id)).reduce((sum,s)=>sum+s.reward,0);pendingGold=Number.isFinite(data?.pendingGold)?Math.max(0,Math.min(earned,data.pendingGold)):0;refreshSites();
  }
  const load=g._aplicarPartida.bind(g);g._aplicarPartida=data=>{if(g.mazmorra?.campaign)g._salirMazmorra(false);load(data);restore(data.campana);};
  function dossier(container){
    container.replaceChildren();const heading=document.createElement('p');heading.id='campaign-progress';heading.textContent=`Los veinte sellos · ${completed.size}/20 completados · ${currentWave()===4?'Campaña terminada':`Capítulo ${currentWave()+1}/4`}`;container.append(heading);
    const instructions=document.createElement('p');instructions.textContent='Completa los cinco encuentros de cada capítulo para revelar los siguientes. B: historias · M: mapa · E: entrar o recuperar una reliquia. Guardar en K conserva la campaña; también se intenta autoguardar al completar un sello.';container.append(instructions);
    const bank=document.createElement('p');bank.id='campaign-reserve';bank.textContent=`Recompensas pendientes de espacio: ${Math.floor(pendingGold)} oro.`;container.append(bank);
    const claim=document.createElement('button');claim.id='campaign-claim';claim.textContent='Reclamar oro pendiente';claim.disabled=pendingGold<=0||!!g.mazmorra;claim.onclick=()=>{const amount=claimGold();ui.log(amount?`Has recibido ${Math.floor(amount)} oro.`:'Amplía el almacén o gasta oro para liberar espacio.','world');g.autoguardar();dossier(container);};container.append(claim);
    for(const s of catalog){const status=state(s),card=document.createElement('article');card.className='campaign-card';card.dataset.site=s.id;card.dataset.state=status;
      const h=document.createElement('h3');h.textContent=`${s.index+1}. ${status==='locked'?'Sello por descubrir':s.nombre}`;card.append(h);
      const meta=document.createElement('p');meta.textContent=status==='locked'?`Se revela al terminar el capítulo ${Math.floor(s.index/5)}.`:`${s.kind==='camp'?'Campamento':'Mazmorra'} · ${s.theme} · ${status==='completed'?'Completado':`${s.reward} oro`}`;card.append(meta);
      if(status!=='locked'){const story=document.createElement('p');story.textContent=status==='completed'?s.ending:s.intro;card.append(story);const goal=document.createElement('p');goal.textContent=s.kind==='camp'?`Derrota a ${s.bossName} y sus guardianes; recupera la reliquia del centro.`:`Despeja ${s.salas.length} salas, recupera ${s.salas.filter(r=>r.cofre).length} pruebas y sal con vida tras derrotar a ${s.bossName}.`;card.append(goal);
        const habitat=document.createElement('small');habitat.textContent=`Fauna: ${{rabbit:'conejos',deer:'ciervos',fox:'zorros',boar:'jabalíes',heron:'garzas',owl:'búhos',bat:'murciélagos',firefly:'luciérnagas',lizard:'lagartos'}[s.fauna]}.`;card.append(habitat);
        if(status==='available'){const b=document.createElement('button');b.textContent='Marcar destino';b.onclick=()=>{ui.setWaypoint({x:s.x,z:s.z+3});ui.log(`Destino: ${s.nombre}`,'navigation');};card.append(b);}}
      container.append(card);
    }
  }
  ui.register('campaign','Aventuras','KeyB',dossier);
  const ambient=g._actualizarAmbiente.bind(g);
  g._actualizarAmbiente=dt=>{
    ambient(dt);elapsed+=dt;
    for(const runtime of sites.values()){
      const s=runtime.site,distance=Math.hypot(g.rey.pos.x-s.x,g.rey.pos.z-s.z);runtime.root.visible=!g.mazmorra&&!g.enInterior&&distance<110;
      if(!g.mazmorra&&!g.enInterior&&distance<28&&s.kind==='camp')spawnCamp(runtime);
      if(!runtime.root.visible)continue;
      runtime.seal.rotation.y=elapsed*.6;runtime.seal.position.y=1.4+Math.sin(elapsed*1.4)*.18;
      for(const a of runtime.wildlife){const phase=elapsed*(a.flying?.7:.25)+a.phase,x=a.home.x+Math.cos(phase)*2,z=a.home.z+Math.sin(phase)*2;const nearby=Math.hypot(g.rey.pos.x-s.x-x,g.rey.pos.z-s.z-z)<4;const flee=nearby?2:0;
        a.model.position.set(x+(x>0?flee:-flee),a.flying?2.5+Math.sin(phase)*.5:0,z);a.model.rotation.y=-phase;for(let i=0;i<a.legs.length;i++)a.legs[i].rotation.x=Math.sin(elapsed*4+a.phase+(i%2)*Math.PI)*.3;for(let i=0;i<a.wings.length;i++)a.wings[i].rotation.z=Math.sin(elapsed*7+a.phase)*.35*(i?1:-1);}
    }
  };
  g.campaign={catalog,state,available,get completed(){return [...completed];},get pendingGold(){return pendingGold;},get wave(){return currentWave();},get sites(){return sites;}};
  refreshSites();
})();
