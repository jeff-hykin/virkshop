import { FileSystem } from "https://deno.land/x/quickr@0.4.6/main/file_system.js"
import { virkshop } from "../../../../../core.js"

// remove all the __pycache__
;((async ()=>{
    for await (const eachPath of FileSystem.iteratePathsIn(virkshop.pathTo.project)) {
        if (FileSystem.basename(eachPath) == "__pycache__") {
            console.log(eachPath)
            FileSystem.remove(eachPath).catch()
        }
    }
})())