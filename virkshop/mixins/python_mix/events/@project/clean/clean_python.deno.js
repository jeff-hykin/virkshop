#!/usr/bin/env -S deno run --allow-all
import { FileSystem } from "https://deno.land/x/quickr@0.6.6/main/file_system.js"
const { virkshop } = await FileSystem.walkUpImport("virkshop.js")

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