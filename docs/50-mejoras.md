# 50 mejoras de experiencia de juego

Implementadas sobre `descarga-juego-mejorado`. Son cincuenta cambios concretos agrupados en cinco bloques, con revisión y pruebas sobre el resultado combinado. No son cincuenta versiones completas del juego ni sustituyen una campaña de pruebas manuales. La base conserva su combate, economía, ciudad y torres.

## Ajustes y cámara

1. Ventana de ajustes con botón y atajo **O**.
2. Preferencias persistentes con validación de tipos y límites al recuperarlas.
3. Tamaño configurable de las nuevas herramientas y ventanas.
4. Modo de alto contraste para los paneles del juego.
5. Reducción de animaciones de interfaz y del destello de daño, respetando inicialmente la preferencia del sistema.
6. Guía inferior de controles ocultable.
7. Sensibilidad de cámara ajustable entre 0,25× y 2×.
8. Inversión del movimiento vertical de cámara.
9. Restablecimiento de la distancia de cámara.
10. Restablecimiento de las preferencias de comodidad.

## Controles y accesibilidad

11. Las nuevas ventanas pausan tiempo, movimiento, hechizos y órdenes.
12. Tab y Mayús+Tab mantienen el foco dentro de las nuevas ventanas.
13. Escape cierra las nuevas ventanas, incluso desde sus formularios.
14. Apertura y cierre limpian teclas, botones y ataques retenidos.
15. El cierre devuelve el foco al control que abrió la ventana.
16. Mantener pulsado un atajo nuevo no abre y cierra ventanas repetidamente.
17. Tab, Espacio y Enter permiten usar botones sin activar controles del juego.
18. Diálogos, formularios y notificaciones con etiquetas accesibles; botones ampliados en dispositivos táctiles.
19. Ventanas adaptables a pantallas estrechas, con contenido desplazable.
20. Entrada y salida de pantalla completa, con mensaje si el navegador la rechaza.

## Orientación

21. Brújula de ocho direcciones y ángulo de cámara.
22. Coordenadas y altura opcionales.
23. Mapa de la ciudad mediante **M**, con cuadrícula y norte.
24. Marcador del rey orientado según la cámara, acompañado de posición textual.
25. Las ocho torres y su perímetro visibles en el mapa.
26. Marcadores de enemigos vivos dentro del área representada.
27. Marcador del castillo y leyenda de símbolos.
28. Destino por clic o toque; selector de torres como alternativa de teclado.
29. Distancia al destino en la interfaz y opción para quitarlo.
30. Confirmación de llegada al acercarse a menos de cuatro unidades.

## Información de combate y reino

31. Porcentaje de vida junto a la barra existente.
32. Indicador periférico breve al recibir daño.
33. Registro de recuperaciones de vida.
34. Alerta textual de salud crítica al cruzar el umbral, sin repetirla continuamente.
35. Aviso de maná bajo al bajar del 20 %.
36. Aviso cuando vuelve a estar disponible la esquiva.
37. Aviso y registro al comenzar una oleada.
38. Registro al terminar una oleada, sin presuponer victoria.
39. Registro de cambios de día.
40. Diario de sesión cronológico con tiempo activo del suceso, abierto con **J**.

## Seguimiento y comodidad

41. Filtros del diario: combate, reino, exploración y sistema.
42. Vaciado del diario y mensaje claro cuando no hay sucesos.
43. Límite de ochenta entradas para acotar memoria y elementos de interfaz.
44. Guía de cinco objetivos: movimiento, inventario, ayuda, mapa y torre.
45. Progreso de esa guía conservado entre sesiones.
46. Reinicio manual de la guía.
47. Objetivo sugerido en pantalla, con prioridad para defender el castillo durante una oleada.
48. Contador de tiempo activo que se detiene durante pausa, ayuda y ventanas nuevas.
49. Indicación explícita de partida pausada.
50. **F8** oculta y restaura la interfaz para capturas.

## Validación y límites

`npm test` ejecuta las pruebas generales, de torres y de experiencia. La suite de experiencia comprueba cincuenta casos principales, más validación de preferencias fuera de rango e interacción con destinos. Las pruebas usan Chromium y SwiftShader; no equivalen a rendimiento medido en una GPU real, accesibilidad auditada con lector de pantalla ni una campaña completa.

La vista inicial del mapa representa un cuadrado de 240 unidades centrado en la ciudad; la segunda tanda añade zoom y centrado en el rey. Los destinos son indicaciones, no navegación automática. El diario se limita a esta sesión; las preferencias y la guía se guardan en el almacenamiento del navegador. La reducción de movimiento afecta a la interfaz añadida, no a las animaciones 3D. Los avisos detectan cambios de estado y cambios netos de vida entre actualizaciones; no constituyen un registro exhaustivo de cada impacto.
