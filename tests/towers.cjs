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
      const g=window.__juego,k=g.rey,input=g.input,v=g.visualUpgrade,results=[];
      const check=(name,passed,detail)=>results.push({name,passed:!!passed,detail});
      g.menu.cerrar();input.bloqueado=false;
      const place=(x,y,z)=>{k.pos.set(x,y,z);k.velY=0;k.enSuelo=true;k.esquiva=null;k.ataque=null;k.muerto=false;k.accionT=0;input.teclas.clear();input.presionadasEsteFrame.clear();};
      function go(x,z,dt=.05,sprint=false){
        input.teclas.add('KeyW');if(sprint)input.teclas.add('ShiftLeft');else input.teclas.delete('ShiftLeft');
        let frames=0;
        while(Math.hypot(x-k.pos.x,z-k.pos.z)>.24&&frames++<250){
          const forward=k.pos.clone().set(x-k.pos.x,0,z-k.pos.z).normalize();
          k.update(dt,input,{adelante:forward},g.terreno);
        }
        input.teclas.clear();return frames<250;
      }
      for(const x of [0,1.5]){
        place(x,0,0);k.update(.02,input,g.camRig,{alturaSuelo:()=>0,limitar:()=>{},colliders:[{tipo:'circulo',x:0,z:0,r:2,alto:3}]});
        check(`Colisión circular resuelve penetración desde x=${x}`,Math.hypot(k.pos.x,k.pos.z)>=2+k.cfg.movimiento.radio-.001);
      }
      for(let index=0;index<8;index++){
        const t=v.towers[index],steps=v.stairs.filter(s=>s.tower===index),start=steps[0],end=steps.at(-1);
        place(t.x+Math.cos(t.entry)*6,0,t.z+Math.sin(t.entry)*6);
        let route=go(start.x,start.z);
        for(const step of steps)route=go(step.x,step.z,.05,true)&&route;
        check(`Torre ${index+1}: entrar y subir corriendo a 20 FPS`,route&&k.pos.y>v.height-.4,{y:k.pos.y,route});
        const a=end.angle;
        let exit=go(t.x+Math.cos(a)*4,t.z+Math.sin(a)*4);
        check(`Torre ${index+1}: desembarco superior`,exit&&k.pos.y>v.height-.4,{y:k.pos.y});
        const side=v.sides.find(s=>Math.hypot(s.A.x-t.x,s.A.z-t.z)<.1);
        const angle=Math.atan2(side.B.z-t.z,side.B.x-t.x);
        const delta=Math.atan2(Math.sin(angle-a),Math.cos(angle-a));
        let wall=true;
        for(let n=1;n<=20;n++){const theta=a+delta*n/20;wall=go(t.x+Math.cos(theta)*4,t.z+Math.sin(theta)*4)&&wall;}
        wall=go(t.x+Math.cos(angle)*9,t.z+Math.sin(angle)*9)&&wall;
        check(`Torre ${index+1}: salida transitable hacia la muralla`,wall&&k.pos.y>v.height-.3,{y:k.pos.y});
        go(t.x+Math.cos(angle)*4,t.z+Math.sin(angle)*4);
        for(let n=19;n>=0;n--){const theta=a+delta*n/20;go(t.x+Math.cos(theta)*4,t.z+Math.sin(theta)*4);}
        let down=go(end.x,end.z);
        for(const step of [...steps].reverse())down=go(step.x,step.z,.05,true)&&down;
        down=go(t.x+Math.cos(t.entry)*6,t.z+Math.sin(t.entry)*6)&&down;
        check(`Torre ${index+1}: descenso y salida`,down&&k.pos.y<.5,{y:k.pos.y,down});
      }
      // Complete both directions of the wall circuit, with no repositioning between segments.
      for(const reverse of [false,true]){
        const order=reverse?[...v.sides].reverse():v.sides;
        const first=reverse?order[0].B:order[0].A,next=reverse?order[0].A:order[0].B;
        const a0=Math.atan2(next.z-first.z,next.x-first.x);
        place(first.x+Math.cos(a0)*4,v.height,first.z+Math.sin(a0)*4);
        let success=true,minHeight=v.height;
        for(let i=0;i<order.length;i++){
          const side=order[i],start=reverse?side.B:side.A,end=reverse?side.A:side.B;
          const angle=Math.atan2(end.z-start.z,end.x-start.x),length=Math.hypot(end.x-start.x,end.z-start.z);
          for(let d=4;d<=length-4;d+=2){success=go(start.x+Math.cos(angle)*d,start.z+Math.sin(angle)*d,.05,true)&&success;minHeight=Math.min(minHeight,k.pos.y);}
          success=go(end.x-Math.cos(angle)*4,end.z-Math.sin(angle)*4)&&success;
          const following=order[(i+1)%order.length],destination=reverse?following.A:following.B;
          const from=angle+Math.PI,to=Math.atan2(destination.z-end.z,destination.x-end.x);
          const delta=Math.atan2(Math.sin(to-from),Math.cos(to-from));
          for(let n=1;n<=24;n++){const theta=from+delta*n/24;success=go(end.x+Math.cos(theta)*4,end.z+Math.sin(theta)*4)&&success;minHeight=Math.min(minHeight,k.pos.y);}
        }
        check(`Circuito completo de murallas ${reverse?'antihorario':'horario'}`,success&&minHeight>v.height-.2,{success,minHeight});
      }
      for(let i=0;i<8;i++){
        const t=v.towers[i],door=v.towerDoors[i],nx=Math.cos(t.entry),nz=Math.sin(t.entry);
        const interact=()=>{input.presionadasEsteFrame.add('KeyE');g._gestionarFortaleza();input.presionadasEsteFrame.clear();for(let j=0;j<60;j++)door.tick(1/60);};
        place(t.x+nx*6,0,t.z+nz*6);interact();
        const blocked=!go(t.x+nx*3,t.z+nz*3);
        check(`Puerta ${i+1}: E cierra y bloquea el paso`,!door.open&&door.progress===0&&door.blocked&&blocked,{open:door.open,progress:door.progress,blocked:door.blocked,stopped:blocked,position:k.pos.toArray(),blocks:door.blocks.map(b=>g.terreno.colliders.includes(b))});
        interact();const crossed=go(t.x+nx*3,t.z+nz*3);
        check(`Puerta ${i+1}: E abre y permite entrar`,door.open&&door.progress===1&&!door.blocked&&crossed);
        // Close and reopen from the inside.
        interact();const closedInside=!door.open;interact();
        check(`Puerta ${i+1}: control desde dentro`,closedInside&&door.open);
        place(door.frame.position.x,0,door.frame.position.z);interact();
        check(`Puerta ${i+1}: no cierra sobre el personaje`,door.open&&!door.blocked);
      }
      const t=v.towers[0],step=v.stairs[32];
      for(const direction of [-1,1]){
        place(step.x,step.y,step.z);
        const forward=k.pos.clone().set(Math.cos(step.angle)*direction,0,Math.sin(step.angle)*direction);
        input.teclas.add('KeyW');for(let i=0;i<15;i++)k.update(.05,input,{adelante:forward},g.terreno);input.teclas.clear();
        check(`Barandilla ${direction<0?'interior':'exterior'} evita caída lateral`,k.pos.y>step.y-.5,{y:k.pos.y});
      }
      place(step.x,step.y,step.z);k.esquivaCD=0;
      input.teclas.add('KeyW');input.presionadasEsteFrame.add('KeyC');
      const outward=k.pos.clone().set(Math.cos(step.angle),0,Math.sin(step.angle));
      for(let n=0;n<20;n++){k.update(.05,input,{adelante:outward},g.terreno);input.presionadasEsteFrame.clear();}
      input.teclas.clear();
      check('Esquiva lateral no atraviesa la protección de la escalera',k.pos.y>step.y-.5,{y:k.pos.y});
      return results;
    });
    for (const check of checks) console.log(`${check.passed ? 'PASS' : 'FAIL'} ${check.name} ${JSON.stringify(check.detail)}`);
    if (!process.env.BASELINE) assert.deepEqual(checks.filter(check => !check.passed), []);
    assert.deepEqual(errors, [], 'No browser runtime errors');
    await page.evaluate(() => window.__juego._abrirMenu());
    await page.waitForTimeout(300);

    console.log(`${checks.filter(c=>c.passed).length}/${checks.length} checks passed; no browser runtime errors.`);
  } finally {
    await browser?.close(); server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
