import { virkshop } from "./core.js"


// virkshop.injectImpureCommand()

if (Deno.build.os == 'darwin') {
    virkshop.useRealHomeFor(`Library/Caches/tealdeer`)
} else {
    virkshop.useRealHomeFor(`.cache/tldr`)
}