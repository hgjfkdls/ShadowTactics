el juego ha evolucionado bastante en cuanto a arquitectura y quiero documentar los distintos sistemas

sistema de configuracion de habilidades
las habilidades se configuran y los distintos handlers leen desde la configuracion el comportamiento esperado

sistema de seleccion
este sistema se encarga de la seleccion de elementos
range: se encarga de destacar las hex que pertenecen al rango de la habilidad
target: se encarga de destacar las hex validas para ejecutar la habilidad

sistema de pasivas
las habilidades pasivas necesitan reaccionar al gamestate para ver si se aplican o no
activation: tiene las reglas de activacion

sistema de modificadores
effect: contiene los efectos de la habilidad
los efectos de la habilidad agregan o quitan modificadores de las unidades
los efectos se aplican al activarse una habilidad, ya sea pasiva o activa

sistema de flags
unit.flags es un array con strings
las habilidades tienen varios fields relacionados con el array unit.flag
requiredFlags: [] flags que se necesitan para activar la habilidad, operador AND, si esta vacio no hay requisitos
blockFlags: [] flags que se necesitan para