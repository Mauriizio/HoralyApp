# PDF profesional del horario

El PDF se genera desde `ScheduleDocumentModel`, `SchedulePdfOptions` y un adaptador `SchedulePdfRenderer`; no se renderiza desde el DOM. El modelo contiene perfil visible, institución, carrera, semestre, asignaturas, módulos, horario, bloques de estudio opcionales y fecha de generación.

Privacidad: el correo no se incluye por defecto, el generador corre en el navegador y no envía datos a servicios remotos. El nombre de archivo se sanitiza como `horario-{nombre}-{semestre}.pdf`. Las opciones permiten incluir sábado, domingo, bloques de estudio, ocultar datos personales y usar tema claro imprimible A4 horizontal.
