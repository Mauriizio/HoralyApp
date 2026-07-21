import type { ToolPluginModule } from "@/lib/plugins/plugin-types"
import { manifest } from "./manifest"

const resistorColorCode: ToolPluginModule = {
  manifest,
  isEnabled: () => process.env.NEXT_PUBLIC_RESISTOR_COLOR_CODE_ENABLED !== "false",
  load: () => import("./ui").then((module) => ({ default: module.default })),
}

export default resistorColorCode
