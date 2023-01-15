// start as many promises possible here (then await them at the last second possible for optimal runtime)
const fileSystemPromise = import("https://deno.land/x/quickr@0.6.14/main/file_system.js")
const runToolsPromise   = import("https://deno.land/x/quickr@0.6.14/main/run.js")

import { Console } from "https://deno.land/x/quickr@0.6.14/main/console.js"
const virkshopPromise   = import(`${Console.env.VIRKSHOP_FOLDER}/support/virkshop.js`)

export const deadlines = {
    async beforeSetup(virkshop) {
    },
    async beforeReadingSystemTools(virkshop) {
    },
    async beforeShellScripts(virkshop) {
    },
    async beforeEnteringVirkshop(virkshop) {
        const { virkshop } = await virkshopPromise
        const { FileSystem } = await fileSystemPromise
        const { run, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } = await runToolsPromise
        
        const gitFolderItem = await FileSystem.info(`${virkshop.pathTo.project}/.git`)
        if (!gitFolderItem.exists) {
            // this command can take a long time
            await run`nix-shell --packages git --pure --command ${'git init'} -I ${`nixpkgs=${virkshop.coreWarehouse}`}`
        }
    }
}
