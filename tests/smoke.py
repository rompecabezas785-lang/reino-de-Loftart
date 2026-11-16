from pathlib import Path
from playwright.sync_api import sync_playwright
import json
out=Path(__file__).parent/'artifacts';out.mkdir(exist_ok=True)
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
 page=b.new_page(viewport={'width':1280,'height':800});errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://127.0.0.1:8001/Reino-de-Hierro.html',timeout=120000)
 try: page.wait_for_function('window.__juego?.castleExpansion',timeout=60000)
 except: print('ERRORS',errors);raise
 print('RESIDENTS',page.evaluate('({total:__juego.habitantes.length,staff:__juego.habitantes.filter(h=>h.profesion==="sirviente_castillo").length})'))
 page.evaluate('__juego.menu.cerrar();__juego._entrarCastillo({pos:{z:13.33}})')
 page.wait_for_timeout(1500)
 print('ENTER',page.evaluate('({position:__juego.rey.pos,colliders:__juego.enCastillo.interior.colliders.length})'))
 page.screenshot(path=str(out/'entrada.png'))
 page.evaluate('__juego.enCastillo.interior.teleport(0,-34)')
 page.wait_for_timeout(700);page.screenshot(path=str(out/'trono.png'))
 page.evaluate('__juego.enCastillo.interior.toBalcony(1)')
 page.wait_for_timeout(700)
 print('BALCONY',page.evaluate('({x:__juego.rey.pos.x,y:__juego.rey.pos.y,z:__juego.rey.pos.z})'))
 page.screenshot(path=str(out/'balcon.png'))
 page.evaluate('__juego.enCastillo.interior.fromBalcony();__juego.enCastillo.interior.teleport(-19,34);__juego.enCastillo.interior.toggleSpar()')
 page.wait_for_timeout(3500)
 print('SPIRIT',page.evaluate('__juego.enCastillo.interior.spar'))
 page.evaluate('__juego.enCastillo.interior.teleport(65,35)')
 page.wait_for_timeout(700);page.screenshot(path=str(out/'calabozo.png'))
 page.evaluate('__juego._salirCastillo();__juego.panelHabitantes.alternar()')
 print('PANEL',page.locator('#panel-habitantes').inner_text()[:1600])
 print('ERRORS',errors)
 assert not errors
 b.close()
