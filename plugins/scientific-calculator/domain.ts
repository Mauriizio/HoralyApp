export type AngleMode = "DEG" | "RAD"

type Token = { kind: "number"; value: number } | { kind: "name"; value: string } | { kind: "symbol"; value: string } | { kind: "eof" }

export class CalculatorError extends Error {}

function tokenize(source: string): Token[] {
  const tokens: Token[] = []
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (/\s/.test(char)) { index += 1; continue }
    if (/[0-9.]/.test(char)) {
      const match = source.slice(index).match(/^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i)
      if (!match) throw new CalculatorError("Número inválido.")
      const value = Number(match[0])
      if (!Number.isFinite(value)) throw new CalculatorError("Número fuera de rango.")
      tokens.push({ kind: "number", value })
      index += match[0].length
      continue
    }
    if (/[a-zπ]/i.test(char)) {
      const match = source.slice(index).match(/^[a-zπ]+/i)
      tokens.push({ kind: "name", value: match![0].toLowerCase() })
      index += match![0].length
      continue
    }
    if ("+-*/^()!%".includes(char)) {
      tokens.push({ kind: "symbol", value: char })
      index += 1
      continue
    }
    throw new CalculatorError(`Símbolo no permitido: ${char}`)
  }
  return [...tokens, { kind: "eof" }]
}

export function factorial(value: number): number {
  if (!Number.isInteger(value) || value < 0) throw new CalculatorError("El factorial requiere un entero no negativo.")
  if (value > 170) throw new CalculatorError("El resultado es demasiado grande.")
  let result = 1
  for (let current = 2; current <= value; current += 1) result *= current
  return result
}

export function evaluateExpression(source: string, angleMode: AngleMode = "DEG"): number {
  if (!source.trim()) throw new CalculatorError("Escribe una expresión.")
  const tokens = tokenize(source)
  let cursor = 0
  const peek = () => tokens[cursor]
  const takeSymbol = (symbol: string) => {
    const token = peek()
    if (token.kind !== "symbol" || token.value !== symbol) return false
    cursor += 1
    return true
  }

  const primary = (): number => {
    const token = peek()
    if (token.kind === "number") { cursor += 1; return token.value }
    if (takeSymbol("(")) {
      const value = addition()
      if (!takeSymbol(")")) throw new CalculatorError("Falta cerrar un paréntesis.")
      return value
    }
    if (token.kind === "name") {
      cursor += 1
      if (token.value === "pi" || token.value === "π") return Math.PI
      if (token.value === "e") return Math.E
      if (!takeSymbol("(")) throw new CalculatorError(`La función ${token.value} requiere paréntesis.`)
      const argument = addition()
      if (!takeSymbol(")")) throw new CalculatorError("Falta cerrar un paréntesis.")
      const radians = angleMode === "DEG" ? argument * Math.PI / 180 : argument
      const functions: Record<string, () => number> = {
        sin: () => Math.sin(radians),
        cos: () => Math.cos(radians),
        tan: () => Math.cos(radians) === 0 ? Number.NaN : Math.tan(radians),
        log: () => Math.log10(argument),
        ln: () => Math.log(argument),
        sqrt: () => Math.sqrt(argument),
      }
      const operation = functions[token.value]
      if (!operation) throw new CalculatorError(`Función desconocida: ${token.value}`)
      const result = operation()
      if (!Number.isFinite(result)) throw new CalculatorError("El valor está fuera del dominio de la función.")
      return result
    }
    throw new CalculatorError("La expresión está incompleta.")
  }
  const postfix = (): number => {
    let value = primary()
    while (true) {
      if (takeSymbol("!")) value = factorial(value)
      else if (takeSymbol("%")) value /= 100
      else break
    }
    return value
  }
  const unary = (): number => takeSymbol("+") ? unary() : takeSymbol("-") ? -unary() : postfix()
  const power = (): number => {
    const base = unary()
    return takeSymbol("^") ? Math.pow(base, power()) : base
  }
  const multiplication = (): number => {
    let value = power()
    while (true) {
      if (takeSymbol("*")) value *= power()
      else if (takeSymbol("/")) {
        const divisor = power()
        if (divisor === 0) throw new CalculatorError("No se puede dividir por cero.")
        value /= divisor
      } else break
    }
    return value
  }
  const addition = (): number => {
    let value = multiplication()
    while (true) {
      if (takeSymbol("+")) value += multiplication()
      else if (takeSymbol("-")) value -= multiplication()
      else break
    }
    return value
  }

  const result = addition()
  if (peek().kind !== "eof") throw new CalculatorError("Revisa los operadores y paréntesis.")
  if (!Number.isFinite(result)) throw new CalculatorError("El resultado está fuera de rango.")
  return Math.abs(result) < 1e-14 ? 0 : result
}

export function formatCalculatorResult(value: number): string {
  return Number.isInteger(value) ? String(value) : Number(value.toPrecision(12)).toString()
}
