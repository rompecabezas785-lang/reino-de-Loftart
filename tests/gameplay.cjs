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
      const v=g.visualUpgrade;
      check('Murallas antiguas retiradas antes de reemplazarlas',v.retiredWalls>0);
      const steps=v.stairs.filter(s=>s.tower===0);
      g.rey.pos.set(steps[0].x,0,steps[0].z);g.rey.velY=0;g.rey.enSuelo=true;
      let ascend=true;
      for(const step of steps){g.rey.pos.x=step.x;g.rey.pos.z=step.z;g.rey.update(.02,input,g.camRig,g.terreno);
        ascend&&=Math.abs(g.rey.pos.y-step.y)<.2&&Math.hypot(g.rey.pos.x-step.x,g.rey.pos.z-step.z)<.2;}
      check('64 peldaños físicos suben sin atravesar las paredes',ascend&&g.rey.pos.y>v.height-.2);
      let descend=true;
      for(const step of [...steps].reverse()){g.rey.pos.x=step.x;g.rey.pos.z=step.z;for(let n=0;n<5;n++)g.rey.update(.02,input,g.camRig,g.terreno);descend&&=Math.abs(g.rey.pos.y-step.y)<.25;}
      check('La misma escalera permite bajar caminando',descend&&g.rey.pos.y<.3);
      g.rey.pos.set(steps[0].x,0,steps[0].z);g.rey.velY=0;input.teclas.add('KeyW');
      let walk=true;
      for(const step of steps){let n=0;
        while(Math.hypot(g.rey.pos.x-step.x,g.rey.pos.z-step.z)>.08&&n++<30){
          const forward=g.rey.pos.clone().set(step.x-g.rey.pos.x,0,step.z-g.rey.pos.z).normalize();
          g.rey.update(.01,input,{adelante:forward},g.terreno);
        }
        walk&&=n<30;
      }
      input.teclas.clear();
      check('Ascenso continuo con controles de movimiento reales',walk&&g.rey.pos.y>v.height-.25);

      check('Las ocho pasarelas tienen suelo continuo',v.sides.every(s=>[.1,.25,.5,.75,.9].every(t=>g.terreno.alturaSuelo(s.A.x+(s.B.x-s.A.x)*t,s.A.z+(s.B.z-s.A.z)*t,v.height)===v.height)));
      check('Edificios sin intersecciones de sus volúmenes',g.cityAudit.after.length===0);
      check('Los cuatro barrios tienen mobiliario propio',Object.values(g.cityAudit.counts).every(n=>n>0));
      console.log('AUDIT',JSON.stringify(g.cityAudit));
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
