const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

(async () => {
  const server = spawn('python3', ['-m', 'http.server', '8127', '--bind', '127.0.0.1'], {
    cwd: path.resolve(__dirname, '..'), stdio: 'ignore'
  });
  let browser;
  try {
    for (let i = 0; i < 50; i++) {
      try { if ((await fetch('http://127.0.0.1:8127/')).ok) break; } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    browser = await chromium.launch({
      executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
      args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']
    });
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.addInitScript(() => localStorage.setItem('reinoGraficos', JSON.stringify({calidad:'baja',fps:false})));
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://127.0.0.1:8127/Reino-de-Hierro.html', { timeout: 90000 });
    await page.waitForFunction(() => window.__juego?._ultimoAhora > 0, {}, { timeout: 90000 });
    const checks = await page.evaluate(() => {
      const g = window.__juego, input = g.input, results = [];
      let now = performance.now();
      const frame = () => g._frame(now += 20);
      const press = key => { input.presionadasEsteFrame.add(key); frame(); };
      const check = (name, condition) => results.push({ name, passed: !!condition });
      const reset = () => {
        g.menu.cerrar(); input.teclas.clear(); input.presionadasEsteFrame.clear();
        g.rey.ataque = null; g.rey.esquiva = null;
        g.rey.muerto = false; g.rey.vida = g.rey.vidaMax - 20;
        g.lanzador.mana = 80; g.lanzador.enfriamiento = {};
      };
      reset();
      g._abrirMenu();
      const time = g.oleadas.tiempoDia, pos = g.rey.pos.clone();
      input.teclas.add('KeyW'); press('Digit3'); press('KeyI');
      check('Pausa impide hechizos, movimiento, tiempo y apertura del inventario',
        g.lanzador.mana === 80 && g.oleadas.tiempoDia === time &&
        g.rey.pos.equals(pos) && !g.panelInventario.abierto);
      press('Escape'); frame();
      check('Escape reanuda la partida', !g.menu.abierto && !input.bloqueado);
      reset(); input.teclas.add('KeyQ'); press('Digit3');
      check('Q + número no gasta maná', g.lanzador.mana === 80);
      input.teclas.clear(); press('Digit3');
      check('Curación normal sigue funcionando', g.lanzador.mana < 80 && g.rey.vida > g.rey.vidaMax - 20);
      reset(); g.rey.muerto = true; g.rey.muerteT = 4; press('Digit3');
      check('El rey muerto no puede lanzar hechizos', g.lanzador.mana === 80);
      reset(); press('KeyL');
      check('Calendario bloquea los controles', g.calendario.abierto && input.bloqueado);
      press('Escape');
      check('Escape cierra el calendario', !g.calendario.abierto);
      const field = document.createElement('input'); document.body.append(field); field.focus();
      field.dispatchEvent(new KeyboardEvent('keydown', { code:'KeyI', key:'i', bubbles:true }));
      check('Escribir en formularios no activa atajos', !input.presionada('KeyI') && !input.abajo('KeyI'));
      field.remove();
      reset(); input.teclas.add('KeyW'); input.botonIzquierdo = true;
      window.dispatchEvent(new Event('blur'));
      check('Perder foco pausa y limpia teclas y botones', g.menu.abierto && !input.teclas.size && !input.botonIzquierdo);
      reset(); press('KeyH'); const helpTime = g.oleadas.tiempoDia;
      press('Digit3');
      check('La ayuda pausa y bloquea hechizos', !document.getElementById('guia-juego').hidden && g.oleadas.tiempoDia === helpTime && g.lanzador.mana === 80);
      press('Escape');
      check('Escape cierra la ayuda', document.getElementById('guia-juego').hidden);
      reset(); const beforeMove = g.rey.pos.clone(); input.teclas.add('KeyW');
      for(let i=0; i<10; i++) frame();
      check('Movimiento WASD operativo', g.rey.pos.distanceTo(beforeMove) > .1);
      input.teclas.clear(); g.rey.esquivaCD = 0; press('KeyC');
      check('Esquiva operativa', g.rey.esquivaCD > 0);
      reset(); press('Mouse0');
      check('Ataque normal operativo', !!g.rey.ataque);
      reset(); g.rey.vida = 25; for(let i=0;i<6;i++) frame();
      check('La barra de vida refleja daño y alerta', document.getElementById('vida-barra').value === 25 && document.getElementById('estado-rey').classList.contains('peligro'));
      reset();
      const v = g.visualUpgrade, tower = v.towers[0], length = Math.hypot(tower.x,tower.z);
      g.rey.pos.set(tower.x-tower.x/length*7,0,tower.z-tower.z/length*7);
      press('KeyR');
      check('R sube a la plataforma exterior', Math.abs(g.rey.pos.y-v.height)<.05 && !g.enInterior);
      for(let i=0;i<12;i++)frame();
      check('La torre sostiene al rey sin caída ni expulsión', Math.abs(g.rey.pos.y-v.height)<.05 && Math.hypot(g.rey.pos.x-tower.x,g.rey.pos.z-tower.z)<1);
      check('Las ocho pasarelas tienen suelo continuo',v.sides.every(s=>[.1,.25,.5,.75,.9].every(t=>g.terreno.alturaSuelo(s.A.x+(s.B.x-s.A.x)*t,s.A.z+(s.B.z-s.A.z)*t,v.height)===v.height)));
      press('KeyR');
      check('R baja al patio de forma segura',g.rey.pos.y===0 && Math.hypot(g.rey.pos.x-tower.x,g.rey.pos.z-tower.z)>6);
      const door=g.fort.puertas.find(p=>p.nombre.startsWith('Puerta de la torre'));
      g._entrarTorre(door);g._subirTorre();frame();
      check('Escalera interior conecta con la muralla exterior',!g.enTorre && Math.abs(g.rey.pos.y-v.height)<.05);
      const button=document.querySelector('#tesoreria button');button.click();
      check('La tesorería permite desplegar todos los recursos',button.getAttribute('aria-expanded')==='true');button.click();
      g.rey.pos.set(0,0,28);g.rey.modelo.position.copy(g.rey.pos);g.camRig.iniciado=false;
      g.rey.vida = g.rey.vidaMax; g._abrirMenu();
      return results;
    });
    for (const check of checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name}`);
    assert.deepEqual(checks.filter(check => !check.passed), []);
    assert.deepEqual(errors, [], 'No browser runtime errors');
    await page.evaluate(() => window.__juego.menu.cerrar());
    await page.waitForTimeout(300);
    await page.screenshot({ path: '/tmp/reino-mejorado.png', timeout: 90000 });
    console.log(`${checks.length} checks passed; no browser runtime errors.`);
  } finally {
    await browser?.close(); server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
