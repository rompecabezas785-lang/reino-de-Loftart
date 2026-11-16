# Segunda tanda: 60 mejoras acumulativas

Esta tanda amplía las 50 mejoras anteriores con sesenta cambios concretos. Los cambios se integran en la misma distribución autónoma, con pruebas sobre el resultado combinado; no representan sesenta reescrituras completas.

## Estado del reino

1. Centro de mando con **K** y siete secciones, dentro de la ventana pausada existente.
2. Estado del castillo con vida absoluta y porcentaje.
3. Censo de población actual.
4. Recuento de habitantes sin edificio de trabajo asignado.
5. Resumen de tropas vivas y heridas.
6. Recuento de amenazas que excluye enemigos muertos; se corrige también su representación en el mapa anterior.
7. Búsqueda de recursos por nombre.
8. Orden de recursos por cantidad disponible para detectar reservas escasas.
9. Umbral configurable y persistente de reserva baja, limitado a valores válidos.
10. Consejos según daño al castillo, trabajos sin asignar y reservas de pan.

## Edificios y habitantes

11. Directorio de edificios con búsqueda textual.
12. Filtro por tipo de edificio.
13. Orden por distancia al rey.
14. Orden por nivel de edificio.
15. Estado construido, en construcción o pendiente.
16. Destino frente a la entrada del edificio seleccionado.
17. Descripción funcional de cada edificio, tomada de sus datos originales.
18. Búsqueda de habitantes por nombre y apellido.
19. Filtro por profesión.
20. Datos de hogar, trabajo, raza y salud en cada ficha de habitante.

## Órdenes al ejército

21. Selección individual de tropas vivas, con vida y orden actual.
22. Selección rápida de tropas heridas.
23. Selección de todas las tropas vivas.
24. Limpieza de la selección.
25. Orden de seguir al rey para el grupo seleccionado.
26. Orden de mantener la posición de cada soldado.
27. Orden de retirarse al castillo.
28. Orden de defender el trono.
29. Orden de ir al destino del mapa, usando la formación del motor original.
30. Confirmación y cancelación de órdenes; se impide ordenar sin tropas o sin destino cuando hace falta.

## Mapa y orientación

31. Edificios representados en una capa ocultable, con color según estén construidos.
32. Numeración de las ocho torres.
33. Acceso directo para marcar la entrada del castillo.
34. Centrado del mapa en el rey y retorno a la vista de ciudad.
35. Zoom entre 0,5× y 4×, conservando la conversión correcta de clics a coordenadas.
36. Capa de amenazas ocultable.
37. Capa ocultable de tropas vivas.
38. Los destinos de torre se sitúan frente al arco de entrada, en lugar de su centro.
39. Destino guardado entre recargas, con validación de coordenadas al recuperarlo.
40. Dirección cardinal del destino junto a la distancia.

## Controles, diario y guardado

41. Carrera activable sin mantener pulsado Shift.
42. Cancelación de esa carrera al pausar, abrir un panel, perder el foco o morir.
43. Buscador de atajos de teclado.
44. Activar o silenciar sonido desde el centro de mando.
45. Desactivar avisos breves sin perder el registro de sucesos.
46. Búsqueda textual del diario combinable con su filtro de categoría.
47. Exportación del diario como texto local.
48. Recordatorio opcional tras diez minutos activos sin guardar manualmente; respeta las restricciones del juego para guardar.
49. Resumen de las tres ranuras y el autoguardado, con día y habitantes.
50. Guardado real por ranura con confirmación; se impide durante oleadas o interiores, según las reglas originales.

## Objetivos de sesión

51. Distancia recorrida, excluyendo grandes desplazamientos instantáneos y desplazamientos observados en pausa.
52. Daño recibido observado.
53. Recuperación de vida observada.
54. Oleadas terminadas sin derrota.
55. Registro de torres visitadas sin duplicados.
56. Registro de edificios visitados sin duplicados.
57. Objetivo de patrullar las ocho entradas de torre.
58. Objetivo de aumentar la reserva de pan en cincuenta unidades.
59. Hitos y avisos únicos por patrulla, abastecimiento y quinientos metros recorridos.
60. Reinicio de estadísticas y objetivos con confirmación; cargar una partida restablece el seguimiento para no atribuir cambios de carga a la sesión.

## Comprobación y límites

`npm test` ejecuta las suites de jugabilidad, torres, experiencia y centro de mando. La nueva suite contiene sesenta casos principales y regresiones adicionales de carga, restricciones de guardado, recordatorios, persistencia de destinos y pantallas estrechas. Las órdenes se comprueban sobre el estado del motor; no se certifica una batalla completa ni el rendimiento de una GPU real.

Los paneles muestran una instantánea al abrir cada sección y pausan la simulación. El mapa ofrece orientación, no búsqueda de rutas ni movimiento automático. Las estadísticas son de sesión: vida y distancia se muestrean periódicamente y no constituyen telemetría exhaustiva de cada impacto; pequeños teletransportes pueden entrar en el recuento. Los hitos no otorgan recursos ni cambian el equilibrio de combate. El destino y las preferencias se almacenan por navegador, separados de las ranuras de partida. Los guardados conservan el formato y las limitaciones del juego original.
