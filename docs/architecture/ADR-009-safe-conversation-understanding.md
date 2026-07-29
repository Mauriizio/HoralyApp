# ADR-009 — Comprensión segura del asistente

## Estado

Aceptado para la PR #19.

## Decisión

Producción usa `DeterministicConversationAdapter`. El texto produce una intención tipada y entidades limitadas; la aplicación valida, confirma y ejecuta el caso de uso. Ningún adaptador escribe directamente en stores, repositorios, rutas ni servicios cloud.

`ConversationUnderstandingAdapter` desacopla comprensión y ejecución. `ExperimentalAiConversationAdapter` permanece desactivado mediante una bandera `false`, sin proveedor, claves, descargas ni modelo.

## Alternativas

| Opción | Privacidad | Latencia y descarga | Móvil | Coste y mantenimiento |
|---|---|---|---|---|
| Parser determinista | Local; texto no sale del dispositivo | Inmediata, sin descarga | Amplia compatibilidad | Bajo, corpus explícito |
| Transformers.js | Local | Modelo inicial y memoria moderados | Variable | Reentrenamiento y distribución |
| WebLLM/WebGPU | Local | Descarga y memoria altas | Compatibilidad limitada | Operación compleja |
| Gemini Flash-Lite en servidor | Texto sale al proveedor con controles | Red obligatoria | Compatible si hay red | Coste, privacidad y endpoint seguro |

## Consecuencias

- El parser determinista es la única implementación activa en esta fase.
- Una futura IA solo podrá clasificar intenciones.
- Las mutaciones siguen el flujo intención → validación → confirmación → caso de uso → persistencia → resultado.
- No se integran LLM, modelos binarios ni API keys en esta PR.
