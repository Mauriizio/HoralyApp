export function displayGivenName(value: string) {
  const safe = value.replace(/<[^>]*>/g, "").replace(/[<>]/g, "").trim().replace(/\s+/g, " ")
  if (!safe) return ""
  return safe === safe.toLocaleUpperCase("es")
    ? safe.toLocaleLowerCase("es").replace(/(^|[\s-])\p{L}/gu, (letter) => letter.toLocaleUpperCase("es"))
    : safe
}
