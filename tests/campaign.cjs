const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8130','--bind','127.0.0.1'],{cwd:require('node:path').resolve(__dirname,'..'),stdio:'ignore'});
 let browser,count=0;const check=(label,value)=>{assert.ok(value,label);console.log(`PASS ${++count} ${label}`);};
 try{
  for(let n=0;n<50;n++){try{if((await fetch('http://127.0.0.1:8130/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8130/Reino-de-Hierro.html');await page.waitForFunction(()=>window.__juego?.campaign,{}, {timeout:90000});
  await page.evaluate(()=>{const g=window.__juego;g._abrirMenu();window.campaignTestStart=g._estadoPartida();});
  check('20 encuentros: 10 campamentos y 10 mazmorras',await page.evaluate(()=>{const c=window.__juego.campaign.catalog;return c.length===20&&c.filter(s=>s.kind==='camp').length===10&&c.filter(s=>s.kind==='dungeon').length===10;}));
  check('20 nombres, historias, desenlaces y temas diferentes',await page.evaluate(()=>['nombre','intro','ending','theme','bossName'].every(key=>new Set(window.__juego.campaign.catalog.map(s=>s[key])).size===20)));
  check('Solo los primeros cinco aparecen inicialmente',await page.evaluate(()=>{const c=window.__juego.campaign;return c.available().length===5&&c.available().every(s=>s.index<5)&&c.sites.size===5;}));
  check('Los grupos bloqueados no pueden iniciarse',await page.evaluate(()=>{const g=window.__juego,s=g.campaign.catalog[5];g.menu.cerrar();g.rey.pos.set(s.x,0,s.z);const denied=g._entrarMazmorra(s)===false;g._abrirMenu();return denied;}));
  await page.keyboard.press('b');check('B abre historias sin revelar títulos futuros',await page.locator('.campaign-card[data-state="available"]').count()===5&&await page.locator('.campaign-card[data-state="locked"]').count()===15);
  await page.locator('.campaign-card[data-state="available"] button').first().click();check('El diario marca un destino real',await page.evaluate(()=>window.__juego.experience.waypoint.x===window.__juego.campaign.catalog[0].x));await page.keyboard.press('Escape');
  check('Flora y fauna presentes en los cinco hábitats',await page.evaluate(()=>[...window.__juego.campaign.sites.values()].every(r=>r.wildlife.length===3&&r.root.children.length>25)));
  check('La fauna se anima en su hábitat',await page.evaluate(()=>{const g=window.__juego,r=g.campaign.sites.values().next().value;g.rey.pos.set(r.site.x,0,r.site.z);g._actualizarAmbiente(.1);const before=r.wildlife[0].model.position.clone();g._actualizarAmbiente(.5);return before.distanceTo(r.wildlife[0].model.position)>0;}));
  check('Los guardianes del campamento aparecen al acercarse',await page.evaluate(()=>{const g=window.__juego,r=g.campaign.sites.get(g.campaign.catalog[0].id);return r.spawned&&r.enemies.length===4&&r.enemies.every(e=>e.vivo);}));
  check('Los guardianes no persiguen al rey hacia la ciudad',await page.evaluate(()=>{const g=window.__juego,r=g.campaign.sites.get(g.campaign.catalog[0].id),e=r.enemies[0];e.pos.set(r.site.x+20,0,r.site.z);g.rey.pos.set(0,0,28);const before=e.pos.distanceTo(g.rey.pos);e.update(1,g.rey,g.terreno,()=>{throw Error('Unexpected distant hit')});return e.pos.distanceTo(g.rey.pos)>before;}));
  check('Interactuar con guardianes vivos no completa un campamento',await page.evaluate(()=>{const g=window.__juego,s=g.campaign.catalog[0];g.menu.cerrar();g.rey.pos.set(s.x,0,s.z);g.input.presionadasEsteFrame.add('KeyE');g._eTomada=false;g._gestionarMazmorras();g.input.finDeFrame();g._abrirMenu();return !g.campaign.completed.includes(s.id);}));
  // Deterministic combat driver uses the real damage and encounter update contracts.
  await page.evaluate(()=>{
    window.campaignRun=(index,mode='finish')=>{
      const g=window.__juego,s=g.campaign.catalog[index];g.experience.close();g.menu.cerrar();g.rey.muerto=false;g.rey.vida=g.rey.vidaMax;g.rey.esquiva=null;g.input.teclas.clear();g.input.presionadasEsteFrame.clear();g.rey.pos.set(s.x,0,s.z);g._eTomada=false;
      const baseColliders=g.terreno.colliders.length,oldRender=g.renderer.render;g.renderer.render=()=>{};
      try{
        if(s.kind==='camp'){
          g._actualizarAmbiente(.01);const r=g.campaign.sites.get(s.id);
          for(const e of r.enemies)e.recibirDano(e.vidaMax+1);
          if(mode==='finish'){g.input.presionadasEsteFrame.add('KeyE');g._gestionarMazmorras();g.input.finDeFrame();}
          return {complete:g.campaign.completed.includes(s.id),colliders:g.terreno.colliders.length===baseColliders};
        }
        if(!g._entrarMazmorra(s))throw Error('Could not enter '+s.nombre);
        const run=g.mazmorra,inside=run.interior;
        if(mode==='early'){g._salirMazmorra(true);return {complete:g.campaign.completed.includes(s.id),colliders:g.terreno.colliders.length===baseColliders};}
        if(mode==='death'){g.rey.muerto=true;g._gestionarMazmorras();g.rey.muerto=false;return {complete:g.campaign.completed.includes(s.id),colliders:g.terreno.colliders.length===baseColliders};}
        for(const room of inside.salas){
          g.rey.pos.set(room.cx,0,room.cz);g._eTomada=false;g._gestionarMazmorras();
          if(!room.spawned||!room.enemigos.length)throw Error('Room did not spawn');
          for(const e of room.enemigos)e.recibirDano(e.vidaMax+1);
          g._gestionarMazmorras();
          if(!room.limpia)throw Error('Room not cleared');
          if(mode!=='no-clues')for(const chest of room.cofres){g.rey.pos.set(chest.x,0,chest.z);g.input.presionadasEsteFrame.add('KeyE');g._gestionarMazmorras();g.input.finDeFrame();if(!chest.abierto)throw Error('Chest did not open');}
        }
        const ready=inside.ready();g.rey.pos.set(inside.salidaBoss.x,0,inside.salidaBoss.z);g.input.presionadasEsteFrame.add('KeyE');g._gestionarMazmorras();g.input.finDeFrame();
        return {complete:g.campaign.completed.includes(s.id),ready,colliders:g.terreno.colliders.length===baseColliders,out:!g.mazmorra};
      }finally{g.renderer.render=oldRender;g._abrirMenu();}
    };
  });
  for(const mode of ['early','death','no-clues']){const result=await page.evaluate(mode=>window.campaignRun(1,mode),mode);check(`Mazmorra: ${mode} no completa ni deja colisiones`,!result.complete&&result.colliders);}
  check('Las recompensas no se entregan por derrotar solo al jefe',await page.evaluate(()=>window.__juego.campaign.completed.length===0));
  // Traverse both corridor transitions with the real character/collision code.
  const traversal=await page.evaluate(()=>{
    const g=window.__juego,s=g.campaign.catalog[1];g.menu.cerrar();g.rey.pos.set(s.x,0,s.z);g._entrarMazmorra(s);const interior=g.mazmorra.interior,a=interior.salas[0],b=interior.salas[1];
    g.rey.pos.set(a.cx,0,a.cz);g._gestionarMazmorras();g.input.teclas.add('KeyW');
    const walk=()=>{for(let i=0;i<180;i++)g.rey.update(.02,g.input,{adelante:g.rey.pos.clone().set(1,0,0)},g.terreno);};
    walk();const blocked=g.rey.pos.x<b.cx-8;
    for(const e of a.enemigos)e.recibirDano(e.vidaMax+1);g.rey.pos.set(a.cx,0,a.cz);g._gestionarMazmorras();g.input.bloqueado=false;walk();const reached=g.rey.pos.x>b.cx-8;
    g.input.teclas.clear();g._salirMazmorra(false);g._abrirMenu();return {blocked,reached};
  });check('Las puertas bloquean y se abren al limpiar la sala',traversal.blocked&&traversal.reached);
  for(let index=0;index<20;index++){
    const before=await page.evaluate(()=>({gold:window.__juego.economia.recursos.oro+window.__juego.campaign.pendingGold,done:window.__juego.campaign.completed.length}));
    const result=await page.evaluate(index=>window.campaignRun(index),index);
    check(`Encuentro ${index+1}: combate, objetivo y salida completan una sola vez`,result.complete&&result.colliders&&(result.out!==false));
    const after=await page.evaluate(index=>{const g=window.__juego;return {done:g.campaign.completed.length,reward:g.campaign.catalog[index].reward,wave:g.campaign.wave,available:g.campaign.available().length,gold:g.economia.recursos.oro+g.campaign.pendingGold};},index);
    assert.equal(after.done,before.done+1);assert.equal(after.gold,before.gold+after.reward);
    assert.equal(after.available,(index+1)%5===0?(index===19?0:5):5-(index+1)%5);
    assert.equal(after.wave,Math.floor((index+1)/5));
    if(index===3)check('Cuatro completados no desbloquean la segunda tanda',after.wave===0&&after.available===1);
    if(index===4){check('Cinco completados desbloquean exactamente otros cinco',after.wave===1&&after.available===5);await page.evaluate(()=>window.__juego.guardarPartida(1));}
    if(index===9||index===14)check(`Se desbloquea el capítulo ${after.wave+1}`,after.available===5);
  }
  check('Campaña cerrada al completar los veinte',await page.evaluate(()=>window.__juego.campaign.completed.length===20&&window.__juego.campaign.available().length===0));
  const rewardOnce=await page.evaluate(()=>{const g=window.__juego,s=g.campaign.catalog[0],gold=g.economia.recursos.oro;g.menu.cerrar();g.rey.pos.set(s.x,0,s.z);g.input.presionadasEsteFrame.add('KeyE');g._eTomada=false;g._gestionarMazmorras();g.input.finDeFrame();g._abrirMenu();return g.economia.recursos.oro===gold;});check('No se pueden repetir recompensas',rewardOnce);
  await page.keyboard.press('b');const reserved=await page.evaluate(()=>window.__juego.campaign.pendingGold);assert.ok(reserved>0);await page.evaluate(()=>window.__juego.economia.recursos.oro-=50);await page.locator('#campaign-claim').click();check('El oro que excede el almacén se conserva y se puede reclamar',await page.evaluate(r=>window.__juego.campaign.pendingGold===r-50,reserved));await page.keyboard.press('Escape');
  await page.evaluate(()=>window.__juego.guardarPartida(2));await page.evaluate(()=>window.__juego.cargarPartida(1));check('Cargar otra ranura restaura su propio capítulo',await page.evaluate(()=>window.__juego.campaign.completed.length===5&&window.__juego.campaign.wave===1));
  await page.evaluate(()=>window.__juego.cargarPartida(2));check('La ranura final conserva los veinte sellos',await page.evaluate(()=>window.__juego.campaign.completed.length===20));
  await page.evaluate(()=>{const g=window.__juego;g._aplicarPartida({...window.campaignTestStart,campana:{version:1,completed:['sello_20','inventado']}});});check('Un guardado incoherente no salta capítulos',await page.evaluate(()=>window.__juego.campaign.completed.length===0));
  await page.evaluate(()=>{const g=window.__juego;const old={...window.campaignTestStart};delete old.campana;g._aplicarPartida(old);});check('Partidas antiguas empiezan con cinco encuentros',await page.evaluate(()=>window.__juego.campaign.available().length===5&&window.__juego.campaign.sites.size===5));
  // Show an actual habitat and a dungeon, and check the graphical frames for runtime errors.
  await page.evaluate(()=>{const g=window.__juego,s=g.campaign.catalog[0];g.rey.pos.set(s.x,0,s.z+18);g._actualizarAmbiente(.1);g.camRig.iniciado=false;g.camRig.pitch=.45;g.camRig.distDeseada=12;g.camRig.yaw=0;g.camRig.update(.1,g.rey.pos,{dx:0,dy:0,rueda:0},g.terreno.colliders);g.renderer.render(g.scene,g.camera);});await page.evaluate(()=>document.body.classList.add('lf-photo'));await page.screenshot({path:'/tmp/loftart-camp.png',timeout:90000});
  await page.evaluate(()=>{const g=window.__juego,s=g.campaign.catalog[1];g.menu.cerrar();g.rey.pos.set(s.x,0,s.z);g._entrarMazmorra(s);g._gestionarMazmorras();g.camRig.iniciado=false;g.camRig.pitch=.5;g.camRig.yaw=Math.PI/2;g.camRig.update(.1,g.rey.pos,{dx:0,dy:0,rueda:0},g.terreno.colliders);g._abrirMenu();g.renderer.render(g.scene,g.camera);});await page.screenshot({path:'/tmp/loftart-dungeon.png',timeout:90000});
  await page.evaluate(()=>{document.body.classList.remove('lf-photo');window.__juego._salirMazmorra(false);});await page.keyboard.press('b');await page.screenshot({path:'/tmp/loftart-adventures.png',timeout:90000});
  assert.deepEqual(errors,[]);console.log(`${count} checks passed; no browser runtime errors.`);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
