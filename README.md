# Reino de Hierro — mejoras de jugabilidad

El repositorio recibido contiene una distribución autónoma, `Reino-de-Hierro.zip`, sin el proyecto fuente original. Se conserva como base. Las correcciones nuevas están en `src/gameplay.js`, los estilos en `src/gameplay.css` y las sustituciones puntuales del código empaquetado en `tools/build.py`. La compilación comprueba que cada sustitución corresponda exactamente a esta versión.

## Ejecutar

Requisitos: Python 3. Para las pruebas: Node.js y Chromium.

```sh
python3 tools/build.py
python3 -m http.server 8000 --bind 127.0.0.1
```

Abrir `Reino-de-Hierro.html` desde ese servidor. También puede abrirse directamente en un navegador con WebGL2; para conservar partidas de forma consistente se recomienda usar siempre el mismo origen del servidor.

La compilación genera `Reino-de-Hierro.html` y `Reino-de-Hierro-mejorado.zip`, ambos autónomos, con los recursos y las mejoras incorporados. Estos archivos generados están excluidos de Git; pueden regenerarse sin descargar los recursos del juego.

## Cambios

- La pausa y la ayuda impiden lanzar hechizos, recoger objetos, mover al rey o emitir órdenes.
- Al perder el foco o cambiar de pestaña, el juego se pausa y limpia las teclas y botones retenidos.
- Q + número solo emite órdenes; el rey muerto no puede lanzar hechizos.
- El calendario bloquea los controles; Escape cierra calendarios y diálogos.
- Los campos de texto y selectores no disparan atajos del juego.
- Entrar en mando táctico no abre accidentalmente el menú al liberar el ratón.
- Barra de vida, alerta de salud baja, tiempo de recuperación de esquiva y guía con H.
- Diagnósticos ocultos por defecto; se respeta la preferencia guardada. Los paneles largos permiten desplazamiento.

Los paneles de gestión conservan el tiempo en marcha; para detener la simulación se usa Escape o H.

## Validación

```sh
npm ci --cache /tmp/reino-npm-cache
npm run build
npm test
```

Las pruebas arrancan su propio servidor en el puerto 8127 y ejecutan el juego real en Chromium. Por defecto buscan `/usr/bin/chromium`; puede configurarse `CHROMIUM_PATH`. Cubren pausa, hechizos, órdenes, calendario, formularios, pérdida de foco, ayuda, movimiento, esquiva, ataque y vida. El renderizado de prueba usa SwiftShader; no mide el rendimiento de una GPU real ni valida una campaña completa.

La revisión automática de CodeRabbit no pudo ejecutarse: la descarga de su instalador respondió HTTP 403. Para completarla hace falta acceso a `cli.coderabbit.ai` e iniciar sesión en CodeRabbit.

## Actualización visual y murallas

`src/visual.js` incorpora ocho torres procedurales, pasarelas continuas, parapetos, remates de piedra, puertas y estandartes. La textura de mampostería de 1024 × 1024 se genera de forma determinista, con variaciones de piedra, juntas y musgo; se reutiliza como mapa de relieve. Son elementos originales generados por código, sin modelos descargados ni generación mediante servicios externos. Los modelos anteriores del resto del juego se conservan.

Acércate a una torre y pulsa **R** para subir a su plataforma o bajar al patio. La escalera interior con **E** también conecta con el exterior. Los parapetos impiden salir accidentalmente de la pasarela al correr o esquivar. La tesorería de la esquina superior derecha se despliega para consultar todos los recursos.

El tema visual está en `src/visual.css`: paneles azul petróleo, bordes dorados, vida y maná abajo a la izquierda y hechizos en la parte inferior. Se mejora la luz ambiental sin eliminar el ciclo de día y noche. No se afirma calidad fotorealista ni sustitución completa de los modelos originales. La herramienta `game-dev` no estaba disponible; no se produjo un paquete GLB externo.
