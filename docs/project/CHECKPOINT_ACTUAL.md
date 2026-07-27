# Checkpoint actual de HoralyApp

## Estado verificado al transferir

- Repositorio: `Mauriizio/HoralyApp`
- Rama: `main`
- Production: `https://horaly-app.vercel.app`
- PR #14: fusionada
- Merge commit: `9b530e18e1ded54320a0da1584d43f5e573e41c7`
- Migración `202607210001_advanced_grading_groups.sql`: aplicada
- Validación previa al merge: 165 tests, 165 pass, 0 fail
- Typecheck y build: aprobados
- Calidad, CodeQL y Vercel Preview: aprobados

## Funcionalidad disponible

- Auth y cuentas
- Perfil y avatar versionado
- Aislamiento A/B
- Supabase/RLS
- Semestres
- Onboarding
- Horario
- Estudio
- Recordatorios
- Notas jerárquicas
- Preset 60/40
- Proyección de transversal
- Agenda con timezone
- Consejero determinista
- PDF de horario
- Plataforma de herramientas
- Plugin de resistencias v1

## Próximo paso

Realizar auditoría de Production y reconciliar:

1. HEAD real de `main`
2. commit de Vercel Production
3. migraciones remotas
4. Security Advisor
5. persistencia real de notas
6. PDF en móvil
7. A/B
8. semestres y agenda

No iniciar una nueva macrofase antes de terminar esta auditoría.
