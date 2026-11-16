# Reino de Loftart — ampliación del castillo

**Descarga del juego ampliado:** [Reino-de-Hierro.zip](https://github.com/rompecabezas785-lang/reino-de-Loftart/raw/refs/heads/main/Reino-de-Hierro.zip). Extraé todo el archivo conservando la carpeta `assets` junto al HTML. Desde la carpeta extraída podés ejecutar `python -m http.server 8001` y abrir `Reino-de-Hierro.html` desde ese servidor.

El ZIP original se conserva en `base/Reino-de-Hierro-original.zip`. `src/castillo.js` añade el interior al motor existente; `tools/build.py` integra la ampliación en el HTML sin descargar dependencias.

## Preparar y ejecutar

```sh
python tools/build.py
python -m http.server 8001 --bind 127.0.0.1 --directory dist
```

Para reconstruir también el ZIP descargable de la raíz: `python tools/package.py`.

Abrir `Reino-de-Hierro.html` desde ese servidor. La compilación requiere Python 3; el juego requiere un navegador con WebGL. El atlas se carga desde `assets/`, por lo que debe acompañar al HTML. No hacen falta claves ni servicios externos.

## Explorar

Abrí la puerta del castillo con **E** y volvé a pulsar **E** cerca de la entrada. **WASD** mueve al personaje; clic en el juego captura el ratón. Las placas indican las salas. La galería conecta biblioteca, cocina, salón de bailes, salón del trono, oficina principal, oficina con chimenea, baños termales, sala de entrenamiento y capilla con plantas. Las escaleras, activadas con **E**, llevan a ambos balcones exteriores, al calabozo y a las dependencias del servicio.

- **Balcones:** se puede caminar por las plataformas; **E** vuelve al interior.
- **Termas:** **E** junto a la piscina restaura la vida.
- **Entrenamiento:** **E** en la marca inicia o termina la práctica. El espíritu anuncia golpes rápidos y esquiva; atacá durante su recuperación. **C** permite esquivar. Salir de la sala cancela la sesión. La práctica termina al vencer al espíritu o quedar con un punto de vida.
- **Habitantes:** **P** muestra cuatro sirvientas y cuatro mayordomos adicionales, con profesión **Sirviente del castillo** y trabajo en el castillo. Se conservan al guardar y cargar sin duplicarse.
- **Calabozo:** tres criaturas animadas permanecen detrás de barreras de colisión.

## Arte y mantenimiento

`assets/castillo-atlas.png` contiene dos pinturas, un tapiz y un panel ornamental generados para esta ampliación. `assets/provenance.json` registra su procedencia y prompt. El motor utiliza los cuatro cuadrantes directamente, sin recortar la imagen fuente.

El código original está compilado y sus símbolos internos pueden cambiar si se reemplaza el ZIP. El constructor comprueba el punto de integración y falla ante una versión incompatible. La ampliación usa geometría estilizada; los cuadros y tapices emplean la imagen generada.

## Pruebas

Con el servidor activo y Python Playwright más Chromium instalados:

```sh
node --check src/castillo.js
python tests/behavior.py
```

Las pruebas ejecutan el juego real: accesibilidad mediante sus colisiones, transiciones con E, soporte de los balcones, termas, ataque y esquiva del espíritu, final no letal, personal en la interfaz, guardado/carga y restauración del exterior. Las capturas se escriben en `tests/artifacts/`.
