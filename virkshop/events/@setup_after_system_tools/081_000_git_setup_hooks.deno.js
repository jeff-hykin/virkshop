import { FileSystem, glob } from "https://deno.land/x/quickr@0.6.14/main/file_system.js"
import { Console } from "https://deno.land/x/quickr@0.6.14/main/console.js"
import * as yaml from "https://deno.land/std@0.82.0/encoding/yaml.ts"
const { virkshop } = await FileSystem.walkUpImport("virkshop/@core/virkshop.js")

export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        // FIXME: setup hooks
    },
}
