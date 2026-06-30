[docs](../../docs.md) > [arquitectura](../index.md) > servidor

# Documentación del servidor de juego

Documentos de arquitectura y referencia del servidor de juego Shadow Tactics (Socket.IO, puerto 3000).

## Índice de documentos

| # | Documento | Descripción |
|---|-----------|-------------|
| 1 | [descripcion general](./1%20descripcion%20general.md) | Propósito del servidor, stack tecnológico, ciclo de vida de una partida |
| 2 | [arquitectura](./2%20arquitectura.md) | Diagrama de capas, patrones de diseño, flujo principal y de desconexión, snapshots |
| 3 | [estructura repositorio](./3%20estructura%20repositorio.md) | Árbol de directorios completo y propósito de cada carpeta |
| 4 | [guia de instalacion](./4%20guia%20de%20instalacion.md) | Requisitos, instalación paso a paso, scripts, solución de problemas |
| 5 | [configuracion](./5%20configuracion.md) | Variables de entorno, valores de ejemplo, variables críticas |
| 6 | [convenciones de desarrollo](./6%20convenciones%20de%20desarrollo.md) | Nombres de archivos, estructura de módulos, TypeScript, errores, commits |
| 7 | [modelo del dominio](./7%20modelo%20del%20dominio.md) | Entidades principales: GameState, Unit, GameAction, ActionRecord, GameHistoryEntry, ModifierInstance |
| 8 | [diagramas tecnicos](./8%20diagramas%20tecnicos.md) | Diagramas Mermaid: secuencia de partida completa, pipeline de acción, desconexión, reporte, ER |
| 9 | [protocolo cliente servidor](./9%20protocolo%20cliente%20servidor.md) | Mensajes entrantes y salientes Socket.IO, protocolo interno `/__emit` |
| 10 | [maquinas de estado](./10%20maquinas%20de%20estado.md) | Máquinas de estado: GamePhase, Turno, Despliegue, Identidad, Contrajuego, Conexión |
| 11 | [sistema de eventos](./11%20sistema%20de%20eventos.md) | Todos los eventos Socket.IO, mapa de eventos, manejadores, callbacks internos |
| 12 | [persistencia](./12%20persistencia.md) | Modelo de persistencia, payload del reporte, tablas en PostgreSQL, idempotencia, reintentos |
| — | [analisis_server](./analisis_server.md) | Análisis de bugs, fortalezas y puntos de mejora del servidor de juego |
