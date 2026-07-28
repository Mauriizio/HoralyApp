"use client"

import { CalendarDays } from "lucide-react"
import { cn } from "@/lib/utils"
import { NAVIGATION_ITEMS, type AppTab } from "./navigation"

interface DesktopSidebarProps {
  activeTab: AppTab
  onNavigate: (tab: AppTab) => void
  syncMessage: string
}

export function DesktopSidebar({ activeTab, onNavigate, syncMessage }: DesktopSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-sidebar-border bg-sidebar/95 backdrop-blur-xl lg:flex lg:flex-col">
      <div className="flex h-20 items-center gap-3 border-b border-sidebar-border px-5">
        <span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-[0_8px_28px_-12px_var(--primary)]">
          <CalendarDays className="size-5" aria-hidden="true" />
        </span>
        <span>
          <span className="block text-base font-semibold tracking-tight">Horarily</span>
          <span className="block text-xs text-muted-foreground">Tu espacio académico</span>
        </span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Navegación principal">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Tu semestre
        </p>
        <div className="space-y-1">
          {NAVIGATION_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id || (activeTab === "onboarding" && id === "preferencias")
            return (
              <button
                key={id}
                type="button"
                onClick={() => onNavigate(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                  active
                    ? "bg-sidebar-primary/14 text-sidebar-primary"
                    : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                <span>{label}</span>
                {active && <span className="ml-auto size-1.5 rounded-full bg-sidebar-primary" aria-hidden="true" />}
              </button>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-sidebar-border p-4">
        <div className="rounded-xl border border-sidebar-border bg-background/35 px-3 py-3">
          <p className="text-xs font-medium">Estado de tus datos</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">{syncMessage}</p>
        </div>
      </div>
    </aside>
  )
}
