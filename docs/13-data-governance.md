# Gobierno de datos

- El modo invitado persiste en `localStorage` y no mezcla datos con cloud.
- El modo autenticado usa Supabase mediante repositorios.
- Migraciones cloud son versionadas e idempotentes.
- Datos legacy sin semestre se asignan a un semestre inicial seguro.
- Borrados deben tener comportamiento `ON DELETE` explícito.
- No se almacenan secretos en el repositorio ni en datos exportados.
