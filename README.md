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

## Ciudad y torres circulares

Las ocho torres son huecas y redondeadas, con una escalera interior de 64 peldaños transitables. Entra por el arco orientado hacia la ciudad y camina con WASD por el caracol hasta la pasarela. Baja por el mismo recorrido. El antiguo atajo R ya no se utiliza.

Se retiraron 52 módulos visuales antiguos de muralla antes de colocar los nuevos, recortando sus encuentros para dejar libres las torres. La comprobación de volúmenes detectó una intersección entre la escuela mágica y el molino; se ajustaron las dimensiones de los edificios a sus parcelas y se actualizaron sus colisiones. No quedan intersecciones entre los volúmenes de edificios en el estado inicial comprobado; esto no certifica todos los estados posibles de una campaña.

`src/city.js` mejora materiales y dimensiones de los edificios existentes y añade cuatro barrios con nueve conjuntos de mobiliario cada uno: Forja (cajas y suministros), Bastión del Norte (armeros), Barrio del Pan (puestos cubiertos) y Jardines del Saber (jardineras). Las ubicaciones evitan edificios, avenidas principales y corredores de acceso. Los modelos base se conservan; no es una sustitución completa de todos los edificios por modelos externos.

`src/visual.js` genera arquitectura original y una textura de mampostería de 1024 × 1024 con juntas, variación mineral y musgo. Las piezas repetidas se agrupan por material para reducir llamadas de dibujo. El tema del HUD está en `src/visual.css`.

La herramienta `game-dev` no estaba disponible; los modelos nuevos se crean directamente con el motor del juego. No se generaron paquetes GLB externos ni se usaron proveedores de pago.

## Corrección de escaleras y colisiones

Se reprodujo la caída al correr a 20 FPS: el desplazamiento saltaba más de un peldaño por actualización y el detector rechazaba el siguiente apoyo. Las barandillas anteriores tampoco tenían protección física lateral. La versión corregida usa una superficie de apoyo continua bajo los peldaños, pasos de física de hasta 1/120 s cerca de las torres, límites laterales y un desembarco que conecta la escalera con el anillo superior. Los saltos siguen usando su velocidad vertical; las pulsaciones únicas no se repiten al subdividir la física.

`tests/towers.cjs` recorre las ocho torres desde el patio, sube corriendo, sale hacia la muralla, vuelve y baja. Incluye empujes contra los dos laterales y una esquiva. La regresión inicial falló en las 26 comprobaciones originales de esta suite. Las pruebas anteriores de centros de peldaño no cubrían estos recorridos a baja frecuencia.

## Suelo superior y puertas

La coronación de cada torre ahora tiene un piso circular amplio, con un hueco protegido que deja espacio para subir y bajar la escalera. Las salidas hacia las dos murallas quedan libres de almenas. El recorrido perimetral se comprueba completo en ambos sentidos, manteniendo la altura de la pasarela.

Cada entrada tiene una puerta de dos hojas. Pulsa **E** cerca de ella, desde fuera o desde dentro, para abrirla o cerrarla. Las hojas se animan, la puerta cerrada bloquea el paso y el cierre se rechaza si el personaje u otra unidad ocupa el umbral. Las puertas comienzan abiertas y su estado es local a la sesión; no se añade a las partidas guardadas.

Se corrigió además la resolución de penetración de los obstáculos circulares del código original: desplazaba el personaje hacia el centro en vez de separarlo. Hay pruebas para penetración parcial y para coincidencia exacta con el centro. La validación de esta actualización ejecuta 23 comprobaciones generales y 71 de torres, circuitos, puertas y colisiones.
