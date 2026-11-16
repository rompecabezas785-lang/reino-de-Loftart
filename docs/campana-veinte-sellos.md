# Los veinte sellos de Loftart

Campaña de **10 campamentos y 10 mazmorras**, en cuatro capítulos de cinco encuentros. Sustituye los tres accesos de mazmorra de la distribución original. Al empezar solo existen los cinco primeros; al completar los cinco se revelan los siguientes. Los lugares conquistados permanecen como escenarios, sin volver a dar recompensa.

## Cómo jugar

- **B**: abre Aventuras, consulta historias y marca destinos.
- **M**: consulta los marcadores numerados; aleja el mapa para ver los encuentros situados fuera de la ciudad.
- **E**: entra en una mazmorra o recupera la reliquia de un campamento despejado.
- **K → Guardar**: guarda la campaña junto al resto de la partida.

Los campamentos activan sus guardianes al acercarte. Debes derrotarlos y reclamar la reliquia central. Los guardianes regresan a su zona si te alejas demasiado.

Las mazmorras tienen entre dos y cuatro salas, puertas bloqueadas por los enemigos, pruebas narrativas y un guardián final. Para completar una debes despejar todas las salas, abrir sus cofres y salir con vida. Retirarse antes o morir deja el sello pendiente y permite reintentarlo. No se permite entrar durante una oleada contra el castillo.

## Capítulos

### Capítulo 1

| Nº | Lugar | Tipo | Temática |
|---|---|---|---|
| 1 | Los Ladrones del Brezal | Campamento | brezal |
| 2 | La Cripta de las Luciérnagas | Mazmorra | cripta luminosa |
| 3 | El Vado de los Colmillos | Campamento | ribera |
| 4 | La Mina del Eco Roto | Mazmorra | mina de cobre |
| 5 | La Vigilia del Roble Rojo | Campamento | bosque otoñal |

### Capítulo 2

| Nº | Lugar | Tipo | Temática |
|---|---|---|---|
| 6 | El Archivo de Escarcha | Mazmorra | biblioteca helada |
| 7 | Las Tiendas del Vendaval | Campamento | estepa |
| 8 | El Sepulcro de Sal | Mazmorra | desierto salino |
| 9 | La Cosecha de los Hongos | Campamento | ciénaga fúngica |
| 10 | El Jardín de las Raíces Ciegas | Mazmorra | jardín subterráneo |

### Capítulo 3

| Nº | Lugar | Tipo | Temática |
|---|---|---|---|
| 11 | Las Fraguas de Ceniza | Campamento | páramo volcánico |
| 12 | El Observatorio Invertido | Mazmorra | astronomía arcana |
| 13 | El Puerto de los Náufragos | Campamento | costa de coral |
| 14 | La Cámara de las Horas Perdidas | Mazmorra | relojería |
| 15 | Los Hornos de Vidrio Verde | Campamento | erial de cristal |

### Capítulo 4

| Nº | Lugar | Tipo | Temática |
|---|---|---|---|
| 16 | La Catedral del Coral Seco | Mazmorra | santuario marino |
| 17 | Las Jaulas del Crepúsculo | Campamento | bosque de espinos |
| 18 | El Laberinto de los Espejos Negros | Mazmorra | ruinas de obsidiana |
| 19 | El Último Estandarte | Campamento | campo de batalla |
| 20 | El Atlas del Vacío | Mazmorra | nexo estelar |

## Fauna, flora y escenarios

Los hábitats incluyen conejos, ciervos, zorros, jabalíes, garzas, búhos, murciélagos, luciérnagas y lagartos. Son fauna ambiental animada: se desplazan en torno a su hábitat, reaccionan a la cercanía del rey y no otorgan botín ni se cazan. La fauna futura aparece junto con sus encuentros.

La flora y decoración cambian según el tema: brezos, juncos, robles, hongos, raíces, cactus, coral, espinos, cristales y formaciones de hielo, ceniza u obsidiana. Los interiores incluyen sarcófagos, estanterías, urnas, relojes, motivos astronómicos y espejos oscuros. Son modelos procedurales originales de estilo geométrico; los espejos son decorativos, sin reflejos en tiempo real. La vegetación está agrupada en instancias y los hábitats lejanos se ocultan.

## Progreso y recompensas

Cada encuentro tiene introducción, prueba narrativa, guardián y desenlace propios, conectados por la historia del Cartógrafo del Vacío. Las recompensas son únicas. Si el almacén no admite todo el oro, el excedente queda en una reserva que se reclama desde Aventuras.

El progreso y la reserva se incluyen en las ranuras manuales y en el autoguardado. Completar un sello intenta autoguardar según las restricciones originales del juego. El autoguardado no sustituye una copia manual cuando el navegador no puede guardar. Cargar otra ranura recupera su capítulo y sus recompensas; las partidas antiguas comienzan con cinco encuentros. No se guarda una expedición a mitad de mazmorra.

## Validación

`npm test` ejecuta las regresiones existentes y `tests/campaign.cjs`. La suite de campaña comprueba los veinte encuentros mediante daño y actualizaciones controladas del motor, los desbloqueos 5/10/15/20, puertas transitables, cofres, retirada, muerte, recompensas únicas, reserva de oro, guardados independientes y migración de partidas antiguas. Incluye capturas de un campamento, una mazmorra y el diario.

Estas comprobaciones no equivalen a una campaña completa jugada manualmente ni certifican el equilibrio de dificultad en todos los equipos. Los campamentos se reinician al cargar una partida si todavía no se habían completado.
