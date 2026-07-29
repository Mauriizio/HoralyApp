import type { ToolPluginModule } from "@/lib/plugins/plugin-types"
import { manifest } from "./manifest"

const plugin: ToolPluginModule = {
  manifest,
  load: () => import("./ui"),
}

export default plugin
