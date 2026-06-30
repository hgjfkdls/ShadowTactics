plan de estandarizacion habilidades

hay algo que me hace esta preocupando
cada ataque o habilidad que se ejecuta tiene un calculo interno que se basa en como esta codificada la habilidad o el ataque
luego hay una segunda capa que es la formula que se muestra y no siempre son consistentes

estoy buscando una forma de unificar el daño de salida con la formula y habia pensado en el siguiente flujo

primero, tanto las habilidades como el ataque basico necesitan un archivo centralizado de configuracion, parecido a lo que hicimos con los timers. en este archivo indicaremos la parametrizacion

por ejemplo

habilidad(nombre: l(meditacion.name), id: meditacion, tipo: soporte, efectos: [], modificadores_permitidos: [])
habilidad(nombre: l(desenvainado_veloz.name), id: desenvainado_veloz, tipo: ataque, efectos: [], modificadores_permitidos: [])
habilidad(nombre: l(ataque_basico.name), id: ataque_basico, tipo: ataque, efectos: [], modificadores_permitidos: [])
habilidad(nombre: l(movimiento.name), id: movimiento, tipo: movimiento, efectos: [], modificadores_permitidos: [])

luego al calcular daño, la idea es que se verifique en las unidades si existen los modificadores permitidos y se apliquen
y que este daño sea consistente con la formula que se muestra

hagamos la prueba migrando una habilidad de cada tipo y los movimientos basicos, sujetos de prueba seran:
fuego de cobertura, meditacion, cabalgar, ataque basico y movimiento