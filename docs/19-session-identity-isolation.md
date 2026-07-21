# Aislamiento de identidad de sesión

## Problema

El flujo multicuenta puede mezclar Auth, repositorio, datos hidratados y Storage cuando una carga asíncrona o una operación de avatar iniciada por el usuario A termina después de que el usuario B ya comenzó sesión. Esto puede asociar archivos físicos o `profiles.avatar_url` al usuario incorrecto.

## Barrera obligatoria

Toda operación cloud sensible debe comprobar la igualdad:

```text
authUserId = verifiedUserId = repositoryOwnerUserId = dataOwnerUserId = storageFolderUserId
```

Si algún valor no coincide, la operación aborta con `SessionIdentityMismatchError` y muestra un mensaje seguro.

## AuthProvider

`AuthProvider` expone `userId`, `authGeneration`, `transitioning` y `verifyCurrentUser()`. La generación cambia en eventos `INITIAL_SESSION`, `SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED` y cambios reales de usuario. `verifyCurrentUser()` usa `supabase.auth.getUser()` para validar contra Supabase y no depende solamente de `getSession` o `localStorage`.

## Remontaje por usuario

El workspace privado vive dentro de un boundary montado con `key={userId ?? "guest"}`. Durante `transitioning` no se monta el workspace, por lo que se desmontan diálogos, stores, referencias de repositorio y previews del usuario anterior.

## Store con propietario explícito

`useScheduleStore` mantiene:

- `dataOwnerUserId`
- `repositoryOwnerUserId`
- `identityReady`

Durante transición se limpian datos visibles y se bloquean operaciones. Al hidratar, se captura `expectedUserId` y `authGeneration`; antes de aplicar resultados se descartan cargas tardías si la sesión cambió.

## Repositorio enlazado

`SupabaseAcademicRepository.assertRepositoryOwner(expectedUserId)` impide usar un repositorio construido para otra cuenta. `persistCloud(expectedUserId, operation, options)` comprueba Auth, Store, Repository y generación antes y después de `await operation()`.

## Avatar transaccional compensado

`ProfileForm` captura `operationUserId` y `operationAuthGeneration` al presionar Guardar. Verifica `getUser()` antes del upload, después del upload y después de persistir `profiles.avatar_url`. Si la sesión cambia, elimina el archivo recién subido bajo el `operationUserId`, conserva el perfil anterior y no limpia paths de otra cuenta.

## UI durante transición

Mientras `AuthProvider.transitioning` o `store.identityReady === false`, la UI muestra “Cambiando de cuenta…”, no muestra avatar anterior, no permite abrir `ProfileForm` y no ejecuta operaciones cloud.

## Service worker

En desarrollo no se registra service worker y se desregistran workers Horaly existentes. Solo se limpian caches con prefijo `horaly-`. En producción, el service worker no cachea respuestas de Supabase Auth, REST, Storage, URLs externas ni avatares.
