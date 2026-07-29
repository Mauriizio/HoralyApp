# Activación guiada y asistente Horarily

## Activación mínima

HORARILY mantiene la cuenta como opción. Una primera activación válida requiere
un nombre visible, un semestre activo, al menos una materia de ese semestre y
una marca de finalización verificada. Mientras falte alguno de esos elementos,
la aplicación presenta un límite de activación a pantalla completa antes del
App Shell, incluso si la URL solicita una pestaña concreta.

Los estados históricos completos reciben una marca de activación compatible.
Los estados históricos incompletos conservan sus datos y reanudan únicamente
desde el requisito ausente. Haber finalizado la activación es distinto de tener
materias en el presente: eliminar posteriormente la última materia no reinicia
el onboarding.

## Creación de materias

Todos los accesos pasan por el mismo caso de uso tipado. Este comprueba identidad
lista, nombre válido, semestre activo y duplicados antes de crear. El onboarding
y el asistente generan una clave corta y única a partir del nombre; el usuario
básico no necesita conocer sintaxis técnica.

## Persistencia e identidad

El invitado usa el repositorio local. La cuenta autenticada usa el repositorio
cloud existente y verifica propietario y generación de autenticación antes y
después de escrituras sensibles. La transición local a cloud sigue utilizando
el flujo de migración existente; no mezcla automáticamente ambos espacios.

## Asistente conversacional determinista

Horarily usa una máquina de estados e intents locales para ayudar a crear una
materia, listar materias, consultar la próxima clase, abrir notas y mostrar
ayuda. No usa un LLM ni promete lenguaje natural irrestricto. Una entrada que
comienza con `/` se deriva al parser histórico, por lo que los comandos
avanzados siguen disponibles en una sección secundaria.

Durante la activación se reutiliza `/logo/horarily-master.svg` y su controlador
de capas. La animación es breve, informativa y se desactiva con
`prefers-reduced-motion`.
