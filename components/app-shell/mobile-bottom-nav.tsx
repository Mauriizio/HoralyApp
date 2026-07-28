"use client"

import { useState } from "react"
import { MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { NAVIGATION_ITEMS, type AppTab } from "./navigation"

interface MobileBottomNavProps {
  activeTab: AppTab
  onNavigate: (tab: AppTab) => void
}

export function MobileBottomNav({ activeTab, onNavigate }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const primary = NAVIGATION_ITEMS.filter((item) => item.mobilePrimary)
  const secondary = NAVIGATION_ITEMS.filter((item) => !item.mobilePrimary)
  const secondaryActive = secondary.some((item) => item.id === activeTab) || activeTab === "onboarding"

  const navigate = (tab: AppTab) => {
    setMoreOpen(false)
    onNavigate(tab)
  }

  return (
    <>
      <nav
        aria-label="Navegación móvil"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/92 px-[max(0.5rem,env(safe-area-inset-left))] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
      >
        <div className="mx-auto grid h-16 max-w-xl grid-cols-5">
          {primary.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                type="button"
                onClick={() => navigate(id)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {active && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />}
                <Icon className="size-5" aria-hidden="true" />
                <span>{label}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            className={cn(
              "relative flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-[11px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              secondaryActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {secondaryActive && <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary" aria-hidden="true" />}
            <MoreHorizontal className="size-5" aria-hidden="true" />
            <span>Más</span>
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="max-h-[82svh] rounded-t-3xl pb-[max(1rem,env(safe-area-inset-bottom))]">
          <SheetHeader className="border-b border-border text-left">
            <SheetTitle>Más opciones</SheetTitle>
            <SheetDescription>Accede al resto de tu espacio académico.</SheetDescription>
          </SheetHeader>
          <nav className="grid grid-cols-2 gap-2 overflow-y-auto px-4 pb-2" aria-label="Más secciones">
            {secondary.map(({ id, label, icon: Icon }) => {
              const active = activeTab === id || (activeTab === "onboarding" && id === "preferencias")
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => navigate(id)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 items-center gap-3 rounded-2xl border p-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    active ? "border-primary/50 bg-primary/10 text-primary" : "border-border bg-card hover:bg-muted",
                  )}
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted">
                    <Icon className="size-[18px]" aria-hidden="true" />
                  </span>
                  {label}
                </button>
              )
            })}
          </nav>
        </SheetContent>
      </Sheet>
    </>
  )
}
