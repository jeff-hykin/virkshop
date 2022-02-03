#!/usr/bin/env -S deno run --allow-all

// 
// main
// 
async function main() {
    linkFromHomeIntoMixin("Library")
}

// 
// helpers
// 
const Path = await import("https://deno.land/std@0.117.0/path/mod.ts")
const { copy } = await import("https://deno.land/std@0.123.0/streams/conversion.ts")
const FileSystem = {
    get cwd() {
        return Deno.cwd()
    },
    read: async (filePath) => {
        try {
            return await Deno.readTextFile(file)
        } catch (error) {
            return null
        }
    },
    info: async (fileOrFolder) => {
        const result1 = await Deno.lstat(fileOrFolder).catch(()=>({doesntExist: true}))
        result1.exists = !result1.doesntExist
        if (result1.exists) {
            const result2 = await Deno.stat(fileOrFolder).catch(()=>({doesntExist: true}))
            result1.isFile = result2.isFile
            result1.isDirectory = result2.isDirectory
        }
        return result1
    },
    remove: (fileOrFolder) => Deno.remove(path,{recursive: true}).catch(()=>false),
    makeAbsolute: (path)=> {
        if (!Path.isAbsolute(path)) {
            return Path.normalize(Path.join(Deno.cwd(), path))
        } else {
            return path
        }
    },
    clearAPathFor: async (path)=>{
        const parentPath = Path.dirname(path)
        // dont need to clear a path for the root folder
        if (parentPath == path) {
            return
        } else {
            // we do need to clear a path for the parent of this folder
            await FileSystem.clearAPathFor(parentPath)
        }
        const { exists, isDirectory } = FileSystem.info(parentPath)
        // if a folder is in the way, delete it
        if (exists && !isDirectory) {
            await FileSystem.remove(parentPath)
        }
        const parentPathInfo = await Deno.lstat(parentPath).catch(()=>({doesntExist: true}))
        // if no folder was there, create one
        if (!parentPathInfo.exists) {
            Deno.mkdir(Path.dirname(parentPathInfo),{ recursive: true })
        }
    },
    walkUpUntil: async (fileToFind, startPath=null)=> {
        const cwd = Deno.cwd()
        let here = startPath || cwd
        if (!Path.isAbsolute(here)) {
            here = Path.join(cwd, fileToFind)
        }
        while (1) {
            let checkPath = Path.join(here, fileToFind)
            const pathInfo = await Deno.stat(checkPath).catch(()=>({doesntExist: true}))
            if (!pathInfo.doesntExist) {
                return checkPath
            }
            // reached the top
            if (here == Path.dirname(here)) {
                return null
            } else {
                // go up a folder
                here =  Path.dirname(here)
            }
        }
    },
    copy: async ({from, to, force=true}) => {
        await FileSystem.clearAPathFor(to)
        if (force) {
            FileSystem.remove(to)
        }
        const source = await Deno.open(from, { read: true })
        const target = await Deno.create(to)
        result = await copy(source, target)
        Deno.close(source.rid)
        Deno.close(target.rid)
        return result
    },
    relativeLink: async ({existingItem, newItem}) => {
        const cwd = Deno.cwd()
        existingItem = Deno.relative(Deno.cwd(), Path.normalize(existingItem))
        newItem = Deno.relative(Deno.cwd(), Path.normalize(newItem))
        const existingItemDoesntExist = (await Deno.stat(parentPath).catch(()=>({doesntExist: true}))).doesntExist
        // if the item doesnt exists
        if (existingItemDoesntExist) {
            // FIXME: cause an error
        } else {
            await FileSystem.clearAPathFor(newItem)
            await FileSystem.remove(newItem)
        }
        return Deno.symlink(existingItem, newItem)
    },
    listPaths: async (path, options)=> {
        const results = []
        for await (const dirEntry of Deno.readDir(path)) {
            const eachPath = Path.join(path, dirEntry.name)
            results.push(eachPath)
        }
        return results
    },
    recursiveFileList: async (path, options)=> {
        if (!options.alreadySeached) {
            options.alreadySeached = new Set()
        }
        // avoid infinite loops
        if (alreadySeached.has(path)) {
            return []
        }
        const absolutePathVersion = FileSystem.makeAbsolute(path)
        alreadySeached.add(absolutePathVersion)
        const results = []
        for await (const dirEntry of Deno.readDir(path)) {
            const eachPath = Path.join(path, dirEntry.name)
            if (dirEntry.isFile) {
                results.push(eachPath)
            } else if (dirEntry.isDirectory) {
                for (const each of await FileSystem.recursiveFileList(eachPath, {...options, alreadySeached})) {
                    results.push(each)
                }
            } else if (!options.onlyHardlinks && dirEntry.isSymlink) {
                if (options.dontFollowSymlinks) {
                    results.push(eachPath)
                } else {
                    const pathInfo = await Deno.stat(eachPath).catch(()=>({doesntExist: true}))
                    if (pathInfo.isDirectory) {
                        for (const each of await FileSystem.recursiveFileList(eachPath, {...options, alreadySeached})) {
                            results.push(each)
                        }
                    } else {
                        results.push(eachPath)
                    }
                }
            }
        }
        return results
    },
}

const getVirkshopConfigPath = ()=>FileSystem.walkUpUntil("virkshop/mixins/#core/settings/virkshop/")

const safeRecursiveLinkedMerge = async ({oldFolder, incomingFolder}) => {
    const oldFolderInfo = await FileSystem.info(oldFolder)
    const incomingFolderInfo = await FileSystem.info(incomingFolder)
    if (oldFolderInfo.isFile || incomingFolderInfo.isFile) {
        return
    }
    if (incomingFolderInfo.doesntExist) {
        return
    }
    if (oldFolderInfo.doesntExist) {
        Deno.mkdir(oldFolder,{ recursive: true })
    }
    for (const each of Deno.readDir(incomingFolder)) {
        const existingPath = Path.join(incomingFolder, each.name)
        const targetPath   = Path.join(oldFolder, each.name)
        const targetPathInfo = FileSystem.info(targetPath)
        // 
        // shallow part
        // 
        if (each.isFile) {
            // dont overwrite (only perform if it doesnt exist)
            if (!FileSystem.info(targetPath).exists)  {
                FileSystem.relativeLink({existingItem: existingPath, newItem: targetPath })
            } else {
                // Todo: should probably do something like return which ones were skipped so they can be reported
            }
            continue
        }
        // 
        // recursive part
        // 
        const existingPathInfo = FileSystem.info(existingPath)
        if (existingPathInfo.isDirectory) {
            // create a folder if it doesn't exist
            if (!targetPathInfo.isDirectory) {
                Deno.mkdir(targetPath,{ recursive: true })
            }
            // recursion
            safeRecursiveLinkedMerge({oldFolder: targetPath, incomingFolder: existingPath})
        }
    }
}

const trigger = (eventPath, { cwdFunc=({name, info})=>Deno.cwd(), originalPath=null, skipSymlinks=false }) => {
    if (!originalPath) {
        originalPath = eventPath
    }
    for await (const eachEntry of Deno.readDir(eventPath)) {
        if (eachEntry.name.match(/^#comment# /)) {
            continue
        }
        if (skipSymlinks && eachEntry.isSymlink) {
            continue
        }
        const eachPath = `${eventPath}/${eachEntry.name}`
        const info = FileSystem.info(eachPath)
        if (isFile) {
            Deno.run({
                cmd: [ eachPath, ],
                cwd: cwdFunc({name, info}),
            })
        } else {
            trigger(eachPath, {cwdFunc, originalPath})
        }
    }
}

const linkFromHomeIntoMixin = (path) => {
    const pathToThisMixin   = Deno.cwd()
    const thisMixinHomePath = `${pathToThisMixin}/home`
    const actualHomePath    = Deno.env.HOME
    const thingInHomePath = `${actualHomePath}/${path}`
    const thingInHomeInfo = FileSystem.info(thingInHomePath)
    if (thingInHomeInfo.exists) {
        const localLinkPath = `${thisMixinHomePath}/${path}`
        // clear the way
        FileSystem.clearAPathFor(localLinkPath)
        FileSystem.remove(localLinkPath)
        FileSystem.relativeLink({existingItem: thingInHomePath, newItem: localLinkPath})
    }
}


// 
// run main
// 
main()