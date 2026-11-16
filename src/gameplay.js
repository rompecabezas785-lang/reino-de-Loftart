// Installed after assets load, before the first simulation frame.
// Keep the original release intact; tools/build.py bundles this into one HTML.
(() => {
  const game = window.__juego;
  const input = game.input;
  const resetInput = () => {
    input.teclas.clear();
    input.presionadasEsteFrame.clear();
    input.botonIzquierdo = input.botonDerecho = false;
    input.consumirRaton();
    game.rey.bufferAtaque = false;
    game.rey.mantenerTimer = 0;
  };
  const editable = target => target instanceof Element &&
    !!target.closest('input, select, textarea, [contenteditable="true"]');
  // Capture phase prevents global game shortcuts from hijacking form controls.
  window.addEventListener('keydown', event => {
    if (editable(event.target) && !event.target.closest('#lf-dialog') && event.code !== 'Escape') {
      event.stopImmediatePropagation();
      return;
    }
    if (event.target.closest?.('button') && !event.target.closest('#lf-dialog') && ['Tab', 'Space', 'Enter'].includes(event.code)) {
      event.stopImmediatePropagation();
      return;
    }
    if (['Tab', 'Space'].includes(event.code) && !event.target.closest?.('button, [role=dialog]')) event.preventDefault();
  }, true);

  const originalPanelCheck = game._hayPanelAbierto.bind(game);
  game._hayPanelAbierto = () => originalPanelCheck() || game.calendario.abierto || !help.hidden;
  const closePanels = () => {
    game.panelHabitantes.cerrar();
    game.panelEdificio.cerrar();
    game.panelInventario.cerrar();
    game._cerrarDialogo();
    if (game.calendario.abierto) game.calendario.alternar();
    resetInput();
  };
  const openMenu = game._abrirMenu.bind(game);
  game._abrirMenu = () => { resetInput(); openMenu(); };
  const closeMenu = game.menu.cerrar.bind(game.menu);
  game.menu.cerrar = () => { resetInput(); closeMenu(); };
  const pauseOnLeave = () => {
    if (!game.derrotado) game._abrirMenu();
  };
  window.addEventListener('blur', pauseOnLeave);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseOnLeave();
  });

  const hud = document.createElement('section');
  hud.id = 'estado-rey';
  hud.setAttribute('aria-label', 'Estado del rey');
  hud.innerHTML = `<strong id="vida-texto"></strong>
    <progress id="vida-barra" aria-label="Vida del rey"></progress>
    <span id="combate-estado"></span>`;
  document.getElementById('hud').append(hud);
  const life = hud.querySelector('progress');
  const lifeText = hud.querySelector('strong');
  const combat = hud.querySelector('span');
  let lastHudUpdate = -Infinity;
  const updateHud = now => {
    if (now - lastHudUpdate < 100) return;
    lastHudUpdate = now;
    const king = game.rey;
    life.max = king.vidaMax;
    life.value = Math.max(0, king.vida);
    lifeText.textContent = `Vida ${Math.ceil(king.vida)} / ${king.vidaMax}`;
    hud.classList.toggle('peligro', king.vida <= king.vidaMax * .3);
    combat.textContent = king.muerto
      ? `Reapareces en ${Math.max(0, Math.ceil(king.muerteT))} s`
      : king.esquivaCD > 0
        ? `Esquiva disponible en ${king.esquivaCD.toFixed(1)} s`
        : king.bloqueando ? 'Escudo levantado' : 'C · Esquiva lista';
  };

  const help = document.createElement('section');
  help.id = 'guia-juego';
  help.hidden = true;
  help.setAttribute('role', 'dialog');
  help.setAttribute('aria-modal', 'true');
  help.setAttribute('aria-labelledby', 'guia-titulo');
  help.innerHTML = `<div><h2 id="guia-titulo">Defiende tu reino</h2>
    <p>Explora la ciudad, equipa al rey y prepara tus defensas antes de las oleadas.</p>
    <ol><li>Acércate a un edificio y pulsa <b>E</b> para gestionarlo. Consulta los habitantes con <b>P</b>.</li>
    <li>Abre el inventario con <b>I</b> para equiparte. Usa <b>F</b> para recoger objetos cercanos.</li>
    <li>Consulta con <b>L</b> cuándo llegará el próximo ataque. Protege el castillo.</li></ol>
    <p><b>Combate:</b> clic izquierdo para atacar; mantenlo para un golpe fuerte. <b>C</b> esquiva. Clic derecho bloquea si llevas escudo. <b>1–4</b> lanza hechizos.</p>
    <p><b>Ejército:</b> <b>Q + 1–8</b> da órdenes; <b>Tab</b> abre el mando táctico. <b>Esc</b> abre la pausa y permite guardar.</p>
    <p>WASD para moverte · Shift para correr · Espacio para saltar · Rueda para acercar la cámara.</p>
    <button type="button">Continuar (H / Esc)</button></div>`;
  document.body.append(help);
  let focusBeforeHelp;
  const setHelp = open => {
    resetInput();
    help.hidden = !open;
    if (open) {
      focusBeforeHelp = document.activeElement;
      if (document.pointerLockElement) document.exitPointerLock();
      help.querySelector('button').focus();
    } else {
      focusBeforeHelp?.focus();
    }
  };
  help.querySelector('button').addEventListener('click', () => setHelp(false));
  const hint = document.getElementById('hint');
  hint.textContent = 'WASD · Mover | Shift · Correr | C · Esquivar | E · Interactuar | I · Equipo | H · Ayuda | Esc · Pausa';

  const originalFrame = game._frame.bind(game);
  // Stop before any shortcut, spell, pickup or order can modify a paused game.
  game._frame = now => {
    const pressed = code => input.presionada(code);
    if (pressed('KeyH')) {
      setHelp(help.hidden);
    } else if (!help.hidden && pressed('Escape')) {
      setHelp(false);
    } else if (pressed('Escape') && game._hayPanelAbierto() && !game.menu.abierto) {
      closePanels();
    } else if (pressed('Escape') && !game.menu.abierto) {
      game._abrirMenu();
    }
    if (!help.hidden || game.menu.abierto || document.hidden) {
      if (help.hidden && pressed('Escape')) game.menu.cerrar();
      game.time.tick(now); // Discard paused time instead of catching up on resume.
      game._ultimoAhora = now;
      input.bloqueado = true;
      input.finDeFrame();
      input.consumirRaton();
      game.renderer.render(game.scene, game.camera);
      updateHud(now);
      return;
    }
    // Clear held attacks when opening an overlay; leave that overlay's shortcut.
    if (['KeyI', 'KeyP', 'KeyL', 'Tab', 'Escape'].some(pressed)) {
      input.botonIzquierdo = input.botonDerecho = false;
      input.presionadasEsteFrame.delete('Mouse0');
      game.rey.bufferAtaque = false;
      game.rey.mantenerTimer = 0;
    }
    originalFrame(now);
    updateHud(now);
  };
  updateHud(performance.now());
})();
