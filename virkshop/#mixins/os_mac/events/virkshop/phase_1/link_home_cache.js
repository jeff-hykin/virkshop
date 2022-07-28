#!/usr/bin/env -S deno run --allow-all

// // 
// // main
// // 
// async function main() {
//     linkFromHomeIntoMixin("Library")
// }

// // 
// // helpers
// // 

// const getVirkshopConfigPath = ()=>FileSystem.walkUpUntil("virkshop/mixins/#core/settings/virkshop/")

// const safeRecursiveLinkedMerge = async ({oldFolder, incomingFolder}) => {
//     const oldFolderInfo = await FileSystem.info(oldFolder)
//     const incomingFolderInfo = await FileSystem.info(incomingFolder)
//     if (oldFolderInfo.isFile || incomingFolderInfo.isFile) {
//         return
//     }
//     if (incomingFolderInfo.doesntExist) {
//         return
//     }
//     if (oldFolderInfo.doesntExist) {
//         Deno.mkdir(oldFolder,{ recursive: true })
//     }
//     for (const each of Deno.readDir(incomingFolder)) {
//         const existingPath = Path.join(incomingFolder, each.name)
//         const targetPath   = Path.join(oldFolder, each.name)
//         const targetPathInfo = FileSystem.info(targetPath)
//         // 
//         // shallow part
//         // 
//         if (each.isFile) {
//             // dont overwrite (only perform if it doesnt exist)
//             if (!FileSystem.info(targetPath).exists)  {
//                 FileSystem.relativeLink({existingItem: existingPath, newItem: targetPath })
//             } else {
//                 // Todo: should probably do something like return which ones were skipped so they can be reported
//             }
//             continue
//         }
//         // 
//         // recursive part
//         // 
//         const existingPathInfo = FileSystem.info(existingPath)
//         if (existingPathInfo.isDirectory) {
//             // create a folder if it doesn't exist
//             if (!targetPathInfo.isDirectory) {
//                 Deno.mkdir(targetPath,{ recursive: true })
//             }
//             // recursion
//             safeRecursiveLinkedMerge({oldFolder: targetPath, incomingFolder: existingPath})
//         }
//     }
// }

// const trigger = async (eventPath, { cwdFunc=({name, info})=>Deno.cwd(), originalPath=null, skipSymlinks=false }) => {
//     if (!originalPath) {
//         originalPath = eventPath
//     }
//     for await (const eachEntry of Deno.readDir(eventPath)) {
//         if (eachEntry.name.match(/^#comment# /)) {
//             continue
//         }
//         if (skipSymlinks && eachEntry.isSymlink) {
//             continue
//         }
//         const eachPath = `${eventPath}/${eachEntry.name}`
//         const info = FileSystem.info(eachPath)
//         if (isFile) {
//             Deno.run({
//                 cmd: [ eachPath, ],
//                 cwd: cwdFunc({name, info}),
//             })
//         } else {
//             trigger(eachPath, {cwdFunc, originalPath})
//         }
//     }
// }

// const linkFromHomeIntoMixin = (path) => {
//     const pathToThisMixin   = Deno.cwd()
//     const thisMixinHomePath = `${pathToThisMixin}/home`
//     const actualHomePath    = Deno.env.HOME
//     const thingInHomePath = `${actualHomePath}/${path}`
//     const thingInHomeInfo = FileSystem.info(thingInHomePath)
//     if (thingInHomeInfo.exists) {
//         const localLinkPath = `${thisMixinHomePath}/${path}`
//         // clear the way
//         FileSystem.clearAPathFor(localLinkPath)
//         FileSystem.remove(localLinkPath)
//         FileSystem.relativeLink({existingItem: thingInHomePath, newItem: localLinkPath})
//     }
// }


// // 
// // run main
// // 
// main()