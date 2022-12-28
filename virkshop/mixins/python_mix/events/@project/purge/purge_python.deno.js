#!/usr/bin/env -S deno run --allow-all
import { FileSystem } from "https://deno.land/x/quickr@0.6.13/main/file_system.js"
const { virkshop } = await FileSystem.walkUpImport("virkshop.js")

// FIXME: the commented out code below needs converting to deno
// if [ -d "$FORNIX_FOLDER" ]
// then
//     # delete venv
//     "$FORNIX_FOLDER/settings/extensions/#standard/commands/tools/file_system/remove" "$FORNIX_FOLDER/.venv"
    
//     # if poetry exists
//     if [ -n "$(command -v "poetry")" ]
//     then
//         # clear all the caches
//         yes | poetry cache clear . --all
//     fi
    
//     # all the home folder junk from python and common pip modules
//     "$VIRKSHOP_HOME/.cache/pip"
//     "$VIRKSHOP_HOME/.cache/pypoetry/"
//     "$VIRKSHOP_HOME/.local/share/virtualenv"
//     "$VIRKSHOP_HOME/.config/pypoetry"
//     "$VIRKSHOP_HOME/.config/matplotlib"
//     "$VIRKSHOP_HOME/.ipython"
//     "$VIRKSHOP_HOME/.jupyter"
//     "$VIRKSHOP_HOME/.keras"
//     "$VIRKSHOP_HOME/.local/share/jupyter"
//     "$VIRKSHOP_HOME/.python_history"
//     "$VIRKSHOP_HOME/Library/Application Support/pypoetry"
//     "$VIRKSHOP_HOME/Library/Application Support/virtualenv"
//     "$VIRKSHOP_HOME/Library/Library/Preferences/pypoetry"
// fi

const paths = await FileSystem.listPathsIn(".", {recursively: true})
const promises = []
for (const each of paths) {
    // remove all the __pycache__ folders
    if (FileSystem.basename(each) == "__pycache__") {
        console.log(`removing: ${each}`)
        promises.push(FileSystem.remove(each))
    }
}
await Promise.all(promises)

