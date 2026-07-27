# Orarily — Design Constitution

**Estado:** Propuesta inicial basada en los mockups objetivo de dashboard desktop y mobile  
**Versión:** 1.0  
**Propietario:** Maurizio Caballero  
**Producto:** Orarily / HoralyApp  
**Ubicación recomendada:** `docs/design/DESIGN_CONSTITUTION.md`

---

## 1. Propósito

Este documento define la dirección visual y de experiencia de Orarily.

Su objetivo es evitar que cada pantalla, componente o funcionalidad parezca diseñada de forma aislada. Toda implementación nueva debe mantener una identidad coherente, moderna, académica y profesional.

Las referencias visuales principales son:

- `docs/design/references/dashboard-desktop-v1.png`
- `docs/design/references/dashboard-mobile-v1.png`

Estas imágenes representan la dirección deseada, no una obligación de copiar cada píxel. Se deben respetar especialmente:

- jerarquía visual;
- distribución de información;
- navegación;
- uso de tarjetas;
- sensación premium;
- claridad de datos académicos;
- adaptación responsive;
- contraste;
- consistencia entre escritorio y móvil.

---

## 2. Personalidad visual

Orarily debe sentirse:

- moderno;
- confiable;
- inteligente;
- académico;
- técnico;
- organizado;
- motivador;
- premium sin ser recargado;
- útil antes que decorativo.

No debe sentirse:

- infantil;
- excesivamente corporativo;
- genérico;
- saturado de colores;
- como una plantilla sin identidad;
- como un panel financiero;
- como una aplicación de entretenimiento;
- como una colección desordenada de tarjetas.

La interfaz debe transmitir que el estudiante tiene control sobre su semestre, su rendimiento y sus próximas decisiones.

---

## 3. Principios de diseño

### 3.1 La información importante debe verse primero

El dashboard debe responder rápidamente:

1. ¿Qué tengo hoy?
2. ¿Cuál es mi próxima clase?
3. ¿Qué evaluación o tarea vence pronto?
4. ¿Cómo voy académicamente?
5. ¿Qué requiere mi atención?
6. ¿Qué debo hacer ahora?

### 3.2 Utilidad antes que decoración

Ningún gráfico, tarjeta o indicador debe existir solo por estética.

Cada elemento debe:

- mostrar información útil;
- ayudar a decidir;
- permitir una acción;
- resumir una situación;
- reducir carga mental.

### 3.3 Densidad controlada

Orarily puede mostrar mucha información, pero debe dividirla en bloques comprensibles.

Se debe evitar:

- texto amontonado;
- tarjetas sin separación;
- gráficos innecesarios;
- exceso de colores;
- demasiadas acciones visibles simultáneamente.

### 3.4 Consistencia

Los mismos conceptos deben verse y comportarse igual en toda la aplicación:

- materias;
- notas;
- evaluaciones;
- prioridades;
- fechas;
- estados;
- acciones;
- alertas.

### 3.5 Responsive real

La versión móvil no debe ser una versión desktop comprimida.

En móvil se debe:

- priorizar;
- reordenar;
- simplificar;
- convertir tablas en listas;
- usar navegación inferior;
- ocultar detalles secundarios;
- mantener acciones principales accesibles con una mano.

---

## 4. Tema visual

### 4.1 Tema principal

La dirección inicial es **dark-first**.

La aplicación debe usar fondos oscuros azulados, no negro puro en todos los niveles.

Capas recomendadas:

- fondo de aplicación;
- superficies principales;
- tarjetas;
- tarjetas elevadas;
- controles;
- bordes;
- estados activos.

### 4.2 Paleta orientativa

Los valores exactos deben convertirse posteriormente en design tokens.

```css
:root {
  --background: #07111f;
  --background-elevated: #0b1626;
  --surface: #0f1b2d;
  --surface-secondary: #132136;
  --surface-hover: #182943;

  --border: #22324a;
  --border-subtle: #1a2a40;

  --text-primary: #f4f7fb;
  --text-secondary: #aeb9c9;
  --text-muted: #748196;

  --primary: #7c3aed;
  --primary-hover: #8b5cf6;
  --primary-soft: rgba(124, 58, 237, 0.16);

  --info: #2f80ed;
  --success: #20c77a;
  --warning: #f59e0b;
  --danger: #ef4444;

  --focus-ring: rgba(139, 92, 246, 0.55);
}
```

La paleta puede ajustarse al sistema actual del repositorio, pero debe conservar:

- morado como color de identidad;
- azul para información;
- verde para éxito;
- naranja para advertencias;
- rojo para riesgos y vencimientos.

### 4.3 Colores por materia

Cada materia puede tener un color propio.

Ese color debe usarse con moderación en:

- indicadores;
- puntos;
- bordes;
- etiquetas;
- barras;
- eventos del calendario.

No se debe colorear una tarjeta completa con colores intensos.

---

## 5. Tipografía

Usar una tipografía sans-serif moderna, legible y neutral.

Opciones apropiadas:

- Inter;
- Geist;
- Manrope;
- system font stack.

Jerarquía sugerida:

- Título de página: 28–34 px desktop, 24–28 px mobile.
- Título de sección: 18–22 px.
- Título de tarjeta: 14–18 px.
- Métrica principal: 28–40 px.
- Texto normal: 14–16 px.
- Texto secundario: 12–14 px.
- Etiquetas pequeñas: 11–12 px.

Reglas:

- no usar más de tres pesos tipográficos por pantalla;
- evitar mayúsculas completas en títulos largos;
- usar peso fuerte para datos, no para párrafos enteros;
- mantener buen interlineado;
- priorizar legibilidad.

---

## 6. Espaciado y ritmo

Usar una escala consistente basada en 4 px.

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64
```

Recomendaciones:

- padding de tarjeta: 16–24 px;
- separación entre tarjetas: 16–24 px;
- separación entre secciones: 24–40 px;
- separación interna entre título y contenido: 12–16 px;
- altura mínima táctil: 44 px.

En móvil:

- margen lateral: 16 px;
- separación entre módulos: 16 px;
- controles principales: mínimo 44–48 px de alto.

---

## 7. Bordes, radios y profundidad

### 7.1 Border radius

Dirección recomendada:

- controles pequeños: 8–10 px;
- botones: 10–12 px;
- tarjetas: 14–18 px;
- modales: 18–24 px;
- chips: 999 px cuando corresponda.

### 7.2 Bordes

Usar bordes sutiles para separar superficies.

No depender exclusivamente de sombras.

### 7.3 Sombras

En dark mode, usar sombras suaves y controladas.

Evitar:

- glow excesivo;
- sombras negras muy duras;
- efectos neón en todas las tarjetas.

El color primario puede tener un resplandor leve únicamente en:

- acción principal;
- estado activo;
- elemento seleccionado;
- foco importante.

---

## 8. Navegación desktop

La referencia desktop usa una barra lateral fija.

Debe incluir:

- logo y nombre;
- Dashboard;
- Horario;
- Asignaturas;
- Planificador;
- Notas;
- Tareas;
- Agenda;
- Consejero;
- Estadísticas;
- Herramientas o Recursos;
- Ajustes.

Reglas:

- icono + texto;
- sección activa claramente visible;
- navegación secundaria agrupada;
- opción de colapsar en pantallas medianas;
- no usar más de un color fuerte para el estado activo;
- mantener acceso al perfil en zona superior o inferior.

La barra superior puede incluir:

- búsqueda;
- notificaciones;
- perfil;
- selector de semestre o vista.

---

## 9. Navegación mobile

La referencia mobile usa navegación inferior.

Pestañas recomendadas:

1. Dashboard
2. Horario
3. Asignaturas
4. Tareas
5. Más

La sección “Más” puede contener:

- Agenda;
- Notas;
- Consejero;
- Estadísticas;
- Herramientas;
- Ajustes.

Reglas:

- máximo cinco destinos principales;
- icono y etiqueta;
- estado activo evidente;
- barra persistente;
- respetar safe area;
- no cubrir contenido;
- acciones críticas accesibles con el pulgar.

El menú hamburguesa debe usarse solo para navegación secundaria o configuración, no como único acceso a las funciones principales.

---

## 10. Dashboard desktop

La composición objetivo debe tener:

### 10.1 Encabezado

- saludo personalizado;
- fecha actual;
- búsqueda;
- notificaciones;
- perfil;
- selector de vista o semestre.

### 10.2 Métricas superiores

Tarjetas compactas para:

- promedio general;
- cantidad de asignaturas;
- tareas completadas;
- próxima clase.

Cada tarjeta debe contener:

- icono;
- etiqueta;
- valor principal;
- contexto secundario;
- indicador visual discreto;
- acción opcional.

### 10.3 Horario de hoy

Debe mostrar:

- hora;
- materia;
- sala;
- estado actual;
- color de materia;
- próxima transición;
- acceso al horario completo.

La clase actual debe destacarse claramente.

### 10.4 Agenda

Debe mostrar:

- calendario compacto;
- próximos eventos;
- vencimientos;
- categorías;
- acceso a agenda completa.

### 10.5 Resumen de asignaturas

Debe mostrar:

- nombre;
- progreso;
- promedio;
- estado;
- riesgo;
- acceso al detalle.

### 10.6 Tareas pendientes

Debe priorizar por:

- vencidas;
- hoy;
- mañana;
- próximas;
- alto peso o importancia.

### 10.7 Carga académica

El indicador de carga debe basarse en datos reales.

Debe distinguir:

- clases;
- estudio;
- tareas;
- tiempo libre;
- carga estimada.

---

## 11. Dashboard mobile

La versión móvil debe presentar primero lo esencial.

Orden recomendado:

1. saludo y fecha;
2. resumen rápido;
3. próxima clase;
4. horario de hoy;
5. tareas urgentes;
6. resumen de asignaturas;
7. agenda;
8. recomendaciones.

Las tarjetas de métricas pueden:

- desplazarse horizontalmente;
- mostrarse en cuadrícula de dos columnas;
- reducir el contenido secundario.

Evitar cuatro tarjetas demasiado estrechas si perjudican la lectura.

El contenido debe poder leerse sin zoom.

Tablas complejas deben transformarse en:

- listas;
- accordions;
- tarjetas;
- vistas de detalle.

---

## 12. Tarjetas

Toda tarjeta debe tener una responsabilidad clara.

Estructura típica:

- encabezado;
- título;
- acción secundaria;
- contenido;
- estado vacío;
- estado de carga;
- estado de error.

No colocar múltiples acciones principales en la misma tarjeta.

Tipos de tarjetas:

- métrica;
- lista;
- progreso;
- recomendación;
- evento;
- alerta;
- resumen;
- acción rápida.

---

## 13. Botones y acciones

Jerarquía:

### Primario

Para la acción principal de una vista.

Ejemplos:

- Guardar;
- Crear evaluación;
- Añadir materia;
- Generar horario;
- Descargar PDF.

### Secundario

Para acciones alternativas.

### Terciario o ghost

Para navegación o acciones de bajo peso.

### Destructivo

Solo para acciones irreversibles o de alto riesgo.

Reglas:

- una acción primaria dominante por contexto;
- texto claro;
- no usar solo iconos en acciones ambiguas;
- confirmar acciones destructivas;
- mostrar progreso en operaciones lentas;
- evitar botones deshabilitados sin explicación.

---

## 14. Formularios

Los formularios deben:

- tener etiquetas persistentes;
- mostrar ayuda contextual;
- validar cerca del campo;
- conservar datos ante errores;
- permitir navegación con teclado;
- usar formatos locales;
- explicar ponderaciones y cálculos;
- evitar campos innecesarios.

Para calificaciones:

- mostrar escala;
- peso;
- grupo;
- contribución;
- estado;
- proyección.

---

## 15. Estados visuales

Todo componente interactivo debe contemplar:

- default;
- hover;
- active;
- focus-visible;
- disabled;
- loading;
- success;
- warning;
- error;
- empty.

### 15.1 Loading

Usar skeletons cuando se conoce la estructura.

Evitar spinners de pantalla completa salvo inicialización crítica.

### 15.2 Empty state

Debe explicar:

- qué falta;
- por qué importa;
- qué acción realizar.

### 15.3 Error

Debe indicar:

- qué ocurrió;
- si los datos están seguros;
- qué puede hacer el usuario;
- cómo reintentar.

---

## 16. Datos académicos y visualización

Los datos académicos deben ser comprensibles sin exigir conocimientos técnicos.

### Promedios

Mostrar:

- promedio actual;
- contribución acumulada;
- rango posible;
- nota requerida;
- estado de aprobación.

### Ponderaciones

Distinguir claramente:

- peso dentro del grupo;
- peso del grupo;
- peso efectivo final.

### Riesgo

No usar rojo por una variación mínima.

El nivel de riesgo debe derivarse de reglas definidas.

### Gráficos

Usar gráficos solo cuando mejoran la comprensión.

Preferir:

- barras;
- líneas;
- progreso;
- distribución simple.

Evitar:

- gráficos 3D;
- donuts innecesarios;
- animaciones excesivas;
- gráficos sin etiquetas.

---

## 17. Calendario, agenda y horario

Eventos deben diferenciarse por tipo:

- clase;
- evaluación;
- tarea;
- estudio;
- recordatorio;
- reunión.

Cada evento debe mostrar, según espacio:

- hora;
- título;
- materia;
- ubicación;
- estado;
- prioridad.

Las fechas deben respetar la timezone del perfil.

Los eventos vencidos deben verse claramente, sin depender solo del color.

---

## 18. Consejero académico

Las recomendaciones deben aparecer como información accionable.

Cada recomendación debe mostrar:

- prioridad;
- mensaje;
- evidencia;
- acción sugerida;
- vigencia;
- materia relacionada.

El tono debe ser:

- claro;
- firme;
- útil;
- no alarmista;
- no infantil;
- no moralizante.

---

## 19. Accesibilidad

Objetivo mínimo: WCAG 2.1 AA.

Reglas:

- contraste suficiente;
- navegación por teclado;
- foco visible;
- etiquetas accesibles;
- no depender solo del color;
- tamaños táctiles mínimos;
- textos escalables;
- soporte a reduced motion;
- iconos con nombre accesible;
- estados anunciados cuando corresponda.

---

## 20. Animación

Las animaciones deben ayudar a comprender cambios.

Duración recomendada:

- microinteracciones: 120–180 ms;
- paneles y modales: 180–260 ms;
- cambios complejos: máximo 320 ms.

Evitar:

- rebotes constantes;
- animaciones decorativas continuas;
- transiciones lentas;
- efectos que bloqueen la interacción.

Respetar `prefers-reduced-motion`.

---

## 21. Iconografía

Usar una sola familia de iconos en todo el producto.

Opciones:

- Lucide;
- Radix Icons;
- la familia ya adoptada por el proyecto.

Reglas:

- mismo grosor;
- tamaños consistentes;
- iconos acompañados de texto cuando haya ambigüedad;
- no mezclar estilos filled y outline sin una razón clara.

---

## 22. Componentes base

La implementación debe tender a un sistema reutilizable.

Componentes recomendados:

- `AppShell`
- `DesktopSidebar`
- `MobileBottomNav`
- `TopBar`
- `PageHeader`
- `StatCard`
- `SectionCard`
- `SubjectBadge`
- `GradeBadge`
- `RiskIndicator`
- `ProgressBar`
- `ScheduleTimeline`
- `AgendaList`
- `TaskList`
- `EmptyState`
- `ErrorState`
- `Skeleton`
- `ConfirmDialog`
- `ResponsiveDrawer`

No crear componentes duplicados para problemas equivalentes.

---

## 23. Design tokens

Los valores visuales deben centralizarse.

Categorías:

- color;
- typography;
- spacing;
- radius;
- shadow;
- motion;
- z-index;
- breakpoint;
- layout.

No introducir valores arbitrarios repetidos en componentes.

Los tokens deben integrarse con Tailwind y las variables CSS existentes.

---

## 24. Breakpoints

Referencia inicial:

```text
sm: 640 px
md: 768 px
lg: 1024 px
xl: 1280 px
2xl: 1536 px
```

Comportamiento esperado:

- móvil: navegación inferior;
- tablet: sidebar colapsada o drawer;
- desktop: sidebar fija;
- pantallas grandes: contenido con ancho máximo controlado.

No dejar que las tarjetas se estiren indefinidamente.

---

## 25. Reglas de implementación para Codex

Antes de implementar una pantalla o componente visual, Codex debe:

1. leer este documento;
2. revisar las imágenes de referencia;
3. inspeccionar los componentes existentes;
4. reutilizar tokens y componentes;
5. respetar el modelo de datos real;
6. no inventar métricas;
7. implementar responsive;
8. implementar estados vacíos, loading y error;
9. verificar accesibilidad;
10. ejecutar tests, typecheck y build;
11. aportar capturas desktop y mobile cuando corresponda.

Codex no debe:

- reemplazar toda la UI sin plan;
- introducir una librería visual nueva sin ADR;
- copiar datos ficticios a producción;
- hardcodear información del estudiante;
- romper light mode si existe;
- cambiar dominio o persistencia para resolver estética;
- rediseñar funcionalidades fuera del alcance;
- confundir mockup con especificación funcional definitiva.

---

## 26. Criterios de aceptación visual

Una implementación se considera alineada cuando:

- existe coherencia entre desktop y mobile;
- la jerarquía es clara;
- la navegación funciona;
- la información prioritaria aparece primero;
- el dashboard no está sobrecargado;
- los colores tienen significado;
- los componentes son reutilizables;
- el diseño es accesible;
- los datos mostrados son reales;
- no hay desbordamientos;
- funciona desde móvil;
- conserva el rendimiento;
- se parece a la dirección de los mockups sin convertirse en una copia rígida.

---

## 27. Gobernanza

Cambios que requieren una decisión documentada:

- cambio de identidad visual;
- cambio de sistema de colores;
- nueva librería de componentes;
- cambio de tipografía principal;
- modificación de navegación global;
- nuevo patrón de layout;
- cambio significativo de tokens;
- eliminación de dark mode;
- incorporación de una segunda identidad visual.

Las decisiones importantes deben registrarse en un ADR.

---

## 28. Referencias visuales

Los mockups deben almacenarse en:

```text
docs/design/references/
├── dashboard-desktop-v1.png
└── dashboard-mobile-v1.png
```

Este documento debe almacenarse en:

```text
docs/design/DESIGN_CONSTITUTION.md
```

Documentos complementarios futuros:

```text
docs/design/
├── DESIGN_CONSTITUTION.md
├── COMPONENT_INVENTORY.md
├── DESIGN_TOKENS.md
├── ACCESSIBILITY_CHECKLIST.md
├── RESPONSIVE_RULES.md
└── references/
```

---

## 29. Principio final

Orarily no debe limitarse a verse bonito.

Debe ayudar al estudiante a comprender su situación académica, decidir qué hacer y actuar a tiempo.

La calidad visual debe reforzar la utilidad, la confianza y la claridad del producto.
