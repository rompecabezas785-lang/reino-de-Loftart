"""Integration checks against the real bundled game and expansion."""
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent/'artifacts';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8001/Reino-de-Hierro.html',timeout=120000)
 page.wait_for_function('window.__juego?.castleExpansion',timeout=60000)
 results=page.evaluate('''() => {
 const g=__juego, results=[];function check(ok,label){if(!ok)throw Error(label);results.push(label);}
 g.menu.cerrar();const world=g.terreno.colliders, count=g.habitantes.length;
 check(g.habitantes.filter(h=>h.profesion==='sirviente_castillo').length===8,'8 employees assigned');
 g.panelHabitantes.alternar();check((g.panelHabitantes.el.innerText.match(/Sirviente del castillo/g)||[]).length===8,'8 employees in inhabitants panel');g.panelHabitantes.cerrar();
 g._entrarCastillo({pos:{z:13.33}});const palace=g.enCastillo.interior;
 check(palace.colliders.length>100,'interior colliders installed');
 const ox=-220,oz=220;
 function free(x,z){return !palace.colliders.some(c=>x+ox>c.minX-.38&&x+ox<c.maxX+.38&&z+oz>c.minZ-.38&&z+oz<c.maxZ+.38);}
 // Flood fill tests actual collision topology, including each room's entrance.
 const seen=new Set(),queue=[[0,37]];seen.add('0,37');for(let q=0;q<queue.length;q++){const [x,z]=queue[q];for(const [dx,dz]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,nz=z+dz,k=nx+','+nz;if(nx < -32||nx>32||nz < -59||nz>39||seen.has(k)||!free(nx,nz))continue;seen.add(k);queue.push([nx,nz]);}}
 for(const r of g.castleExpansion.rooms.slice(0,9)){const x=r.type==='throne'?0:r.x+(r.x<0?9:-9),z=r.type==='throne'?-43:r.z;check(seen.has(x+','+z),'walkable: '+r.name);}
 function pressE(){g.input.presionadasEsteFrame.add('KeyE');g._gestionarFortaleza();g.input.finDeFrame();}
 palace.teleport(3,35);pressE();check(g.rey.pos.x===ox+65,'E enters dungeon');
 check(!free(65,28.5),'prison bars block player');palace.teleport(65,37);pressE();check(g.rey.pos.x===ox+3,'E exits dungeon');
 palace.teleport(3,15);pressE();check(g.rey.pos.x===ox+65,'E enters staff quarters');palace.teleport(65,-3);pressE();check(g.rey.pos.x===ox+3,'E exits staff quarters');
 for(const side of [-1,1]){palace.teleport(side<0?-3:3,-37);pressE();check(palace.balcony===side&&g.rey.pos.y===8.3,'E reaches balcony '+side);for(let i=0;i<30;i++)g.rey.update(.016,g.input,g.camRig,g.terreno);check(g.rey.pos.y===8.3,'balcony floor supports player '+side);pressE();check(!palace.balcony&&g.rey.pos.y===0,'E returns from balcony '+side);}
 palace.teleport(19,15);g.rey.vida=10;pressE();check(g.rey.vida===g.rey.vidaMax,'thermal bath heals');
 palace.teleport(-19,35);pressE();check(!!palace.spar,'E starts training');
 g.rey.pos.set(ox-19,0,oz+31);g.rey.rotY=Math.PI;palace.strike({alcance:3,cono:160,dano:20});check(palace.spar.dodges===1&&palace.spar.hp===100,'spirit dodges player attack');
 const sp=palace.spirit.position;g.rey.pos.set(ox+sp.x,0,oz+sp.z+1);g.rey.rotY=Math.PI;palace.strike({alcance:3,cono:160,dano:20});check(palace.spar.hp===80,'player hits during spirit recovery');
 const health=g.rey.vida;for(let i=0;i<60;i++)palace.tick(.05);check(palace.spar.attacks>=3&&g.rey.vida<health,'rapid spirit attacks land');
 g.rey.vida=2;palace.spar.cool=0;palace.tick(.05);check(g.rey.vida===1&&!palace.spar&&!g.rey.muerto,'nonlethal training defeat');
 palace.toggleSpar();palace.spar.dodgeCool=10;g.rey.pos.set(ox-19,0,oz+31);g.rey.rotY=Math.PI;palace.strike({alcance:3,cono:160,dano:100});check(!palace.spar,'player can win training');
 palace.toggleSpar();g.rey.pos.set(ox,0,oz);palace.tick(.05);check(!palace.spar,'leaving room stops training');
 g._salirCastillo();check(g.terreno.colliders===world&&g.terreno.group.visible,'world restored on exit');
 check(g.guardarPartida(3),'save succeeds');g.cargarPartida(3);g.cargarPartida(3);check(g.habitantes.length===count&&g.habitantes.filter(h=>h.castleSlot!==undefined).length===8,'save/load keeps staff without duplication');
 g._entrarCastillo({pos:{z:-13.33}});g.enCastillo.interior.teleport(0,-44);return results;
}''')
 print('\n'.join('PASS '+r for r in results),flush=True)
 page.wait_for_function('__juego.enCastillo.interior.time>.5',timeout=120000)
 page.screenshot(path=str(out/'castillo-final.png'))
 assert not errors,errors
 print('PASS no browser JavaScript errors',flush=True)
 b.close()
