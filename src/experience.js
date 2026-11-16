// Player-facing improvements layered over the standalone game.
(() => {
  const g = window.__juego, input = g.input;
  const defaults = {scale:1,contrast:false,motion:matchMedia('(prefers-reduced-motion: reduce)').matches,hints:true,sensitivity:1,invert:false,coordinates:false};
  const read = (key, fallback) => {try {return JSON.parse(localStorage.getItem(key)) ?? fallback;} catch {return fallback;}};
  const write = (key,value) => {try {localStorage.setItem(key,JSON.stringify(value));return true;} catch {return false;}};
  const normalize = value => {
    const result={...defaults};
    if(value && typeof value==='object') for(const key of Object.keys(defaults)) {
      if(typeof defaults[key]==='boolean' && typeof value[key]==='boolean') result[key]=value[key];
      if(typeof defaults[key]==='number' && Number.isFinite(value[key])) result[key]=Math.max(key==='scale'?.8:.25,Math.min(key==='scale'?1.4:2,value[key]));
    }
    return result;
  };
  let prefs=normalize(read('loftart.preferences',{}));
  let progress=read('loftart.training',[]); if(!Array.isArray(progress))progress=[];
  progress=new Set(progress.filter(x=>['move','inventory','help','map','tower'].includes(x)));
  const root=document.createElement('section'); root.id='loftart-tools';
  root.innerHTML=`<nav aria-label="Herramientas del reino"><button data-open="map">Mapa · M</button><button data-open="journal">Diario · J</button><button data-open="settings">Ajustes · O</button><button id="lf-fullscreen">Pantalla completa</button><button id="lf-photo">Ocultar interfaz · F8</button></nav>
    <div id="lf-navigation"><span id="lf-compass"></span><span id="lf-coordinates" hidden></span><span id="lf-destination"></span></div>
    <div id="lf-objective"></div><div id="lf-session"></div><div id="lf-status" role="status"></div>
    <div id="lf-toast" role="status" aria-live="polite"></div>`;
  document.body.append(root);
  const dialog=document.createElement('section');dialog.id='lf-dialog';dialog.hidden=true;dialog.setAttribute('role','dialog');dialog.setAttribute('aria-modal','true');dialog.setAttribute('aria-labelledby','lf-title');
  dialog.innerHTML=`<div class="lf-box"><header><h2 id="lf-title"></h2><button id="lf-close" aria-label="Cerrar ventana">Cerrar · Esc</button></header><div id="lf-content"></div></div>`;
  document.body.append(dialog);
  const $=id=>document.getElementById(id), content=$('lf-content');
  const extensions=new Map(), shortcuts=new Map([['KeyO','settings'],['KeyM','map'],['KeyJ','journal']]);
  let active=null,previousFocus=null,waypoint=null,lastUpdate=-Infinity,session=0,lastTime=null,wasPaused=true,toastUntil=0;
  const events=[];let filter='all', journalSearch='', notifications=true;
  const storedTarget=read('loftart.destination',null);
  if(storedTarget&&Number.isFinite(storedTarget.x)&&Number.isFinite(storedTarget.z)&&Math.abs(storedTarget.x)<=1000&&Math.abs(storedTarget.z)<=1000)waypoint=storedTarget;
  const setWaypoint=point=>{waypoint=point;write('loftart.destination',point);};
  const mapView={zoom:1,center:null,enemies:true,buildings:true,troops:true};
  const mark=id=>{if(!progress.has(id)){progress.add(id);write('loftart.training',[...progress]);}};
  const log=(message,type='world')=>{
    events.unshift({message,type,time:Math.floor(session)});events.length=Math.min(events.length,80);
    $('lf-toast').textContent=notifications?message:'';toastUntil=performance.now()+3500;
    if(active==='journal')renderEvents();
  };
  const clearInput=()=>{input.teclas.clear();input.presionadasEsteFrame.clear();input.botonIzquierdo=input.botonDerecho=false;input.consumirRaton();g.rey.bufferAtaque=false;g.rey.mantenerTimer=0;};
  const apply=()=>{
    root.style.setProperty('--lf-scale',prefs.scale);dialog.style.setProperty('--lf-scale',prefs.scale);
    document.body.classList.toggle('lf-contrast',prefs.contrast);document.body.classList.toggle('lf-motion',prefs.motion);
    $('hint').hidden=!prefs.hints;$('lf-coordinates').hidden=!prefs.coordinates;
  };
  const cameraUpdate=g.camRig.update.bind(g.camRig);
  g.camRig.update=(dt,target,mouse,...args)=>cameraUpdate(dt,target,{...mouse,dx:mouse.dx*prefs.sensitivity,dy:mouse.dy*prefs.sensitivity*(prefs.invert?-1:1)},...args);
  const close=()=>{dialog.hidden=true;active=null;clearInput();previousFocus?.focus();};
  function open(kind){
    if(active===kind){close();return;}
    previousFocus=document.activeElement;active=kind;clearInput();dialog.hidden=false;
    if(document.pointerLockElement)document.exitPointerLock();
    $('lf-title').textContent={settings:'Confort y accesibilidad',map:'Mapa del reino',journal:'Diario y preparación'}[kind]||extensions.get(kind)?.title;
    if(extensions.has(kind))extensions.get(kind).render(content);
    if(kind==='settings')renderSettings();if(kind==='map'){mark('map');renderMap();}if(kind==='journal')renderJournal();
    $('lf-close').focus();
  }
  $('lf-close').onclick=close;
  root.querySelectorAll('[data-open]').forEach(b=>b.onclick=()=>open(b.dataset.open));
  function renderSettings(){
    content.innerHTML=`<p>La partida está pausada mientras consultas esta ventana.</p><div class="lf-settings"></div><button id="lf-reset">Restablecer ajustes</button><button id="lf-camera">Restablecer distancia de cámara</button><p id="lf-save-status" role="status"></p>`;
    const labels={scale:'Tamaño de estas herramientas',contrast:'Alto contraste',motion:'Reducir animaciones de interfaz',hints:'Mostrar guía de controles',sensitivity:'Sensibilidad de cámara',invert:'Invertir cámara vertical',coordinates:'Mostrar coordenadas'};
    for(const [key,label] of Object.entries(labels)){
      const row=document.createElement('label');row.textContent=label;
      const control=document.createElement('input');control.dataset.setting=key;
      if(typeof defaults[key]==='boolean'){control.type='checkbox';control.checked=prefs[key];}
      else {control.type='range';control.min=key==='scale'?.8:.25;control.max=key==='scale'?1.4:2;control.step=.05;control.value=prefs[key];}
      const value=document.createElement('output');value.textContent=control.type==='range'?`${prefs[key].toFixed(2)}×`:'';
      control.oninput=()=>{prefs[key]=control.type==='checkbox'?control.checked:Number(control.value);value.textContent=control.type==='range'?`${prefs[key].toFixed(2)}×`:'';apply();$('lf-save-status').textContent=write('loftart.preferences',prefs)?'Preferencias guardadas':'Preferencias activas solo durante esta sesión';};
      row.append(control,value);content.querySelector('.lf-settings').append(row);
    }
    $('lf-reset').onclick=()=>{prefs={...defaults};apply();write('loftart.preferences',prefs);renderSettings();};
    $('lf-camera').onclick=()=>{g.camRig.distDeseada=initialDistance;g.camRig.iniciado=false;log('Distancia de cámara restablecida','system');};
  }
  const initialDistance=g.camRig.distDeseada;
  function renderMap(){
    content.innerHTML=`<div id="lf-map-tools"><button id="lf-map-zoom-in">Acercar +</button><button id="lf-map-zoom-out">Alejar −</button><button id="lf-map-center">Centrar en el rey</button><button id="lf-map-city">Ver ciudad</button><button id="lf-map-castle">Destino: castillo</button><label><input id="lf-map-enemies" type="checkbox"> Amenazas</label><label><input id="lf-map-buildings" type="checkbox"> Edificios</label><label><input id="lf-map-troops" type="checkbox"> Tropas</label></div><p>Marca un destino con el ratón o tocando el mapa. Norte arriba. El mapa muestra el entorno de la ciudad.</p><canvas id="lf-map" width="400" height="400" role="img" aria-label="Mapa: rey, castillo, ocho torres y enemigos cercanos"></canvas><p>▲ Rey · □ Castillo · ○ Torres · rojo: enemigos · dorado: destino</p><label>Destino accesible <select id="lf-map-target"><option value="">Elige una torre</option>${g.visualUpgrade.towers.map((_,i)=>`<option value="${i}">Torre ${i+1}</option>`).join('')}</select></label><button id="lf-clear-target">Quitar destino</button><p id="lf-map-description"></p>`;
    const choose=(x,z)=>{setWaypoint({x,z});log('Destino marcado en el mapa','navigation');drawMap();};
    $('lf-map').onclick=e=>{const r=e.currentTarget.getBoundingClientRect();const center=mapView.center||{x:0,z:0},span=240/mapView.zoom;choose(center.x+((e.clientX-r.left)/r.width-.5)*span,center.z+((e.clientY-r.top)/r.height-.5)*span);};
    $('lf-map-target').onchange=e=>{if(e.target.value==='')return;const t=g.visualUpgrade.towers[Number(e.target.value)];choose(t.x+Math.cos(t.entry)*6,t.z+Math.sin(t.entry)*6);};
    $('lf-clear-target').onclick=()=>{setWaypoint(null);drawMap();};
    $('lf-map-zoom-in').onclick=()=>{mapView.zoom=Math.min(4,mapView.zoom*2);drawMap();};
    $('lf-map-zoom-out').onclick=()=>{mapView.zoom=Math.max(.5,mapView.zoom/2);drawMap();};
    $('lf-map-center').onclick=()=>{mapView.center={x:g.rey.pos.x,z:g.rey.pos.z};drawMap();};
    $('lf-map-city').onclick=()=>{mapView.center=null;mapView.zoom=1;drawMap();};
    $('lf-map-castle').onclick=()=>choose(g.castillo.x,g.castillo.z+g.castillo.def.tam[2]/2+4);
    for(const key of ['enemies','buildings','troops']){const box=$('lf-map-'+key);box.checked=mapView[key];box.onchange=()=>{mapView[key]=box.checked;drawMap();};}
    drawMap();
  }
  function drawMap(){
    const canvas=$('lf-map');if(!canvas)return;const c=canvas.getContext('2d'),center=mapView.center||{x:0,z:0},span=240/mapView.zoom,project=(n,axis='x')=>200+(n-center[axis])/span*400;
    c.fillStyle='#101f29';c.fillRect(0,0,400,400);c.strokeStyle='#30444d';
    for(let i=0;i<=400;i+=50){c.beginPath();c.moveTo(i,0);c.lineTo(i,400);c.moveTo(0,i);c.lineTo(400,i);c.stroke();}
    c.strokeStyle='#cdb57e';c.lineWidth=3;c.beginPath();g.visualUpgrade.towers.forEach((t,i)=>{c[i?'lineTo':'moveTo'](project(t.x),project(t.z,'z'));});c.closePath();c.stroke();
    for(const t of g.visualUpgrade.towers){c.beginPath();c.arc(project(t.x),project(t.z,'z'),7,0,Math.PI*2);c.stroke();}
    g.visualUpgrade.towers.forEach((t,i)=>{c.fillStyle='#fff';c.fillText(String(i+1),project(t.x)+9,project(t.z,'z'));});
    if(mapView.buildings)for(const b of g.edificios){if(b===g.castillo)continue;c.fillStyle=b.nivel?'#7dafaa':'#7a7885';c.fillRect(project(b.x)-3,project(b.z,'z')-3,6,6);}
    if(mapView.troops)for(const soldier of g.soldados){if(!soldier.vivo)continue;c.fillStyle='#91d5ff';c.fillRect(project(soldier.pos.x)-2,project(soldier.pos.z,'z')-2,4,4);}
    const castle={x:g.castillo.x,z:g.castillo.z};c.fillStyle='#e6d8af';c.fillRect(project(castle.x)-6,project(castle.z,'z')-6,12,12);
    c.fillStyle='#ff8080';for(const e of g.enemigos){if(!mapView.enemies||!e.vivo||!e.pos||Math.abs(e.pos.x-center.x)>span/2||Math.abs(e.pos.z-center.z)>span/2)continue;c.beginPath();c.arc(project(e.pos.x),project(e.pos.z,'z'),3,0,7);c.fill();}
    if(g.campaign)for(const site of g.campaign.available()){const x=project(site.x),z=project(site.z,'z');c.fillStyle=site.accent;c.fillRect(x-5,z-5,10,10);c.fillStyle='#ffffff';c.fillText(String(site.index+1),x+7,z);}
    if(waypoint){c.strokeStyle='#ffd56b';c.beginPath();c.arc(project(waypoint.x),project(waypoint.z,'z'),9,0,7);c.stroke();}
    c.save();c.translate(project(g.rey.pos.x),project(g.rey.pos.z,'z'));c.rotate(-g.camRig.yaw);c.fillStyle='#9fe5dc';c.beginPath();c.moveTo(0,-8);c.lineTo(-5,6);c.lineTo(5,6);c.closePath();c.fill();c.restore();c.fillStyle='white';c.fillText('N ↑',12,20);
    $('lf-map-description').textContent=`Rey: ${Math.round(g.rey.pos.x)}, ${Math.round(g.rey.pos.z)}. ${waypoint?'Destino a '+Math.round(Math.hypot(waypoint.x-g.rey.pos.x,waypoint.z-g.rey.pos.z))+' m.':'Sin destino marcado.'}`;
  }
  const lessons=[['move','Camina con WASD'],['inventory','Consulta tu equipo con I'],['help','Lee la guía con H'],['map','Consulta el mapa con M'],['tower','Sube a una torre por su escalera']];
  const clock=s=>`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`;
  function renderJournal(){
    content.innerHTML=`<h3>Preparación del rey</h3><ul id="lf-lessons"></ul><button id="lf-reset-training">Reiniciar guía</button><h3>Sucesos de esta sesión</h3><label>Filtrar <select id="lf-filter"><option value="all">Todos</option><option value="combat">Combate</option><option value="world">Reino</option><option value="navigation">Exploración</option><option value="system">Sistema</option></select></label><label>Buscar sucesos <input id="lf-journal-search" type="search" maxlength="100"></label><button id="lf-export-journal">Exportar diario</button><button id="lf-clear-journal">Vaciar diario</button><ol id="lf-events"></ol>`;
    for(const [id,label] of lessons){const li=document.createElement('li');li.textContent=`${progress.has(id)?'✓':'○'} ${label}`;$('lf-lessons').append(li);}
    $('lf-journal-search').value=journalSearch;$('lf-journal-search').oninput=e=>{journalSearch=e.target.value;renderEvents();};
    $('lf-export-journal').onclick=()=>{const blob=new Blob([events.map(e=>`${clock(e.time)} · ${e.message}`).join('\n')],{type:'text/plain;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='loftart-diario.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
    $('lf-filter').value=filter;$('lf-filter').onchange=e=>{filter=e.target.value;renderEvents();};
    $('lf-reset-training').onclick=()=>{progress.clear();write('loftart.training',[]);renderJournal();};
    $('lf-clear-journal').onclick=()=>{events.length=0;renderEvents();};renderEvents();
  }
  function renderEvents(){const list=$('lf-events');list.replaceChildren();for(const event of events.filter(e=>(filter==='all'||e.type===filter)&&e.message.toLocaleLowerCase().includes(journalSearch.toLocaleLowerCase()))){const li=document.createElement('li');li.textContent=`${clock(event.time)} · ${event.message}`;list.append(li);}if(!list.children.length){const li=document.createElement('li');li.textContent='Todavía no hay sucesos en esta categoría.';list.append(li);}}
  $('lf-fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{log('Pantalla completa no disponible en este navegador','system');}};
  document.addEventListener('fullscreenchange',()=>{$('lf-fullscreen').textContent=document.fullscreenElement?'Salir de pantalla completa':'Pantalla completa';});
  const photo=()=>{document.body.classList.toggle('lf-photo');};$('lf-photo').onclick=photo;
  window.addEventListener('keydown',e=>{
    const editable=e.target instanceof Element&&e.target.closest('input,textarea,select,[contenteditable="true"]');
    if(active){
      if(e.code==='Escape'){e.preventDefault();e.stopImmediatePropagation();close();return;}
      if(e.code==='Tab'){
        e.preventDefault();e.stopImmediatePropagation();const items=[...dialog.querySelectorAll('button,input,select')].filter(x=>!x.disabled);const index=items.indexOf(document.activeElement);items[(index+(e.shiftKey?-1:1)+items.length)%items.length]?.focus();return;
      }
      // Keep typing and native controls local to the paused dialog.
      e.stopImmediatePropagation();return;
    }
    if(editable)return;
    if(shortcuts.has(e.code)||e.code==='F8'){
      e.preventDefault();e.stopImmediatePropagation();if(e.repeat)return;
      if(e.code==='F8')photo();else open(shortcuts.get(e.code));
    }
  },true);
  const priorPanel=g._hayPanelAbierto.bind(g);g._hayPanelAbierto=()=>!!active||priorPanel();
  const health=document.createElement('span');health.id='lf-health-detail';$('estado-rey').append(health);
  const damage=document.createElement('div');damage.id='lf-damage';damage.setAttribute('aria-hidden','true');document.body.append(damage);
  let lastHealth=g.rey.vida,lastManaLow=false,lastLow=false,lastDodge=g.rey.esquivaCD,lastWave=!!g.oleadas.activa,lastDay=g.oleadas.dia,damageUntil=0;
  const origin=g.rey.pos.clone();
  function update(now){
    const k=g.rey,ratio=k.vida/Math.max(1,k.vidaMax),low=ratio<=.3&&!k.muerto;
    const delta=k.vida-lastHealth;
    if(delta<-.5){log(`−${Math.ceil(-delta)} de vida`,'combat');damageUntil=now+350;}
    if(delta>.5)log(`+${Math.ceil(delta)} de vida`,'combat');
    if(low&&!lastLow)log('Salud crítica: busca refugio o usa curación','combat');
    const manaLow=g.lanzador.mana<g.lanzador.manaMax*.2;
    if(manaLow&&!lastManaLow)log('Maná bajo: espera a que se regenere','combat');
    if(lastDodge>0&&k.esquivaCD<=0)log('Esquiva lista','combat');
    const wave=!!g.oleadas.activa;if(wave&&!lastWave)log('Oleada en marcha: protege el castillo');
    if(!wave&&lastWave)log('La oleada ha terminado');
    if(g.oleadas.dia!==lastDay)log(`Comienza el día ${g.oleadas.dia}`);
    lastHealth=k.vida;lastLow=low;lastManaLow=manaLow;lastDodge=k.esquivaCD;lastWave=wave;lastDay=g.oleadas.dia;
    health.textContent=`${Math.max(0,Math.round(ratio*100))}%${low?' · SALUD CRÍTICA':''}`;
    damage.classList.toggle('visible',now<damageUntil&&!prefs.motion);
    const yaw=((g.camRig.yaw*180/Math.PI)%360+360)%360;
    $('lf-compass').textContent=`${['N','NO','O','SO','S','SE','E','NE'][Math.round(yaw/45)%8]} · ${Math.round(yaw)}°`;
    $('lf-coordinates').textContent=`X ${Math.round(k.pos.x)} · Z ${Math.round(k.pos.z)} · Altura ${k.pos.y.toFixed(1)}`;
    if(waypoint){const distance=Math.hypot(k.pos.x-waypoint.x,k.pos.z-waypoint.z);$('lf-destination').textContent=`Destino · ${Math.round(distance)} m · ${['N','NE','E','SE','S','SO','O','NO'][Math.round((Math.atan2(waypoint.x-k.pos.x,k.pos.z-waypoint.z)*180/Math.PI+360)/45)%8]}`;if(distance<4){setWaypoint(null);log('Has llegado al destino','navigation');}}else $('lf-destination').textContent='';
    if(k.pos.distanceTo(origin)>3)mark('move');if(g.panelInventario.abierto)mark('inventory');if(!$('guia-juego').hidden)mark('help');if(k.pos.y>=g.visualUpgrade.height-.3&&g.visualUpgrade.onDeck(k.pos.x,k.pos.z))mark('tower');
    const next=lessons.find(([id])=>!progress.has(id));$('lf-objective').textContent=wave?'Defiende el castillo de la oleada':next?`Preparación ${progress.size}/5 · ${next[1]}`:'Preparación completa · Equipa a tus tropas y consulta L';
    $('lf-session').textContent=`Tiempo activo ${clock(session)}`;
    $('lf-status').textContent=active||g.menu.abierto||!$('guia-juego').hidden?'Partida pausada':'';
    if(performance.now()>toastUntil)$('lf-toast').textContent='';
  }
  document.addEventListener('visibilitychange',()=>{lastTime=null;});
  const frame=g._frame.bind(g);
  g._frame=now=>{
    const paused=!!active||g.menu.abierto||!$('guia-juego').hidden||document.hidden;
    if(lastTime!==null&&!paused&&!wasPaused)session+=Math.max(0,(now-lastTime)/1000);lastTime=now;wasPaused=paused;
    if(active){g.time.tick(now);g._ultimoAhora=now;input.bloqueado=true;input.finDeFrame();input.consumirRaton();g.renderer.render(g.scene,g.camera);}else frame(now);
    if(now-lastUpdate>=150){lastUpdate=now;update(now);}
  };
  g.experience={open,close,log,resetObservations(){lastHealth=g.rey.vida;lastManaLow=g.lanzador.mana<g.lanzador.manaMax*.2;lastLow=g.rey.vida<=g.rey.vidaMax*.3;lastDodge=g.rey.esquivaCD;lastWave=!!g.oleadas.activa;lastDay=g.oleadas.dia;lastUpdate=-Infinity;},get active(){return active;},get waypoint(){return waypoint;},setWaypoint,
    get paused(){return !!active||g.menu.abierto||!$('guia-juego').hidden||document.hidden;},
    get seconds(){return session;},setNotifications(enabled){notifications=!!enabled;if(!notifications)$('lf-toast').textContent='';},
    register(id,title,key,render){extensions.set(id,{title,render});shortcuts.set(key,id);const b=document.createElement('button');b.dataset.open=id;b.textContent=title+' · '+key.replace('Key','');b.onclick=()=>open(id);root.querySelector('nav').append(b);}
  };
  apply();log('Bienvenido: M mapa · J diario · O ajustes','system');
})();
