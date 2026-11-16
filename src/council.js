// Kingdom tools use the existing simulation and shared paused dialog.
(() => {
  const g=window.__juego,ui=g.experience,$=id=>document.getElementById(id);
  const node=(tag,text,attrs={})=>{const n=document.createElement(tag);if(text!==null)n.textContent=text;for(const [k,v]of Object.entries(attrs))n.setAttribute(k,v);return n;};
  const button=(label,id,fn)=>{const b=node('button',label,{type:'button',id});b.onclick=fn;return b;};
  const field=(parent,label,id,type='search')=>{const l=node('label',label),e=node('input',null,{id,type});l.append(e);parent.append(l);return e;};
  const select=(parent,label,id,items)=>{const l=node('label',label),s=node('select',null,{id});for(const [value,text]of items)s.append(node('option',text,{value}));l.append(s);parent.append(l);return s;};
  const names=key=>String(key).replaceAll('_',' ');
  const distance=b=>Math.hypot(g.rey.pos.x-b.x,g.rey.pos.z-b.z);
  const alive=()=>g.soldados.filter(s=>s.vivo);
  let tab='overview',body,selection=new Set(),sprint=false,pendingSprint=false,lastSave=0,reminded=false;
  const options={threshold:20,reminders:true,notifications:true};
  try{const saved=JSON.parse(localStorage.getItem('loftart.council')||'null');if(saved){if(Number.isFinite(saved.threshold))options.threshold=Math.max(0,Math.min(500,saved.threshold));for(const key of ['reminders','notifications'])if(typeof saved[key]==='boolean')options[key]=saved[key];}}catch{}
  const persist=()=>{try{localStorage.setItem('loftart.council',JSON.stringify(options));}catch{ui.log('Ajustes del reino activos solo en esta sesión','system');}};
  ui.setNotifications(options.notifications);
  let stats,previous;
  function resetStats(){stats={distance:0,damage:0,healing:0,waves:0,towers:new Set(),buildings:new Set(),milestones:new Set()};previous={x:g.rey.pos.x,z:g.rey.pos.z,life:g.rey.vida,wave:!!g.oleadas.activa,resources:{...g.economia.recursos}};}
  resetStats();
  function confirm(parent,message,action){
    parent.querySelector('.lc-confirm')?.remove();const box=node('section',null,{class:'lc-confirm',role:'group','aria-label':'Confirmación'});box.append(node('p',message));
    box.append(button('Confirmar','lc-confirm',()=>{box.remove();action();}),button('Cancelar','lc-cancel',()=>box.remove()));parent.append(box);$('lc-cancel').focus();
  }
  const list=(parent,id)=>{const n=node('div',null,{id,class:'lc-list'});parent.append(n);return n;};
  const empty=container=>{if(!container.children.length)container.append(node('p','No hay resultados para estos filtros.'));};
  const card=(parent,title,text)=>{const n=node('article',null,{class:'lc-card'});n.append(node('strong',title),node('p',text));parent.append(n);return n;};
  const waypoint=b=>{const z=b.z+(b.def?.tam?.[2]||4)/2+4;ui.setWaypoint({x:b.x,z});ui.log(`Destino: ${b.def?.nombre||'edificio'}`,'navigation');};
  function overview(){
    const cards=list(body,'lc-summary');
    card(cards,'Castillo',`${Math.max(0,Math.round(g.castillo.vida/g.castillo.vidaMax*100))}% · ${Math.ceil(g.castillo.vida)} / ${g.castillo.vidaMax}`);
    card(cards,'Población',`${g.habitantes.length} habitantes`);
    card(cards,'Sin asignación',`${g.habitantes.filter(h=>!h.edificioId).length} habitantes sin edificio de trabajo`);
    card(cards,'Tropas heridas',`${alive().filter(s=>s.vida<s.vidaMax).length} de ${alive().length} tropas vivas`);
    card(cards,'Amenazas',`${g.enemigos.filter(e=>e.vivo).length} enemigos vivos en esta zona`);
    const advice=list(body,'lc-advice');
    if(g.castillo.vida/g.castillo.vidaMax<.5)advice.append(node('p','El castillo está dañado: reúne defensores y prioriza su protección.'));
    if(g.habitantes.some(h=>!h.edificioId))advice.append(node('p','Hay habitantes sin asignar: consulta P y distribuye los trabajos.'));
    if(g.economia.recursos.pan<options.threshold)advice.append(node('p','Reserva de pan baja: revisa trigo, molino y panadería.'));
    if(!advice.children.length)advice.append(node('p','Revisa equipo, posiciones y calendario antes de la próxima oleada.'));
    const search=field(body,'Buscar recurso','lc-resource-search');
    const order=select(body,'Orden','lc-resource-sort',[['name','Nombre'],['stock','Menor reserva primero']]);
    const threshold=field(body,'Avisar con reservas inferiores a','lc-threshold','number');threshold.min=0;threshold.max=500;threshold.value=options.threshold;
    const resources=list(body,'lc-resources');
    const render=()=>{resources.replaceChildren();const rows=Object.entries(g.economia.recursos).filter(([k])=>names(k).includes(search.value.toLowerCase()));rows.sort(order.value==='stock'?((a,b)=>a[1]-b[1]):((a,b)=>a[0].localeCompare(b[0])));for(const [key,value]of rows){const c=card(resources,names(key),`${Math.floor(value)}${value<options.threshold?' · RESERVA BAJA':''}`);c.dataset.stock=value;}empty(resources);};
    search.oninput=order.onchange=render;threshold.onchange=()=>{const n=Number(threshold.value);options.threshold=Number.isFinite(n)?Math.max(0,Math.min(500,n)):20;threshold.value=options.threshold;persist();render();};render();
  }
  function buildings(){
    const search=field(body,'Buscar edificio','lc-building-search');
    const type=select(body,'Tipo','lc-building-type',[['all','Todos'],...[...new Set(g.edificios.map(b=>b.def.tipo))].sort().map(t=>[t,names(t)])]);
    const sort=select(body,'Orden','lc-building-sort',[['distance','Más cercano'],['level','Nivel menor primero']]);
    const rows=list(body,'lc-buildings');
    const render=()=>{rows.replaceChildren();const items=g.edificios.filter(b=>(type.value==='all'||b.def.tipo===type.value)&&b.def.nombre.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()));items.sort(sort.value==='level'?((a,b)=>a.nivel-b.nivel):((a,b)=>distance(a)-distance(b)));for(const b of items){const c=card(rows,b.def.nombre,`Nivel ${b.nivel} · ${Math.round(distance(b))} m · ${b.obra?'En construcción':b.nivel===0?'Pendiente de construir':'Construido'}`);c.dataset.building=b.id;c.dataset.distance=distance(b);c.dataset.level=b.nivel;c.append(node('p',b.def.descripcion||'Sin descripción'),button('Marcar entrada',`lc-target-${b.id}`,()=>waypoint(b)));}empty(rows);};search.oninput=type.onchange=sort.onchange=render;render();
  }
  function residents(){
    const search=field(body,'Buscar habitante','lc-resident-search');
    const profession=select(body,'Profesión','lc-profession',[['all','Todas'],...[...new Set(g.habitantes.map(h=>h.profesion))].sort().map(p=>[p,names(p)])]);
    const rows=list(body,'lc-residents');
    const render=()=>{rows.replaceChildren();for(const h of g.habitantes.filter(h=>(profession.value==='all'||profession.value===h.profesion)&&`${h.nombre} ${h.apellido}`.toLocaleLowerCase().includes(search.value.toLocaleLowerCase()))){card(rows,`${h.nombre} ${h.apellido}`,`${names(h.profesion)} · ${names(h.raza)} · Salud ${Math.round(h.salud)} · Hogar: ${h.hogar||'sin hogar'} · Trabajo: ${h.edificioId||'sin asignación'}`);}empty(rows);};search.oninput=profession.onchange=render;render();
  }
  function army(){
    const selected=()=>alive().filter(s=>selection.has(s.id));
    const controls=node('div',null,{class:'lc-actions'}),status=node('p','',{id:'lc-selection',role:'status'});body.append(controls,status);
    const rows=list(body,'lc-army');
    const render=()=>{rows.replaceChildren();for(const s of alive()){const label=node('label',null,{class:'lc-card'}),box=node('input',null,{type:'checkbox','data-soldier':String(s.id)});box.checked=selection.has(s.id);box.onchange=()=>{box.checked?selection.add(s.id):selection.delete(s.id);status.textContent=`${selected().length} tropas seleccionadas`;};label.append(box,node('span',`${s.nombre} · Vida ${Math.ceil(s.vida)}/${s.vidaMax} · Orden: ${names(s.orden?.tipo||'sin orden')}`));rows.append(label);}empty(rows);status.textContent=`${selected().length} tropas seleccionadas`;};
    controls.append(button('Seleccionar todas','lc-army-all',()=>{selection=new Set(alive().map(s=>s.id));render();}),button('Solo heridas','lc-army-wounded',()=>{selection=new Set(alive().filter(s=>s.vida<s.vidaMax).map(s=>s.id));render();}),button('Limpiar selección','lc-army-none',()=>{selection.clear();render();}));
    const orders=node('div',null,{class:'lc-actions'});body.append(orders);
    for(const [id,label]of [['seguir','Seguir al rey'],['mantener','Mantener posición'],['retirarse','Retirarse al castillo'],['defender','Defender el trono'],['punto','Ir al destino del mapa']])orders.append(button(label,'lc-order-'+id,()=>{
      if(!selected().length){status.textContent='Selecciona al menos una tropa viva.';return;}
      if(id==='punto'&&!ui.waypoint){status.textContent='Marca primero un destino en el mapa.';return;}
      const ids=new Set(selected().map(s=>s.id)),point=id==='punto'?{...ui.waypoint}:null;
      confirm(body,`${label}: se dará la orden a ${ids.size} tropas. La simulación continuará al cerrar.`,()=>{const targets=alive().filter(s=>ids.has(s.id));g._ordenar(id,targets,point);ui.log(`Orden ${label}: ${targets.length} tropas`,'combat');render();});
    }));render();
  }
  const shortcuts=[['WASD','Mover al rey'],['Shift','Correr'],['Espacio','Saltar'],['C','Esquivar'],['E','Interactuar con edificio o puerta'],['F','Recoger objetos'],['I','Inventario y equipo'],['P','Habitantes y trabajos'],['L','Calendario de oleadas'],['H','Guía y ayuda'],['M','Mapa y destinos'],['J','Diario'],['O','Ajustes de cámara y accesibilidad'],['K','Centro de mando'],['Q + 1–9','Órdenes a tropas'],['Tab','Mando táctico'],['1–4','Hechizos equipados'],['Escape','Pausa o cerrar ventana'],['F8','Ocultar o restaurar interfaz']];
  function comfort(){
    const sprintButton=button(sprint?'Desactivar carrera':'Activar carrera sin mantener Shift','lc-sprint',()=>{pendingSprint=!sprint;sprint=false;ui.close();});body.append(sprintButton,node('p','La carrera se cancela al pausar, abrir paneles, perder el foco o morir.'));
    const sound=button(g.sonido.activo?'Silenciar sonido':'Activar sonido','lc-sound',()=>{g.sonido.alternar();sound.textContent=g.sonido.activo?'Silenciar sonido':'Activar sonido';});body.append(sound);
    for(const [key,label]of [['notifications','Mostrar avisos breves'],['reminders','Recordar guardar cada diez minutos activos']]){const box=field(body,label,'lc-'+key,'checkbox');box.checked=options[key];box.onchange=()=>{options[key]=box.checked;persist();ui.setNotifications(options.notifications);};}
    const search=field(body,'Buscar control','lc-shortcut-search'),rows=list(body,'lc-shortcuts');const render=()=>{rows.replaceChildren();for(const [key,label]of shortcuts.filter(pair=>pair.join(' ').toLocaleLowerCase().includes(search.value.toLocaleLowerCase())))card(rows,key,label);empty(rows);};search.oninput=render;render();
  }
  function saves(){
    body.append(node('p',g._motivoNoGuardar()||'Puedes guardar ahora. Las ranuras usan el almacenamiento de este navegador.',{id:'lc-save-reason'}));
    const summaries=g._resumenPartidas();
    summaries.ranuras.forEach((save,i)=>{const c=card(body,`Ranura ${i+1}`,save?`Día ${save.dia} · ${save.habitantes} habitantes · ${new Date(save.guardadoEn).toLocaleString()}`:'Vacía');c.dataset.slot=i+1;
      const b=button('Guardar aquí','lc-save-'+(i+1),()=>confirm(body,save?`Reemplazar la partida de la ranura ${i+1}.`:`Guardar en la ranura ${i+1}.`,()=>{const ok=g.guardarPartida(i+1);if(ok){ui.log(`Partida guardada en ranura ${i+1}`,'system');show();}else ui.log(g._motivoNoGuardar()||'No se pudo guardar','system');}));b.disabled=!!g._motivoNoGuardar();c.append(b);
    });
    card(body,'Autoguardado',summaries.auto?`Día ${summaries.auto.dia} · ${summaries.auto.habitantes} habitantes`:'Todavía no disponible');
  }
  function goals(){
    const grid=list(body,'lc-stats');
    for(const [key,label,value]of [['distance','Distancia recorrida',`${Math.floor(stats.distance)} m`],['damage','Daño recibido',Math.round(stats.damage)],['healing','Vida recuperada',Math.round(stats.healing)],['waves','Oleadas terminadas sin derrota',stats.waves],['towers','Torres visitadas',`${stats.towers.size}/8`],['buildings','Edificios visitados',`${stats.buildings.size}/${g.edificios.length}`]]){const c=card(grid,label,String(value));c.dataset.stat=key;}
    const gain=Math.max(0,(g.economia.recursos.pan||0)-(previous.resources.pan||0));
    card(body,'Patrulla de las ocho torres',`${stats.towers.size}/8 · Visita las ocho entradas para completar el recorrido.`).id='lc-patrol';
    card(body,'Reserva de pan',`${Math.min(50,Math.floor(gain))}/50 · Aumenta tu reserva en 50 panes respecto al inicio del seguimiento.`).id='lc-supply-goal';
    const achieved=card(body,'Hitos de esta sesión',[...stats.milestones].join(' · ')||'Aún no hay hitos');achieved.id='lc-milestones';
    body.append(button('Reiniciar seguimiento','lc-reset-stats',()=>confirm(body,'¿Reiniciar estadísticas y objetivos de esta sesión? La partida se conserva.',()=>{resetStats();show();})));
  }
  const tabs=[['overview','Resumen',overview],['buildings','Edificios',buildings],['residents','Habitantes',residents],['army','Ejército',army],['comfort','Controles',comfort],['saves','Guardar',saves],['goals','Objetivos',goals]];
  function show(){body.replaceChildren();tabs.find(t=>t[0]===tab)[2]();$('lc-tabs').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===tab)));}
  ui.register('council','Reino','KeyK',container=>{
    container.replaceChildren();const nav=node('nav',null,{id:'lc-tabs','aria-label':'Secciones del centro de mando'});container.append(nav);
    for(const [id,label]of tabs){const b=button(label,'lc-tab-'+id,()=>{tab=id;show();});b.dataset.tab=id;nav.append(b);}
    body=node('section',null,{id:'lc-body','aria-label':'Contenido del centro de mando'});container.append(body);show();
  });
  const held=g.input.abajo.bind(g.input);g.input.abajo=code=>held(code)||(code==='ShiftLeft'&&sprint&&!ui.paused&&!g._hayPanelAbierto()&&!g.rey.muerto);
  const cancelSprint=()=>{sprint=false;pendingSprint=false;};window.addEventListener('blur',cancelSprint);document.addEventListener('visibilitychange',()=>{if(document.hidden)cancelSprint();});
  const save=g.guardarPartida.bind(g);g.guardarPartida=slot=>{const result=save(slot);if(result){lastSave=ui.seconds;reminded=false;}return result;};
  const load=g._aplicarPartida.bind(g);g._aplicarPartida=data=>{load(data);ui.resetObservations();resetStats();selection.clear();cancelSprint();lastSave=ui.seconds;reminded=false;};
  let lastUpdate=-Infinity;
  const frame=g._frame.bind(g);
  g._frame=now=>{
    if(pendingSprint&&!ui.paused&&!g._hayPanelAbierto()){sprint=true;pendingSprint=false;}
    if(sprint&&(ui.paused||g._hayPanelAbierto()||g.rey.muerto))sprint=false;
    frame(now);
    if(now-lastUpdate<250)return;lastUpdate=now;
    const k=g.rey,travel=Math.hypot(k.pos.x-previous.x,k.pos.z-previous.z);
    if(!ui.paused&&travel<20)stats.distance+=travel;
    previous.x=k.pos.x;previous.z=k.pos.z;
    const delta=k.vida-previous.life;if(delta<0)stats.damage-=delta;else stats.healing+=delta;previous.life=k.vida;
    if(previous.wave&&!g.oleadas.activa&&!g.derrotado)stats.waves++;previous.wave=!!g.oleadas.activa;
    if(!k.muerto&&!g.enInterior&&!g.mazmorra){g.visualUpgrade.towers.forEach((t,i)=>{if(Math.hypot(k.pos.x-t.x,k.pos.z-t.z)<8)stats.towers.add(i);});for(const b of g.edificios)if(b.distanciaA(k.pos.x,k.pos.z)<4)stats.buildings.add(b.id);}
    for(const [name,completed]of [['Patrulla completa',stats.towers.size===8],['Reserva reforzada',(g.economia.recursos.pan||0)-(previous.resources.pan||0)>=50],['Explorador: 500 m',stats.distance>=500]])if(completed&&!stats.milestones.has(name)){stats.milestones.add(name);ui.log(`Hito: ${name}`,'world');}
    if(options.reminders&&!reminded&&ui.seconds-lastSave>=600&&!g._motivoNoGuardar()){reminded=true;ui.log('Llevas diez minutos activos sin guardar manualmente. K → Guardar.','system');}
  };
})();
