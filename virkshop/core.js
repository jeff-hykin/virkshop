import { FileSystem } from "https://deno.land/x/quickr@0.3.42/main/file_system.js"
import { run, hasCommand, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } from "https://deno.land/x/quickr@0.3.42/main/run.js"
import { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.3.42/main/console.js"
import { findAll } from "https://deno.land/x/good@0.5.1/string.js"


const escapeShellArgument = (string) => string.replace(`'`, `'"'"'`)

async function recursivelyFileLink({targetFolder, existingFolder}) {
    const target = await FileSystem.info(targetFolder)
    const existing = await FileSystem.info(existingFolder)
    
    const existingItems = await FileSystem.recursivelyListItemsIn(existing)
    for (const existingItem of existingItems) {
        const relativePart = await FileSystem.makeRelativePath({
            from: existing.path,
            to: existingItem.path 
        })
        // link the file (creating any folders necessary in the process)
        await FileSystem.relativeLink({
            existingItem: existingItem.path,
            newItem: `${target.path}/${relativePart}`,
        })
    }
}

async function linkMixinNamespace(path) {
    const mixinName = FileSystem.basename(path)
    for (const eachSpecialFolder of virkshop.structure.specialMixinFolders) { // FIXME: home folder needs to be treated differently
        const mixinFolder                      = `${path}/${eachSpecialFolder}/${mixinName}`
        const commonFolderReservedForThisMixin = `${virkshop.pathTo.mixture}/${eachSpecialFolder}/${mixinName}`

        await FileSystem.ensureIsFolder(mixinFolder)
        
        // 
        // create the "namespaced" folder of the file first
        // 
        const namespaceCheck = await FileSystem.info(commonFolderReservedForThisMixin)
        let needToCreateNamespace = false
        if (!namespaceCheck.exists) {
            needToCreateNamespace = true
        } else if (!namespaceCheck.isSymlink) {
            if (namespaceCheck.isFolder) {
                const paths = await FileSystem.listPathsIn(namespaceCheck.path)
                for (const eachExisting of paths) {
                    await FileSystem.move({
                        item: eachExisting,
                        newParentFolder: mixinFolder,
                        overwrite: true,
                    })
                }
            }
            await FileSystem.remove(commonFolderReservedForThisMixin)
            needToCreateNamespace = true
        } else {
            const target = FileSystem.makeAbsolutePath(namespaceCheck.pathToNextTarget)
            const thisFolder = FileSystem.makeAbsolutePath(mixinFolder)
            if (target != thisFolder) {
                await FileSystem.remove(commonFolderReservedForThisMixin)
                needToCreateNamespace = true
            }
        }
        // create the commonFolderReservedForThisMixin
        if (needToCreateNamespace) {
            await FileSystem.relativeLink({
                existingItem: mixinFolder,
                newItem: commonFolderReservedForThisMixin
            })
        }

        

        // // 
        // // create shortcuts within the commonFolderReservedForThisMixin
        // // 
        // // TODO: maybe rethink this
        // const nestedNamespace = `${commonFolder}/${mixinName}/${mixinName}`
        // for (const eachPath of await FileSystem.listPathsIn(nestedNamespace)) {
        //     const relativePart = eachPath.slice(nestedNamespace.length)
        //     const targetLocation = await FileSystem.info(`${commonFolderReservedForThisMixin}/${relativePart}`)
        //     // if hardlink
        //     if (targetLocation.isFile && !targetLocation.isSymlink) {
        //         // assume the user put it there, or that its the plugin's ownership
        //         continue
        //     // if symlink
        //     } else if (targetLocation.isFile) {
        //         // remove broken things
        //         if (targetLocation.isBrokenLink) {
        //             await FileSystem.remove(targetLocation.path)
        //         } else {
        //             const target      = FileSystem.makeAbsolutePath(targetLocation.path)
        //             const currentItem = FileSystem.makeAbsolutePath(eachPath)
        //             if (target == currentItem) {
        //                 // already linked
        //                 continue
        //             } else {
        //                 // linked but to the wrong thing
        //                 // FIXME: add a warning about conflicting items here, and replace the symlink with the warning
        //                 //        note its possible for one to be a file and the other a folder
        //                 continue
        //             }
        //         }
        //     }
        //     const mixinItem = await FileSystem.info(eachPath)
        //     if (mixinItem.isFile) {
        //         // FIXME: this could technically destroy a user-made file by having it as part of the parent path
                
        //         // make sure it exists by this point
        //         await FileSystem.ensureIsFolder(FileSystem.parent)
        //         // create the shortcut
        //         await FileSystem.relativeLink({
        //             existingItem: mixinItem.path,
        //             newItem: targetLocation.path,
        //         })
        //     }
        //     // TODO: consider another edgecase of mixin item being a file, but existing item being a folder
        // }
    }
}

async function linkMixinShortcuts(path) {
    // NOTE: linkMixinNamespace needs to be run for EVERY mixin before shortcuts can run. Otherwise there could be order of operations problems

    const mixinName = FileSystem.basename(path)
    for (const eachSpecialFolder of virkshop.structure.specialMixinFolders) {
        const commonFolder = `${virkshop.pathTo.mixture}/${eachSpecialFolder}`
        const mixinFolder  = `${path}/${eachSpecialFolder}`

        // 
        // add all the shortcut links
        // 
        for (const eachPath of await FileSystem.recursivelyListPathsIn(mixinFolder)) {
            const relativePart = eachPath.slice(mixinFolder.length)
            const targetLocation = await FileSystem.info(`${commonFolder}/${relativePart}`)
            // if hardlink
            if (targetLocation.isFile && !targetLocation.isSymlink) {
                // assume the user put it there, or that its the plugin's ownership
                continue
            // if symlink
            } else if (targetLocation.isFile) {
                // remove broken things
                if (targetLocation.isBrokenLink) {
                    await FileSystem.remove(targetLocation.path)
                } else {
                    const target      = FileSystem.makeAbsolutePath(targetLocation.path)
                    const currentItem = FileSystem.makeAbsolutePath(eachPath)
                    if (target == currentItem) {
                        // already linked
                        continue
                    } else {
                        // linked but to the wrong thing
                        // FIXME: add a warning about conflicting items here, and replace the symlink with the warning
                        //        note its possible for one to be a file and the other a folder
                        continue
                    }
                }
            }
            const mixinItem = await FileSystem.info(eachPath)
            if (mixinItem.isFile) {
                // FIXME: this could technically destroy a user-made file by having it as part of the parent path
                
                // make sure it exists by this point
                await FileSystem.ensureIsFolder(FileSystem.parentPath(mixinItem.path))
                // create the shortcut
                await FileSystem.relativeLink({
                    existingItem: mixinItem.path,
                    newItem: targetLocation.path,
                })
            }
            // TODO: consider another edgecase of mixin item being a file, but existing item being a folder
        }
    }
}

const virkshopIdentifierPath = `#mixins/virkshop/settings/virkshop/`
export const createVirkshop = async (arg)=>{
    var { virkshopPath, projectPath } = {...arg}
    virkshopPath = virkshopPath || Console.env.VIRKSHOP_FOLDER         // env var is used when already inside of the virkshop
    projectPath  = projectPath  || Console.env.VIRKSHOP_PROJECT_FOLDER // env var is used when already inside of the virkshop

    const realHome = Console.env.VIRKSHOP_REAL_HOME || Console.env.HOME
    
    // 
    // auto-detect a virkshop path
    // 
    if (!virkshopPath) {
        const callerPath = pathOfCaller()
        const walkUpPath = await FileSystem.walkUpUntil(virkshopIdentifierPath, callerPath)
        if (walkUpPath) {
            virkshopPath = walkUpPath
        // fallback case, caller must be in project, try looking for top level virkshop
        } else {
            projectPath = projectPath || FileSystem.pwd
            // try the most common place
            const defaultPlaceInfo = await FileSystem.info(`${projectPath}/virkshop/${virkshopIdentifierPath}`)
            if (defaultPlaceInfo.isFolder) {
                virkshopPath = defaultPlaceInfo
            } else {
                // time to brute force search for it
                const virkshopPaths = []
                const iterator = FileSystem.recursivelyIteratePathsIn(
                    projectPath,
                    {
                        searchOrder: 'breadthFirstSearch',
                        maxDepth: 2, // TODO: this may change in the future
                    },
                )
                for await (const eachPath of iterator) {
                    const eachInfo = await FileSystem.info(`${eachPath}/${virkshopIdentifierPath}`)
                    if (eachInfo.isFolder) {
                        virkshopPaths.push(eachInfo.path)
                    }
                }
                if (virkshopPaths.length == 1) {
                    virkshopPath = virkshopPaths[0]
                } else if (virkshopPaths.length >= 2) {
                    // TODO: although I want to give a warning here, if I did then there would be no way to get rid of it
                    // (beacuse the default virkshop object is always created first, and would throw an error before they get a chance to create their own)
                    return Error(`\n\n(This is the virkshop library speaking)\nI'm unable to load using the default methods because it seems there is more than one virkshop folder in the project.\nTo specify which one to use do\n    import { createVirkshop } from "..."\n    createVirkshop({ virkshopPath: "WHICH_FOLDER_HERE", projectPath: "" })\nAnd then specify which of the ones you want to use inside ${callerPath}\n`)
                } else if (virkshopPaths.length == 0) {
                    return Error(`\n\n(This is the virkshop library speaking)\nI'm unable to load using the default methods because I couldn't find any virkshop folders in the project.\nTo specify which one to use do\n    import { createVirkshop } from "..."\n    createVirkshop({ virkshopPath: "WHICH_FOLDER_HERE", projectPath: "" })\nAnd then specify which of the ones you want to use inside ${callerPath}\n`)
                }
            }
        }
    }
    
    const virkshop = Object.defineProperties(
        {
            pathTo: Object.defineProperties(
                {
                    realHome,
                    virkshop: virkshopPath,
                    project: FileSystem.makeAbsolutePath(projectPath || FileSystem.parentPath(virkshopPath)),
                },
                {
                    mixins:           { get() { return `${virkshop.pathTo.virkshop}/#mixins` }},
                    mixture:          { get() { return `${virkshop.pathTo.virkshop}/#mixture` }},
                    settings:         { get() { return `${virkshop.pathTo.mixture}/settings` }},
                    temporary:        { get() { return `${virkshop.pathTo.mixture}/temporary` }},
                    fakeHome:         { get() { return `${virkshop.pathTo.temporary}/long_term/home` }},
                    virkshopOptions:  { get() { return `${virkshop.pathTo.settings}/virkshop/options.json` }},
                    _passthroughData: { get() { return `${virkshop.pathTo.temporary}/short_term/virkshop/_passthroughData.json` }},
                }
            ),
            structure: {
                specialMixinFolders: [
                    'commands',
                    'documentation',
                    'events',
                    'home',
                    'settings'
                ],
            },
            injectUsersCommand(commandName) {
                // FIXME: implement
                    // check if command exists
                    // create a new command, absolute path it to the old command, give it the users home as HOME
            },
            useRealHomeFor(path) {
                // FIXME: implement
                    // create path in real home folder if it doesn't exist
                    // FIXME: need to specify if folder or file
                    // create an absolute-path link from the fake home version to the real home version
            },
            _passthroughData: {
                environmentVariables: {},
            },
            _internal: {
                zshSourceFiles: {},
                zshSourceFileSetupPromises: [],
            },
            _stages: {
                async phase0(mixinPaths) {
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)

                    Console.env.VIRKSHOP_FOLDER = virkshop.pathTo.virkshop
                    // 
                    // establish mixins protected namespace
                    // 
                    // FIXME: problem here with priority, what happens if two extensions write to the same location
                    //    SOLUTION! this is just like traits/mixins
                    //              instead of using a number priority, put all their stuff under a namespace
                    //              then attempt to put it outside the namespace
                    //                  if there is a conflict, make the command print out "there is a conflict, please specify if you want the command from __ or __"
                    //  new FIXME: the above solution doesnt work for the home folder.
                    //             maybe add a message any time a .profile or .rc file is added to the home and explain
                    //     possible solution: use the project extension to pick one, which can be a combination (concat or pick one or whatever)
                    
                    // TODO: purge broken system links more
                    
                    // let them finish in any order (efficient), but they need to be done before phase 1 starts
                    await Promise.all(
                        mixinPaths.map(
                            eachMixin=>linkMixinNamespace(eachMixin)
                        )
                    )
                    
                    // rule1: never overwrite non-symlink files (in commands/ settings/ etc)
                    //        hardlink files are presumably created by the user, not a mixin
                    // link virkshop folders up-and-out into the project folder
                    await Promise.all(Object.entries(virkshop.options.linkToProject).map(async ([whereInProject, whereInVirkshop])=>{
                        
                        const sourcePath = `${virkshop.pathTo.virkshop}/${whereInVirkshop.replace(/^\$VIRKSHOP_FOLDER/,"./")}`
                        const target = await FileSystem.info(`${virkshop.pathTo.project}/${whereInProject}`)
                        if (target.isBrokenLink) {
                            await FileSystem.remove(target.path)
                        }
                        // create it, but dont destroy an existing folder (unless its a broken link)
                        if (target.isBrokenLink || !target.exists)  {
                            await FileSystem.relativeLink({
                                existingItem: sourcePath,
                                newItem: target.path,
                            })
                        }
                    }))
                },
                async phase1(mixinPaths) {
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    const alreadExecuted = new Set()
                    const phase1Promises = []
                    for (const eachMixinPath of mixinPaths) {
                        // let the mixin link everything within itself
                        const selfSetupPromise = FileSystem.recursivelyListItemsIn(`${eachMixinPath}/events/virkshop/before_entering`).then(
                            async (phase1Items)=>{
                                phase1Items.sort() // FIXME: this is javascript so of course it won't actually sort alpha-numerically
                                for (const eachItem of phase1Items) {
                                    // if its not a folder
                                    if (!eachItem.isFolder && eachItem.exists) {
                                        await FileSystem.addPermissions({path: eachItem.path, permissions: { owner: {canExecute: true} }})
                                        try {
                                            // if importable, then import it
                                            if (eachItem.path.match(/\.deno\.js$/)) {
                                                const uniquePath = await FileSystem.finalTargetOf(eachItem.path)
                                                if (!alreadExecuted.has(uniquePath)) {
                                                    alreadExecuted.add(uniquePath)
                                                    // see: https://github.com/denoland/deno/issues/15382
                                                    const escapedPath = `${encodeURIComponent(eachItem.path).replace(/%2F/g,'/')}`
                                                    await import(escapedPath)
                                                }
                                            // otherwise execute it
                                            } else {
                                                await run`${eachItem.path}`
                                            }
                                        } catch (error) {
                                            console.debug(`\n\nWARNING: error while executing before_entering of ${FileSystem.basename(eachMixinPath)}, ${error.stack}`,)
                                        }
                                    }
                                }

                                
                            }
                        )
                        phase1Promises.push(selfSetupPromise)
                        
                        // schedule some work for phase2 so that it runs ASAP
                        virkshop._internal.zshSourceFileSetupPromises.push(selfSetupPromise.then(async ()=>{
                            // read the the before_login files as soon as possible
                            const files = await FileSystem.listFilePathsIn(`${eachMixinPath}/events/zsh_tools/before_login/`)
                            await Promise.all(
                                files.filter(each=>each.match(/\.zsh$/)).map(async eachZshPath=>{
                                    const basename = FileSystem.basename(eachZshPath)
                                    // FIXME: create a warning if a name is already in zshSourceFiles
                                    virkshop._internal.zshSourceFiles[basename] = await FileSystem.read(eachZshPath)
                                })
                            )
                        }))
                    }

                    // 
                    // let the mixins set themselves up before starting phase2
                    // 
                    await Promise.all(phase1Promises)
                },
                async phase2(mixinPaths) {
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    
                    await Promise.all([
                        // 
                        // once mixins have created their internal peices, connect them to the larger outside system
                        // 
                        Promise.all(
                            mixinPaths.map(
                                eachMixinPath=>linkMixinShortcuts(eachMixinPath)
                            )
                        ),

                        // 
                        // create the zshrc file
                        // 
                        ((async ()=>{
                            let envVars = ""
                            for (const [key, value] of Object.entries(virkshop._passthroughData.environmentVariables)) {
                                envVars += `export ${key}='${escapeShellArgument(value)}'\n`
                            }
                            
                            // TODO: make sure this .zshrc only runs once per login rather than per shell
                            // TODO: add dynamic per-shell hooks

                            let zshrcString = `
                                # don't let zsh update itself without telling all the other packages 
                                # instead use nix to update zsh
                                DISABLE_AUTO_UPDATE="true"
                                DISABLE_UPDATE_PROMPT="true"
                                
                                ${envVars}
                                
                                export VIRKSHOP_FOLDER='${escapeShellArgument(virkshop.pathTo.virkshop)}'
                                export VIRKSHOP_FAKE_HOME='${escapeShellArgument(virkshop.pathTo.fakeHome)}'
                                export VIRKSHOP_REAL_HOME='${escapeShellArgument(virkshop.pathTo.realHome)}'
                                export VIRKSHOP_PROJECT_FOLDER='${escapeShellArgument(virkshop.pathTo.project)}'
                            `
                            
                            // all of these need to be resolved before zshSourceFiles can be used
                            await Promise.all(virkshop._internal.zshSourceFileSetupPromises)
                            const fileNames = Object.keys(virkshop._internal.zshSourceFiles)
                            fileNames.sort() // FIXME: should be alpha numeric, but might not be because javascript
                            for (const eachFileName of fileNames) {
                                zshrcString += `\n${virkshop._internal.zshSourceFiles[eachFileName]}\n`
                            }

                            // write the new .zshrc file
                            await FileSystem.write({
                                path: `${virkshop.pathTo.fakeHome}/.zshrc`,
                                data: zshrcString,
                                force: true,
                            })
                        })())
                    ])
                    
                    Console.env.VIRKSHOP_REAL_HOME = virkshop.pathTo.realHome
                    Console.env.HOME               = virkshop.pathTo.fakeHome
                    FileSystem.cwd                 = virkshop.pathTo.fakeHome

                    // TODO: read the toml file to get the default nix hash then use -I arg in nix-shell
                    
                    await run`nix-shell --pure --command zsh --keep VIRKSHOP_FOLDER --keep VIRKSHOP_FAKE_HOME --keep VIRKSHOP_REAL_HOME --keep VIRKSHOP_PROJECT_FOLDER`

                    // TODO: call all the on_quit scripts
                },
            },
            async trigger(eventPath) {
                let promises = []
                const eventPathInfo = await FileSystem.info(eventPath)
                if (eventPathInfo.isFolder) {
                    const paths = await FileSystem.recursivelyListPathsIn(eventPath)
                    paths.sort()
                    // FIXME: sort them numerically
                    // FIXME: pad out the 0's to make the numbers equal lengths
                    // FIXME: import the .deno.js files instead of executing them
                    for (const eachPath of paths) {
                        await run`${eachPath}`
                    }
                }
            },
        },
        {
            folder:      { get() { return virkshop.pathTo.virkshop } }, // alias
            projectName: { get() { return FileSystem.basename(virkshop.pathTo.project)   } },
            options: { 
                get() {
                    return JSON.parse(Deno.readTextFileSync(virkshop.pathTo.virkshopOptions))
                },
            },
        },
    )
    return virkshop
}

export const virkshop = await createVirkshop()

function pathOfCaller() {
    const err = new Error()
    const filePaths = findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
    
    // if valid file
    // FIXME: make sure this works inside of anonymous functions (not sure if error stack handles that well)
    const secondPath = filePaths[1]
    if (secondPath) {
        try {
            if (Deno.statSync(secondPath).isFile) {
                return secondPath
            }
        } catch (error) {
        }
    }
    // if in an interpreter
    return Deno.cwd()
}