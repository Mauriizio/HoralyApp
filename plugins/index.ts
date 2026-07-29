import resistorColorCode from "./resistor-color-code/index"
import scientificCalculator from "./scientific-calculator/index"
import type { ToolPluginModule } from "@/lib/plugins/plugin-types"

export const toolPlugins: ToolPluginModule[] = [
  resistorColorCode,
  scientificCalculator,
]
