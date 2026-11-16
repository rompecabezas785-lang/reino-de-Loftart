"""Exercise the real game: floor topology, doors, stairs and retained features."""
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent/'artifacts';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8001/Reino-de-Hierro.html',timeout=120000)
 page.wait_for_function('window.__juego?.castleExpansion?.version===2',timeout=60000)
 results=page.evaluate('''() => {
 const g=__juego,results=[];function check(ok,label){if(!ok)throw Error(label);results.push(label);}
 g.menu.cerrar();const world=g.terreno.colliders,count=g.habitantes.length;
 check(g.habitantes.filter(h=>h.profesion==='sirviente_castillo').length===8,'8 employees assigned');
 g.panelHabitantes.alternar();check((g.panelHabitantes.el.innerText.match(/Sirviente del castillo/g)||[]).length===8,'8 employees listed');g.panelHabitantes.cerrar();
 g._entrarCastillo({pos:{z:13.33}});const palace=g.enCastillo.interior,ox=-220,oz=220;
 check(palace.floor===0&&g.rey.pos.y===0,'entrance on ground floor');
 check(g.castleExpansion.rooms.filter(r=>r.floor===0).length===1,'throne is the only ground-floor room');
 function pressE(){g.input.presionadasEsteFrame.add('KeyE');g._gestionarFortaleza();g.input.finDeFrame();}
 function free(x,z){return !palace.colliders.some(c=>x+ox>c.minX-.38&&x+ox<c.maxX+.38&&z+oz>c.minZ-.38&&z+oz<c.maxZ+.38);}
 function flood(){const seen=new Set(['0,25']),queue=[[0,25]];for(let q=0;q<queue.length;q++){const [x,z]=queue[q];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(nx < -32||nx>32||nz < -36||nz>33||seen.has(k)||!free(nx,nz))continue;seen.add(k);queue.push([nx,nz]);}}return seen;}
 check(!flood().has('0,-10'),'closed throne doors isolate the room');
 palace.teleport(0,-2);pressE();check(palace.doors[0].open&&flood().has('0,-10'),'E opens a walkable throne entrance');
 palace.teleport(0,-6);pressE();check(!palace.doors[0].open,'throne door closes from inside');pressE();check(palace.doors[0].open,'throne door opens from inside');
 function inspectFloor(id){
   const seen=flood();for(const r of g.castleExpansion.rooms.filter(r=>r.floor===id)){const x=r.type==='throne'?0:r.x+(r.x<0?10:-10),z=r.type==='throne'?-10:r.z;check(seen.has(x+','+z),'walkable room: '+r.name);}
   for(const i of palace.interactions.filter(i=>i.floor===id))check(seen.has(Math.round(i.x)+','+Math.round(i.z)),'reachable interaction: '+i.label);
   check([...palace.levels.values()].filter(l=>l.group.visible).length===1,'only active floor visible: '+id);
   palace.teleport(0,25);for(let i=0;i<20;i++)g.rey.update(.016,g.input,g.camRig,g.terreno);
   check(Math.abs(g.rey.pos.y-palace.height)<.001,'floor supports player: '+id);
   g.camRig.update(.016,g.rey.pos,{dx:0,dy:0,rueda:0},g.terreno.colliders);
   check(g.camera.position.y>palace.height&&g.camera.position.y<palace.height+6.7,'camera inside floor: '+id);
 }
 inspectFloor(0);
 function stairs(target){const up=target>palace.floor;palace.teleport(up?9:-9,28);pressE();check(palace.floor===target,'E stairs to '+target);}
 stairs(-1);inspectFloor(-1);check(!free(-19,8.5),'dungeon bars contain monsters');stairs(0);stairs(1);inspectFloor(1);
 for(const side of [-1,1]){palace.teleport(side<0?-3:3,-17);pressE();check(palace.balcony===side&&g.rey.pos.y===8.3,'balcony at first-floor height '+side);for(let i=0;i<20;i++)g.rey.update(.016,g.input,g.camRig,g.terreno);check(g.rey.pos.y===8.3,'balcony supports player '+side);pressE();check(!palace.balcony&&palace.floor===1&&g.rey.pos.y===8.3,'balcony returns to first floor '+side);}
 palace.teleport(19,15);pressE();check(!!palace.spar,'E starts relocated training');
 g.rey.pos.set(ox+19,8.3,oz+11);g.rey.rotY=Math.PI;palace.strike({alcance:3,cono:160,dano:20});check(palace.spar.dodges===1&&palace.spar.hp===100,'spirit dodges');
 const sp=palace.spirit.position;g.rey.pos.set(ox+sp.x,8.3,oz+sp.z+1);g.rey.rotY=Math.PI;palace.strike({alcance:3,cono:160,dano:20});check(palace.spar.hp===80,'spirit takes hits during recovery');
 const health=g.rey.vida;for(let i=0;i<60;i++)palace.tick(.05);check(palace.spar.attacks>=3&&g.rey.vida<health,'rapid training attacks');
 g.rey.vida=2;palace.spar.cool=0;palace.tick(.05);check(g.rey.vida===1&&!palace.spar&&!g.rey.muerto,'nonlethal training');
 palace.toggleSpar();palace.spar.dodgeCool=10;g.rey.pos.set(ox+19,8.3,oz+11);g.rey.rotY=Math.PI;palace.strike({alcance:3,cono:160,dano:100});check(!palace.spar,'player wins training');
 palace.toggleSpar();stairs(2);check(!palace.spar,'floor change cancels training');inspectFloor(2);
 palace.teleport(-19,15);g.rey.vida=10;pressE();check(g.rey.vida===g.rey.vidaMax,'thermal baths on second floor heal');
 palace.teleport(0,34);check(!palace.salidaCercana(g.rey.pos),'upper floor cannot trigger ground-floor exit');
 stairs(1);stairs(0);palace.teleport(0,32);pressE();check(!g.enCastillo&&g.terreno.colliders===world&&g.terreno.group.visible,'E exits castle and restores exterior');
 check(g.guardarPartida(3),'save succeeds');g.cargarPartida(3);g.cargarPartida(3);check(g.habitantes.length===count,'staff survive save/load without duplication');
 g._entrarCastillo({pos:{z:-13.33}});check(!g.enCastillo.interior.doors[0].open,'reenter initializes throne doors');
 return results;
}''')
 print('\n'.join('PASS '+r for r in results),flush=True)
 # Inspect a real rendered view of each storey after the behavior checks.
 for floor,name in [(0,'vestibulo'),(-1,'sotano'),(1,'primera-planta'),(2,'segunda-planta')]:
  page.evaluate('(id)=>{const p=__juego.enCastillo.interior;p.activateFloor(id);p.teleport(0,25);}',floor)
  before=page.evaluate('__juego.renderer.info.render.frame')
  page.wait_for_function('(before)=>__juego.renderer.info.render.frame>before+2',arg=before,timeout=120000)
  page.screenshot(path=str(out/(name+'.png')))
 assert not errors,errors
 print('PASS no browser JavaScript errors',flush=True)
 b.close()
