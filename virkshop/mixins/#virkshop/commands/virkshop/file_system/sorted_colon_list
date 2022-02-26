#!/usr/bin/env -S deno run --allow-all
import * as Path from "https://deno.land/std/path/mod.ts"

// 
// helpers
// 
const makeAbsolute = (path)=> {
    if (!Path.isAbsolute(path)) {
        return Path.normalize(Path.join(Deno.cwd(), path))
    } else {
        return path
    }
}

const recursiveFileList = async (path, alreadySeached=new Set())=> {
    // avoid infinite loops
    if (alreadySeached.has(path)) {
        return []
    }
    const absolutePathVersion = makeAbsolute(path)
    alreadySeached.add(absolutePathVersion)
    const results = []
    for await (const dirEntry of Deno.readDir(path)) {
        const eachPath = Path.join(path, dirEntry.name)
        if (dirEntry.isFile) {
            results.push(eachPath)
        } else if (dirEntry.isDirectory) {
            for (const each of await recursiveFileList(eachPath, alreadySeached)) {
                results.push(each)
            }
        }
    }
    return results
}

// 
// main code
// 
const whichFolder = Deno.args[0]
const filterRegex = Deno.args[1]
const allFiles = (await recursiveFileList(whichFolder))
let remainingFiles = allFiles
if (filterRegex != null) {
    remainingFiles = remainingFiles.filter(each=>each.match(RegExp(filterRegex)))
}
console.log(remainingFiles.sort().join(":"))