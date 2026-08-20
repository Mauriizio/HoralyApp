"use client"

import { useState } from "react"
import { Download, Share, Plus, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import { useI18n } from "@/components/i18n-provider"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface InstallAppButtonProps {
  variant?: "default" | "outline" | "ghost"
  size?: "default" | "sm" | "lg"
  className?: string
  /** Hide entirely when the app cannot be installed (already installed). */
  hideWhenInstalled?: boolean
}

export function InstallAppButton({
  variant = "default",
  size = "sm",
  className,
  hideWhenInstalled = true,
}: InstallAppButtonProps) {
  const { t } = useI18n()
  const { installed, canPrompt, showInstructions, platform, install } = usePwaInstall()
  const [instructionsOpen, setInstructionsOpen] = useState(false)

  if (installed) {
    if (hideWhenInstalled) return null
    return (
      <Button variant="outline" size={size} className={className} disabled>
        <Check className="h-4 w-4 mr-1.5" />
        {t("install.installed")}
      </Button>
    )
  }

  // Nothing to do: not installable on this device (e.g., desktop Firefox without prompt).
  if (!canPrompt && !showInstructions) return null

  const handleClick = async () => {
    const result = await install()
    if (result === "accepted") {
      toast.success(t("install.success"))
    } else if (result === "instructions") {
      setInstructionsOpen(true)
    }
  }

  return (
    <>
      <Button
        variant={variant}
        size={size}
        onClick={handleClick}
        className={cn(className)}
      >
        <Download className="h-4 w-4 mr-1.5" />
        {t("install.button")}
      </Button>

      <Dialog open={instructionsOpen} onOpenChange={setInstructionsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("install.dialogTitle")}</DialogTitle>
            <DialogDescription>{t("install.dialogIntro")}</DialogDescription>
          </DialogHeader>

          {platform === "ios" ? (
            <ol className="space-y-3 text-sm pt-2">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  1
                </span>
                <span className="flex-1 leading-relaxed">
                  {t("install.ios.step1")}{" "}
                  <Share className="inline h-4 w-4 align-text-bottom mx-1" />
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  2
                </span>
                <span className="flex-1 leading-relaxed">
                  {t("install.ios.step2")}{" "}
                  <span className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1.5 py-0.5 text-xs">
                    <Plus className="h-3 w-3" />
                    {t("install.ios.addToHome")}
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  3
                </span>
                <span className="flex-1 leading-relaxed">{t("install.ios.step3")}</span>
              </li>
            </ol>
          ) : platform === "android" ? (
            <ol className="space-y-3 text-sm pt-2">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  1
                </span>
                <span className="flex-1 leading-relaxed">{t("install.android.step1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  2
                </span>
                <span className="flex-1 leading-relaxed">{t("install.android.step2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  3
                </span>
                <span className="flex-1 leading-relaxed">{t("install.android.step3")}</span>
              </li>
            </ol>
          ) : (
            <ol className="space-y-3 text-sm pt-2">
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  1
                </span>
                <span className="flex-1 leading-relaxed">{t("install.desktop.step1")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  2
                </span>
                <span className="flex-1 leading-relaxed">{t("install.desktop.step2")}</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                  3
                </span>
                <span className="flex-1 leading-relaxed">{t("install.desktop.step3")}</span>
              </li>
            </ol>
          )}

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={() => setInstructionsOpen(false)}>
              {t("common.close")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
