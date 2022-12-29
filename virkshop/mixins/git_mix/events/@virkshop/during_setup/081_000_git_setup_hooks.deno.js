import { FileSystem, glob } from "https://deno.land/x/quickr@0.6.14/main/file_system.js"
import { Console } from "https://deno.land/x/quickr@0.6.14/main/console.js"
import * as yaml from "https://deno.land/std@0.82.0/encoding/yaml.ts"
const { virkshop } = await FileSystem.walkUpImport("virkshop/virkshop.js")

const mixinName = "git_mix"
const localSettingsFolder = `${virkshop.pathTo.mixture}/${mixinName}`
const defaultSettingsPath = `${localSettingsFolder}/settings.yaml`
let settings = null

export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        // must wait before loading settings (cant load outside of the function)
        settings = settings || yaml.parse((await FileSystem.read(defaultSettingsPath)) || "{}")
        
        // FIXME: setup hooks
    },
}
