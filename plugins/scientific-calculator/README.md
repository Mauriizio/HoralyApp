# Calculadora científica

Plugin local y autocontenido para expresiones matemáticas. Usa un parser
recursivo propio, sin `eval`, `Function`, red, telemetría ni datos personales.

Incluye precedencia, paréntesis, potencia, porcentaje, factorial, constantes,
trigonometría DEG/RAD, logaritmos, raíz, inverso, teclado e historial de sesión.
La única persistencia namespaced guarda que el tutorial ya fue visto.

## Bundle

No agrega dependencias. El dominio y la UI se cargan de forma diferida al abrir
la herramienta.
