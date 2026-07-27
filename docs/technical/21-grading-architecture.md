# Arquitectura de notas jerárquicas

Horaly separa la nota final en `AssessmentGroup` y `Assessment`. El **peso final** (`courseWeight`) vive en el grupo y representa cuánto aporta una etapa a la nota del ramo. El **peso interno** (`weightWithinGroup`) vive en cada evaluación y solo reparte el peso dentro de su etapa.

Fórmula principal:

```text
final = suma(promedioGrupo × courseWeight / 100)
peso efectivo evaluación = courseWeight × weightWithinGroup / 100
```

Ejemplo 60/40: Presentación pesa 60% con cinco evaluaciones internas que suman 100%; Examen transversal pesa 40% con una evaluación interna de 100%. Si la presentación es 5,0 y la meta es 4,0, el transversal necesario es 2,5 porque `(4,0 - 5,0 × 0,60) / 0,40 = 2,5`.

Una configuración puede quedar incompleta en borrador. En ese caso se muestran advertencias y no se presenta una nota final definitiva. Los resultados reales usan evaluaciones calificadas; las proyecciones completan grupos pendientes con promedios actuales; las simulaciones deben etiquetarse como escenarios.

## Migración legacy

La migración `202607210001_advanced_grading_groups.sql` crea `assessment_groups` y adapta `grades` como evaluaciones. Cada materia con notas legacy recibe un grupo `Evaluación continua` con `course_weight = 100`; las notas conservan `id`, `score`, `weight`, `date`, `notes`, `user_id`, `semester_id` y `subject_id`.
