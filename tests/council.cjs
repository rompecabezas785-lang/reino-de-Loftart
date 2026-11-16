const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {spawn}=require('node:child_process');
(async()=>{
 const server=spawn('python3',['-m','http.server','8129','--bind','127.0.0.1'],{cwd:require('node:path').resolve(__dirname,'..'),stdio:'ignore'});
 let browser,count=0;const check=(name,value)=>{assert.ok(value,name);console.log(`PASS ${++count} ${name}`);};
 try{
  for(let i=0;i<50;i++){try{if((await fetch('http://127.0.0.1:8129/')).ok)break;}catch{}await new Promise(r=>setTimeout(r,100));}
  browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8129/Reino-de-Hierro.html');await page.waitForFunction(()=>window.__juego?._ultimoAhora>0,{}, {timeout:90000});
  await page.keyboard.press('k');
  const click=id=>page.locator('#'+id).evaluate(el=>el.click());
  const change=(id,value)=>page.locator('#'+id).evaluate((el,v)=>{if(el.type==='checkbox')el.checked=v;else el.value=v;el.dispatchEvent(new Event(el.tagName==='SELECT'||el.type==='checkbox'||el.type==='number'?'change':'input',{bubbles:true}));},value);
  const text=id=>page.locator('#'+id).textContent();
  const tab=id=>click('lc-tab-'+id);
  const open=kind=>page.evaluate(kind=>{const u=window.__juego.experience;if(u.active!==kind)u.open(kind);},kind);
  const step=()=>page.evaluate(()=>{window.testNow=Math.max(window.testNow||0,performance.now())+300;window.__juego._frame(window.testNow);});
  await page.evaluate(()=>{window.__juego._abrirMenu();});
  check('01 Centro de mando con K',await page.locator('#lc-tabs').isVisible());
  check('02 Estado real del castillo',/100%.*2000/.test(await text('lc-summary')));
  check('03 Censo de población',await page.evaluate(()=>document.getElementById('lc-summary').textContent.includes(`${window.__juego.habitantes.length} habitantes`)));
  check('04 Habitantes sin asignación',/sin edificio de trabajo/.test(await text('lc-summary')));
  check('05 Recuento de tropas heridas',/0 de 0 tropas vivas/.test(await text('lc-summary')));
  check('06 Amenazas excluyen enemigos muertos',await page.evaluate(()=>{const g=window.__juego,e=g.enemigos[0];e.vivo=false;document.getElementById('lc-tab-overview').click();const ok=document.getElementById('lc-summary').textContent.includes(`${g.enemigos.filter(x=>x.vivo).length} enemigos vivos`);e.vivo=true;return ok;}));
  await change('lc-resource-search','piedra');check('07 Búsqueda de recursos',await page.locator('#lc-resources article').count()===1&&/piedra/.test(await text('lc-resources')));await change('lc-resource-search','');
  await change('lc-resource-sort','stock');check('08 Recursos ordenados por reserva',await page.locator('#lc-resources article').evaluateAll(rows=>rows.every((r,i)=>!i||+r.dataset.stock>=+rows[i-1].dataset.stock)));
  await change('lc-threshold',301);check('09 Umbral configurable de escasez',/RESERVA BAJA/.test(await text('lc-resources')));await change('lc-threshold',20);
  check('10 Consejos según estado del reino',/trabajos|panadería|equipo/.test(await text('lc-advice')));
  await tab('buildings');await change('lc-building-search','escuela');check('11 Búsqueda de edificios',await page.locator('#lc-buildings article').count()===1);await change('lc-building-search','');
  await change('lc-building-type','castillo');check('12 Filtro por tipo de edificio',await page.locator('#lc-buildings article').count()===1);await change('lc-building-type','all');
  check('13 Orden por distancia',await page.locator('#lc-buildings article').evaluateAll(rows=>rows.every((r,i)=>!i||+r.dataset.distance>=+rows[i-1].dataset.distance)));
  await change('lc-building-sort','level');check('14 Orden por nivel',await page.locator('#lc-buildings article').evaluateAll(rows=>rows.every((r,i)=>!i||+r.dataset.level>=+rows[i-1].dataset.level)));
  check('15 Estado de edificios sin construir',/Pendiente de construir/.test(await text('lc-buildings')));
  await click('lc-target-escuela_magica');check('16 Destino frente a la entrada del edificio',await page.evaluate(()=>{const g=window.__juego,b=g.edificios.find(b=>b.id==='escuela_magica'),p=g.experience.waypoint;return p.x===b.x&&p.z>b.z+b.def.tam[2]/2;}));
  check('17 Descripciones útiles de edificios',/Forma magos/.test(await text('lc-buildings')));
  await tab('residents');const resident=await page.evaluate(()=>{const h=window.__juego.habitantes[0];return {name:`${h.nombre} ${h.apellido}`,profession:h.profesion};});await change('lc-resident-search',resident.name);check('18 Búsqueda de habitantes',await page.locator('#lc-residents article').count()>=1&&await page.locator('#lc-residents article').count()<5);await change('lc-resident-search','');
  await change('lc-profession',resident.profession);check('19 Filtro de profesión',await page.locator('#lc-residents article').evaluateAll((rows,p)=>rows.every(r=>r.textContent.includes(p.replaceAll('_',' '))),resident.profession));
  check('20 Hogar, salud y trabajo visibles',/Hogar:.*Trabajo:/.test(await text('lc-residents')));
  await page.evaluate(()=>{const g=window.__juego;window.originalArmy=g.soldados;g.soldados=[{id:901,nombre:'Guardia sana',vivo:true,vida:100,vidaMax:100,pos:g.rey.pos.clone(),orden:{tipo:'seguir'}},{id:902,nombre:'Guardia herida',vivo:true,vida:30,vidaMax:100,pos:g.rey.pos.clone(),orden:{tipo:'seguir'}},{id:903,nombre:'Baja',vivo:false,vida:0,vidaMax:100,pos:g.rey.pos.clone(),orden:{tipo:'seguir'}}];});
  await tab('army');await page.locator('[data-soldier="901"]').evaluate(el=>el.click());check('21 Selección individual de tropas vivas',await page.locator('#lc-army input').count()===2&&/1 tropas/.test(await text('lc-selection')));
  await click('lc-army-wounded');check('22 Seleccionar heridas',await page.locator('[data-soldier="902"]').isChecked()&&!await page.locator('[data-soldier="901"]').isChecked());
  await click('lc-army-all');check('23 Seleccionar todas las tropas vivas',/2 tropas/.test(await text('lc-selection')));
  await click('lc-army-none');check('24 Limpiar selección',/0 tropas/.test(await text('lc-selection')));await click('lc-army-all');
  for(const [n,order,label]of [[25,'seguir','Seguir'],[26,'mantener','Mantener'],[27,'retirarse','Retirarse'],[28,'defender','Defender'],[29,'punto','Destino del mapa']]){
   await click('lc-order-'+order);await click('lc-confirm');check(`${n} Orden ${label} aplicada al ejército`,await page.evaluate(order=>window.__juego.soldados.filter(s=>s.vivo).every(s=>s.orden.tipo===order&&(order!=='punto'||Number.isFinite(s.orden.punto.x))),order));
  }
  await click('lc-order-seguir');await click('lc-cancel');const before=await page.evaluate(()=>window.__juego.soldados[0].orden.tipo);await click('lc-army-none');await click('lc-order-mantener');check('30 Confirmación cancelable y guardia sin selección',before==='punto'&&/Selecciona/.test(await text('lc-selection')));
  await open('map');
  const capture=async()=>page.evaluate(()=>{const ctx=document.getElementById('lf-map').getContext('2d'),rect=ctx.fillRect,arc=ctx.arc,fill=ctx.fillText,report={buildings:0,troops:0,enemies:0,labels:[]};ctx.fillRect=function(x,z,w,h){if(w===6)report.buildings++;if(w===4)report.troops++;return rect.apply(this,arguments);};ctx.arc=function(x,y,r){if(r===3)report.enemies++;return arc.apply(this,arguments);};ctx.fillText=function(t){report.labels.push(t);return fill.apply(this,arguments);};document.getElementById('lf-map-city').click();ctx.fillRect=rect;ctx.arc=arc;ctx.fillText=fill;return report;});
  let drawn=await capture();check('31 Edificios dibujados en mapa',drawn.buildings>10);check('32 Numeración de ocho torres',Array.from({length:8},(_,i)=>String(i+1)).every(n=>drawn.labels.includes(n)));
  await click('lf-map-castle');check('33 Destino al acceso del castillo',await page.evaluate(()=>window.__juego.experience.waypoint.z>window.__juego.castillo.def.tam[2]/2));
  await click('lf-map-center');await page.locator('#lf-map').click({position:{x:200,y:200}});check('34 Centrar mapa en el rey',await page.evaluate(()=>{const g=window.__juego;return Math.hypot(g.experience.waypoint.x-g.rey.pos.x,g.experience.waypoint.z-g.rey.pos.z)<2;}));
  await click('lf-map-city');await click('lf-map-zoom-in');await page.locator('#lf-map').click({position:{x:300,y:200}});check('35 Zoom conserva coordenadas del destino',await page.evaluate(()=>Math.abs(window.__juego.experience.waypoint.x-30)<2));
  await change('lf-map-enemies',false);drawn=await capture();check('36 Capa de amenazas ocultable',drawn.enemies===0);await change('lf-map-enemies',true);
  check('37 Tropas vivas dibujadas en mapa',drawn.troops===2);
  await change('lf-map-target','0');check('38 Destino fuera de la torre',await page.evaluate(()=>{const g=window.__juego,t=g.visualUpgrade.towers[0],p=g.experience.waypoint;return Math.abs(Math.hypot(t.x-p.x,t.z-p.z)-6)<.001;}));
  check('39 Destino almacenado',await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('loftart.destination'));return p.x===window.__juego.experience.waypoint.x;}));
  await step();check('40 Orientación cardinal del destino',/ m · [NSEO]/.test(await text('lf-destination')));
  await page.evaluate(()=>{window.__juego.soldados=window.originalArmy;});await open('council');await tab('comfort');
  await click('lc-sprint');await page.evaluate(()=>window.__juego.menu.cerrar());await step();check('41 Carrera sin mantener Shift',await page.evaluate(()=>window.__juego.input.abajo('ShiftLeft')));
  await open('council');await step();check('42 La pausa cancela la carrera',!await page.evaluate(()=>window.__juego.input.abajo('ShiftLeft')));
  await tab('comfort');await change('lc-shortcut-search','esquivar');check('43 Buscador de controles',await page.locator('#lc-shortcuts article').count()===1&&/C/.test(await text('lc-shortcuts')));
  const sound=await page.evaluate(()=>window.__juego.sonido.activo);await click('lc-sound');check('44 Alternar sonido',await page.evaluate(()=>window.__juego.sonido.activo)!==sound);await click('lc-sound');
  await change('lc-notifications',false);await page.evaluate(()=>window.__juego.experience.log('Prueba silenciosa','system'));check('45 Avisos desactivables sin perder diario',await text('lf-toast')==='');await change('lc-notifications',true);
  await open('journal');await change('lf-journal-search','Prueba silenciosa');check('46 Búsqueda textual del diario',await page.locator('#lf-events li').count()===1&&/Prueba silenciosa/.test(await text('lf-events')));
  const download=page.waitForEvent('download');await click('lf-export-journal');const file=await download;check('47 Exportación del diario',file.suggestedFilename()==='loftart-diario.txt');
  await open('council');await tab('comfort');check('48 Recordatorio de guardado configurable',await page.locator('#lc-reminders').isChecked());await change('lc-reminders',false);await change('lc-reminders',true);
  await tab('saves');check('49 Resumen de tres ranuras',await page.locator('[data-slot]').count()===3);
  await click('lc-save-1');await click('lc-cancel');assert.equal(await page.evaluate(()=>window.__juego._resumenPartidas().ranuras[0]),null);await click('lc-save-1');await click('lc-confirm');check('50 Guardado real con confirmación',await page.evaluate(()=>window.__juego._resumenPartidas().ranuras[0]?.dia===window.__juego.oleadas.dia));
  await tab('goals');await click('lc-reset-stats');await click('lc-confirm');
  await page.evaluate(()=>{const g=window.__juego;g.experience.close();g.menu.cerrar();g.rey.pos.x+=3;});await step();await open('council');await tab('goals');check('51 Distancia recorrida medida',parseInt(await page.locator('[data-stat="distance"] p').textContent())>=2);
  await page.evaluate(()=>{const g=window.__juego;g.rey.vida-=10;});await step();await tab('goals');check('52 Daño recibido medido',parseInt(await page.locator('[data-stat="damage"] p').textContent())===10);
  await page.evaluate(()=>{window.__juego.rey.vida+=5;});await step();await tab('goals');check('53 Recuperación de vida medida',parseInt(await page.locator('[data-stat="healing"] p').textContent())===5);
  await page.evaluate(()=>{window.__juego.oleadas.activa={};});await step();await page.evaluate(()=>{window.__juego.oleadas.activa=null;});await step();await tab('goals');check('54 Oleada terminada registrada',parseInt(await page.locator('[data-stat="waves"] p').textContent())===1);
  await page.evaluate(()=>{const g=window.__juego,t=g.visualUpgrade.towers[0];g.rey.pos.set(t.x,0,t.z);});await step();await tab('goals');check('55 Torres visitadas contadas una sola vez',/1\/8/.test(await page.locator('[data-stat="towers"]').textContent()));await step();
  await page.evaluate(()=>{const g=window.__juego,b=g.edificios[0];g.rey.pos.set(b.x,0,b.z+b.def.tam[2]/2+1);});await step();await tab('goals');check('56 Edificios visitados registrados',parseInt(await page.locator('[data-stat="buildings"] p').textContent())>=1);
  await page.evaluate(()=>{const g=window.__juego;const render=g.renderer.render;g.renderer.render=()=>{};try{for(const t of g.visualUpgrade.towers){g.rey.pos.set(t.x,0,t.z);window.testNow+=300;g._frame(window.testNow);}}finally{g.renderer.render=render;}});await tab('goals');check('57 Patrulla de las ocho torres',/8\/8/.test(await text('lc-patrol')));
  await page.evaluate(()=>{window.__juego.economia.recursos.pan+=50;});await step();await tab('goals');check('58 Objetivo de abastecimiento',/50\/50/.test(await text('lc-supply-goal')));
  check('59 Hitos alcanzados visibles',/Patrulla completa.*Reserva reforzada/.test(await text('lc-milestones')));
  await click('lc-reset-stats');await click('lc-cancel');assert.match(await text('lc-patrol'),/8\/8/);await click('lc-reset-stats');await click('lc-confirm');check('60 Reinicio de seguimiento con cancelación',/0\/8/.test(await text('lc-patrol')));
  // Additional regressions: a paused council cannot advance combat, unsafe saves are disabled,
  // kingdom state survives real save/load, and targets survive reload.
  await page.evaluate(()=>{const g=window.__juego;g.oleadas.activa={};});await tab('saves');assert.equal(await page.locator('#lc-save-1').isDisabled(),true);await page.evaluate(()=>{window.__juego.oleadas.activa=null;});
  await page.evaluate(()=>{const g=window.__juego;g.economia.recursos.oro=999;g.cargarPartida(1);});assert.notEqual(await page.evaluate(()=>window.__juego.economia.recursos.oro),999);
  await tab('overview');await page.screenshot({path:'/tmp/loftart-council.png'});await page.setViewportSize({width:390,height:700});assert.ok(await page.locator('.lf-box').evaluate(e=>e.getBoundingClientRect().right<=innerWidth));await page.screenshot({path:'/tmp/loftart-council-mobile.png'});
  // Verify the reminder fires after active time, rather than merely checking its preference.
  await page.evaluate(()=>{const g=window.__juego;g.experience.close();g.menu.cerrar();window.testNow=Math.max(window.testNow||0,performance.now())+300;g._frame(window.testNow);window.testNow+=600100;g._frame(window.testNow);g.experience.open('journal');});
  await change('lf-journal-search','diez minutos');assert.match(await text('lf-events'),/diez minutos/);
  await page.evaluate(()=>window.__juego.experience.setWaypoint({x:47,z:31}));await page.reload();await page.waitForFunction(()=>window.__juego?._ultimoAhora>0,{}, {timeout:90000});assert.deepEqual(await page.evaluate(()=>window.__juego.experience.waypoint),{x:47,z:31});
  assert.deepEqual(errors,[]);console.log(`${count} checks passed; no browser runtime errors.`);
 }finally{await browser?.close();server.kill();}
})().catch(e=>{console.error(e);process.exitCode=1;});
