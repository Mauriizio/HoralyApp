"use client"

import type { HorarilyCompanionMessage } from "@/domain/horarily-companion"
import type { AppTab } from "@/components/app-shell/navigation"

export function AcademicTicker({ messages, onNavigate }: { messages: HorarilyCompanionMessage[]; onNavigate: (tab: AppTab) => void }) {
  const items = messages.filter((item) => item.kind !== "empty").slice(0, 8)
  if (!items.length) return null
  const content = (copy: string) => <div className="flex shrink-0 items-center" aria-hidden={copy === "duplicate"}>
    {items.map((item) => <button key={`${copy}-${item.key}`} type="button" onClick={() => item.action && onNavigate(item.action)} className="academic-ticker-item min-h-8 whitespace-nowrap px-4 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
      <span className="mr-1 text-primary">{item.urgent ? "URGENTE" : item.kind === "current-class" ? "AHORA" : "PRÓXIMO"} ·</span>{item.message}<span className="ml-4 text-muted-foreground" aria-hidden>•</span>
    </button>)}
  </div>
  return <section className="academic-ticker border-b border-primary/15 bg-primary/[0.06]" aria-label={`Actualidad académica: ${items[0].message}`}>
    <div className="academic-ticker-track">{content("original")}{content("duplicate")}</div>
    <div className="academic-ticker-static"><button type="button" onClick={() => items[0].action && onNavigate(items[0].action)} className="min-h-8 w-full truncate px-3 text-left text-xs"><span className="font-semibold text-primary">PRÓXIMO · </span>{items[0].message}</button></div>
  </section>
}
