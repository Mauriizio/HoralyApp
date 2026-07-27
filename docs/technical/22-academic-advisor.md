# Consejero académico determinista

El consejero vive en `domain/academic-advisor/` y no usa LLM, APIs externas ni aleatoriedad real. Cada recomendación incluye id estable, prioridad, título, mensaje, explicación, evidencia, acción sugerida y vigencia.

Las reglas iniciales cubren evaluación próxima, transversal necesario, pesos inválidos, falta de planificación de estudio y carga semanal alta. Entre recomendaciones de igual prioridad se aplica rotación determinista por fecha para evitar repetición sin perder reproducibilidad.
