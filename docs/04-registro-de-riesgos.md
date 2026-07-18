# 04 — Registro de riesgos

| Prioridad | Riesgo | Mitigación |
| --- | --- | --- |
| P0 | Datos corruptos importados | Validación Zod, relaciones y respaldo previo. |
| P0 | Errores TypeScript ocultos | Build sin `ignoreBuildErrors` y CI. |
| P1 | Recordatorios no confiables con app cerrada | Documentar limitación y planificar Web Push/backend. |
| P1 | Pérdida de bloques por cambios horarios | Confirmación explícita y conservación cuando sea posible. |
| P1 | Escalas incompatibles con notas históricas | Bloqueo de cambios incompatibles; no conversión automática hasta escala por semestre. |
| P1 | Falta ESLint real para TypeScript/TSX | Diferido por bloqueo de registry; implementar stack ESLint compatible con Next.js, TypeScript, TSX y React Hooks en una iteración posterior. |
| P2 | LocalStorage no escala a multiusuario | Arquitectura objetivo con Supabase y RLS. |
