import type { ReactNode } from "react"
import { DesktopSidebar } from "./desktop-sidebar"
import { MobileBottomNav } from "./mobile-bottom-nav"
import type { AppTab } from "./navigation"

interface AppShellProps {
  activeTab: AppTab
  onNavigate: (tab: AppTab) => void
  syncMessage: string
  header: ReactNode
  ticker?: ReactNode
  children: ReactNode
  footer?: ReactNode
}

export function AppShell({
  activeTab,
  onNavigate,
  syncMessage,
  header,
  ticker,
  children,
  footer,
}: AppShellProps) {
  return (
    <div className="min-h-svh w-full overflow-x-clip bg-[radial-gradient(circle_at_top_right,color-mix(in_oklab,var(--primary)_8%,transparent),transparent_36%)]">
      <DesktopSidebar activeTab={activeTab} onNavigate={onNavigate} syncMessage={syncMessage} />
      <div className="min-h-svh lg:pl-64">
        <div className="sticky top-0 z-40 bg-background pt-[env(safe-area-inset-top)]">
          {ticker}
          {header}
        </div>
        <main className="mx-auto w-full max-w-[1440px] px-3 py-4 pb-24 sm:px-5 sm:py-6 lg:px-8 lg:pb-8">
          {children}
        </main>
        {footer}
      </div>
      <MobileBottomNav activeTab={activeTab} onNavigate={onNavigate} />
    </div>
  )
}
