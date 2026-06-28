en el futuro el juego debe implementar aspectos para unidades, animaciones, escenarios y particulas personalizadas
he pensado que actualmente todo esta demasiado acoplado y necesito una estrategia para desacoplar las distintas capas del juego

por ahora he pensado en estas capas pero puedes recomendarme otras que consideres necesarias ya que conoces el proyecto
1. capa de tablero: tiene informacion del tablero y las unidades
2. capa de modificadores: tiene informacion de modificadores globales y por unidad a traves de los turnos
3. capa de acciones: se encarga de interaciones del usuario como selecciones de elementos y activacion habilidades o cartas
4. capa de animaciones: aun no hay animaciones ni particulas implementadas pero al ejecutar acciones se debe llamar a esta capa 
5. capa de labels: el juego se presentará en distintos idiomas, por lo que tener esta capa simplifica las traducciones

cada capa trabaja con las otras para lograr los objetivos del juego pero estan desacopladas, facilitando su mantencion, incorporacion de nuevas funcionalidades, animaciones y diseño grafico

necesito una estrategia para avanzar en el desacople, sino luego será muy dificil incorporar particulas, animaciones u otras capas y sistemas al juego