import { FileSystem } from "https://deno.land/x/quickr@0.3.44/main/file_system.js"
import { run, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } from "https://deno.land/x/quickr@0.3.44/main/run.js"
import { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.3.44/main/console.js"
import { indent, findAll } from "https://deno.land/x/good@0.5.1/string.js"


const escapeShellArgument = (string) => string.replace(/'/g, `'"'"'`)

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

let debuggingMode = false
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
                    virkshopOptions:  { get() { return `${virkshop.pathTo.mixins}/virkshop/settings/virkshop/options.json` }},
                    systemTools:      { get() { return `${virkshop.pathTo.settings}/system_tools.yaml` }},
                    _passthroughData: { get() { return `${virkshop.pathTo.temporary}/short_term/virkshop/_passthrough_data.json` }},
                    _tempShellFile:   { get() { return `${virkshop.pathTo.temporary}/short_term/virkshop/shell.nix` }},
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
                    debuggingMode && console.log("[Phase0: Establishing/Verifying Structure]")
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
                    debuggingMode && console.log("[Phase1: Mixins Setup]")
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    const alreadExecuted = new Set()
                    const phase1Promises = []
                    for (const eachMixinPath of mixinPaths) {
                        const mixinName = FileSystem.basename(eachMixinPath)
                        // let the mixin link everything within itself
                        const selfSetupPromise = FileSystem.recursivelyListItemsIn(`${eachMixinPath}/events/virkshop/before_entering`).then(
                            async (phase1Items)=>{
                                phase1Items.sort() // FIXME: this is javascript so of course it won't actually sort alpha-numerically
                                const startTime = (new Date()).getTime()
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
                                            console.log(`\n\nWARNING: error while executing before_entering of ${FileSystem.basename(eachMixinPath)}, ${error.stack}`,)
                                        }
                                    }
                                }
                                const duration = (new Date()).getTime() - startTime
                                debuggingMode && console.log(`     [setup in ${duration}ms: ${mixinName}]`)
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
                    debuggingMode && console.log("[Phase2: Nix+Zsh Setup]")
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    
                    debuggingMode && console.log("    [Creating .zshrc]")
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
                    Console.env._PWD               = Console.env.PWD
                    
                    debuggingMode && console.log("    [Creating shell.nix]")
                    // TODO: read the toml file to get the default nix hash then use -I arg in nix-shell
                    const yamlString = await FileSystem.read(virkshop.pathTo.systemTools)
                    // TODO: get a hash of this and see if nix-shell should even be regenerated or not
                    const nixShellString = await fornixToNix(yamlString)
                    await FileSystem.write({
                        data: nixShellString,
                        path: virkshop.pathTo._tempShellFile,
                    })
                    debuggingMode && console.log("    [Handing control over to nix]")
                    await run`nix-shell --pure --command zsh --keep _PWD --keep NIX_SSL_CERT_FILE --keep VIRKSHOP_FOLDER --keep VIRKSHOP_FAKE_HOME --keep VIRKSHOP_REAL_HOME --keep VIRKSHOP_PROJECT_FOLDER ${virkshop.pathTo._tempShellFile} -I nixpkgs=https://github.com/NixOS/nixpkgs/archive/ce6aa13369b667ac2542593170993504932eb836.tar.gz` // FIXME: use the defaultWarehouse

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

    debuggingMode = virkshop.options.debuggingMode
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


// 
// 
// Yaml support
// 
// 
    import { Type } from "https://deno.land/std@0.82.0/encoding/_yaml/type.ts"
    import * as yaml from "https://deno.land/std@0.82.0/encoding/yaml.ts";
    
    class NixValue {}

    // 
    // !!nix support
    // 
        class NixVar extends NixValue {
            name = null
        }

        const validVariableNameRegex = /^ *\b[a-zA-Z_][a-zA-Z_0-9]*\b *$/
        const nixVarSupport = new Type("tag:yaml.org,2002:nix", {
            kind: "scalar",
            predicate: function javascriptValueisNixVar(object) {
                return object instanceof NixVar
            },
            resolve: function yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                if (data.match(validVariableNameRegex)) {
                    return true
                } else {
                    return false
                }
            },
            construct: function createJavasriptValueFromYamlString(data) {
                const nixVar = new NixVar()
                nixVar.name = data.trim()
                return nixVar
            },
            represent: function nixVarValueToYamlString(object /*, style*/) {
                return object.name
            },
        })

        // hack it into the default schema (cause .extend() isnt available)
        yaml.DEFAULT_SCHEMA.explicit.push(nixVarSupport)
        yaml.DEFAULT_SCHEMA.compiledTypeMap.fallback["tag:yaml.org,2002:nix"] = nixVarSupport
        yaml.DEFAULT_SCHEMA.compiledTypeMap.scalar["tag:yaml.org,2002:nix"] = nixVarSupport
    // 
    // !!warehouse support
    // 
        class WarehouseVar extends NixValue {
            name = null
        }

        const warehouseVarSupport = new Type("tag:yaml.org,2002:warehouse", {
            kind: "scalar",
            predicate: function javascriptValueisNixVar(object) {
                return object instanceof WarehouseVar
            },
            resolve: function yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                if (data.match(validVariableNameRegex)) {
                    return true
                } else {
                    return false
                }
            },
            construct: function createJavasriptValueFromYamlString(data) {
                const nixVar = new WarehouseVar()
                nixVar.name = data.trim()
                return nixVar
            },
            represent: function nixVarValueToYamlString(object /*, style*/) {
                return object.name
            },
        })

        // hack it into the default schema (cause .extend() isnt available)
        yaml.DEFAULT_SCHEMA.explicit.push(warehouseVarSupport)
        yaml.DEFAULT_SCHEMA.compiledTypeMap.fallback["tag:yaml.org,2002:warehouse"] = warehouseVarSupport
        yaml.DEFAULT_SCHEMA.compiledTypeMap.scalar["tag:yaml.org,2002:warehouse"] = warehouseVarSupport
    // 
    // !!computed support
    // 
        class ComputedVar extends NixValue {
            name = null
        }

        const computedVarSupport = new Type("tag:yaml.org,2002:computed", {
            kind: "scalar",
            predicate: function javascriptValueisNixVar(object) {
                return object instanceof ComputedVar
            },
            resolve: function yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                if (data.match(validVariableNameRegex)) {
                    return true
                } else {
                    return false
                }
            },
            construct: function createJavasriptValueFromYamlString(data) {
                const nixVar = new ComputedVar()
                nixVar.name = data.trim()
                return nixVar
            },
            represent: function nixVarValueToYamlString(object /*, style*/) {
                return object.name
            },
        })

        // hack it into the default schema (cause .extend() isnt available)
        yaml.DEFAULT_SCHEMA.explicit.push(computedVarSupport)
        yaml.DEFAULT_SCHEMA.compiledTypeMap.fallback["tag:yaml.org,2002:computed"] = computedVarSupport
        yaml.DEFAULT_SCHEMA.compiledTypeMap.scalar["tag:yaml.org,2002:computed"] = computedVarSupport
    // 
    // !!package support
    // 
        class PackageVar extends NixValue {
            name = null
        }

        const packageVarSupport = new Type("tag:yaml.org,2002:package", {
            kind: "scalar",
            predicate: function javascriptValueisNixVar(object) {
                return object instanceof PackageVar
            },
            resolve: function yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                if (data.match(validVariableNameRegex)) {
                    return true
                } else {
                    return false
                }
            },
            construct: function createJavasriptValueFromYamlString(data) {
                const nixVar = new PackageVar()
                nixVar.name = data.trim()
                return nixVar
            },
            represent: function nixVarValueToYamlString(object /*, style*/) {
                return object.name
            },
        })

        // hack it into the default schema (cause .extend() isnt available)
        yaml.DEFAULT_SCHEMA.explicit.push(packageVarSupport)
        yaml.DEFAULT_SCHEMA.compiledTypeMap.fallback["tag:yaml.org,2002:package"] = packageVarSupport
        yaml.DEFAULT_SCHEMA.compiledTypeMap.scalar["tag:yaml.org,2002:package"] = packageVarSupport

// 
// javascript to Nix
// 
    export const escapeNixString = (string)=>{
        return `"${string.replace(/\$\{|[\\"]/g, '\\$&').replace(/\u0000/g, '\\0')}"`
    }

    export const escapeNixObject = (obj)=> {
        const objectType = typeof obj
        if (obj == null) {
            return `null`
        } else if (objectType == 'boolean') {
            return `${obj}`
        } else if (objectType == 'number') {
            // Infinity or Nan
            if (obj !== obj || obj+1 === obj) {
                return `"${obj}"`
            // floats and decimals
            } else {
                return `${obj}`
            }
        } else if (objectType == 'string') {
            return escapeNixString(obj)
        } else if (obj instanceof Object) {
            // 
            // Variable
            // 
            if (obj instanceof NixValue) {
                return obj.name
            // 
            // Array
            // 
            } else if (obj instanceof Array) {
                if (obj.length == 0) {
                    return `[]`
                } else {
                    return `[\n${
                        obj.map(
                            each=>indent({string:escapeNixObject(each)})
                        ).join("\n")
                    }\n]`
                }
            // 
            // Plain Object
            // 
            } else {
                const entries = Object.entries(obj)
                if (entries.length == 0) {
                    return `{}`
                } else {
                    let string = "{\n"
                    for (const [key, value] of entries) {
                        const valueAsString = escapeNixObject(value)
                        const valueIsSingleLine = !valueAsString.match(/\n/)
                        if (valueIsSingleLine) {
                            string += indent({
                                string: `${escapeNixObject(key)} = ${escapeNixObject(value)};`
                            }) + "\n"
                        } else {
                            string += indent({
                                string: `${escapeNixObject(key)} = (\n${
                                    indent({
                                        string: escapeNixObject(value)
                                    })
                                });`
                            })+"\n"
                        }
                    }
                    string += "}"
                    return string
                }
            }
        // } else { // TODO: add regex support (hard because of escaping)
        } else {
            throw Error(`Unable to convert this value to a Nix representation: ${obj}`)
        }
    }

// 
// fornixToNix
// 
export const fornixToNix = async function(yamlString) {
    // FIXME: add support for overwriting values (saveAs: python, then saveAs: python without breaking)
    // TODO: make __core__ not be a name, just insert it everywhere using "let,in"
    const dataStructure = yaml.parse(yamlString, {schema: yaml.DEFAULT_SCHEMA,},)
    let indentLevel = 3
    let nixCode = `
    `
    const varNames = []
    let defaultWarehouse = null
    let defaultWarehouseName = ""
    const buildInputStrings = []
    const nativeBuildInputStrings = []
    const computed = {}
    const nixValues = {}
    const warehouses = {}
    const packages = {}
    const warehouseAsNixValue = (values)=> {
        const nixCommitHash = values.createWarehouseFrom.nixCommitHash
        const tarFileUrl = values.createWarehouseFrom.tarFileUrl || `https://github.com/NixOS/nixpkgs/archive/${nixCommitHash}.tar.gz`
        const warehouseArguments = values.arguments || {}
        return `(__core__.import
            (__core__.fetchTarball
                ({url=${JSON.stringify(tarFileUrl)};})
            )
            (${indent({ string: escapeNixObject(warehouseArguments), by: "            ", noLead: true})})
        )`
    }
    for (const eachEntry of dataStructure) {
        const kind = Object.keys(eachEntry)[0]
        // 
        // (warehouse)
        // 
        if (kind == "(defaultWarehouse)" || kind == "(warehouse)") {
            // 
            // make sure defaultWarehouse is defined first, and that theres only one
            // 
            if (kind == "(defaultWarehouse)") {
                if (defaultWarehouse) {
                    throw Error(`Looks like (defaultWarehouse) is getting defined twice. Please check the yaml file to make sure theres only one (defaultWarehouse)`)
                }
            } else {
                if (!defaultWarehouseName) {
                    throw Error(`I see a warehouse being added, but the defaultWarehouse hasn't been defined yet. Please define one, its the same structure as a warehouse but with "(defaultWarehouse)" as the name`)
                }
            }
            const values = eachEntry[kind]
            // createWarehouseFrom:
            //     tarFileUrl: &defaultWarehouseAnchor "https://github.com/NixOS/nixpkgs/archive/c82b46413401efa740a0b994f52e9903a4f6dcd5.tar.gz"
            // arguments:
            //     config:
            //         allowUnfree: true
            //         cudaSupport: true
            //         permittedInsecurePackages: [ "openssl-1.0.2u" ]
            // saveAs: "!!nix defaultWarehouse"

            const varName = values.saveAs
            const nixCommitHash = values.createWarehouseFrom.nixCommitHash
            const tarFileUrl = values.createWarehouseFrom.tarFileUrl || `https://github.com/NixOS/nixpkgs/archive/${nixCommitHash}.tar.gz`
            const warehouseArguments = values.arguments || {}
            warehouses[varName] = new WarehouseVar()
            warehouses[varName].name = varName
            warehouses[varName].tarFileUrl = tarFileUrl
            warehouses[varName].arguments = warehouseArguments
            varNames.push(varName)
            nixCode += `
                ${varName} = ${indent({ string: warehouseAsNixValue(values), by: "        ", noLead: true })};
            `
            // save defaultWarehouse name
            if (kind == "(defaultWarehouse)") {
                defaultWarehouseName = varName
                defaultWarehouse = warehouses[varNames]
            }
        // 
        // (compute)
        // 
        } else if (kind == "(compute)") {
            // - (compute):
            //     runCommand: [ "nix-shell", "--pure", "--packages", "deno", "deno eval 'console.log(JSON.stringify(Deno.build.os==\'darwin\'))'", "-I", *defaultWarehouseAnchor ]
            //     saveAs: isMac
            const values = eachEntry[kind]
            const varName = values.saveAs
            const packages = values.withPackages || []
            const whichWarehouse = values.fromWarehouse || defaultWarehouse
            const tarFileUrl = warehouses[whichWarehouse.name].tarFileUrl // TODO: there's a lot of things that could screw up here, add checks/warnings for them
            const escapedArguments = 'NO_COLOR=true '+values.runCommand.map(each=>`'${escapeShellArgument(each)}'`).join(" ")
            const fullCommand = ["nix-shell", "--pure", "--packages", ...packages, "-I", "nixpkgs="+tarFileUrl, "--run",  escapedArguments,]
            
            const commandForDebugging = fullCommand.join(" ")
            if (! packages) {
                throw Error(`For\n- (compute):\n    saveAs: ${varName}\n    withPackages: []\nThe withPackages being empty is a problem. Try at least try: withPackages: ["bash"]`)
            }
            
            // TODO: make sure everything in the runCommand is a string
            let resultAsJson
            try {
                resultAsJson = await run(...fullCommand, Stdout(returnAsString))
                // TODO: grab STDOUT and STDERR for better error messages
            } catch (error) {
                throw Error(`There was an error when trying to run this command:\n    ${commandForDebugging}`)
            }
            let resultAsValue
            try {
                resultAsValue = JSON.parse(resultAsJson)
            } catch (error) {
                throw Error(`There was an error with the output of this command: ${commandForDebugging}\nThe output needs to be a valid JSON string, but there was an error while parsing the string: ${error}\n\nStandard output of the command was: ${JSON.stringify(resultAsJson)}`)
            }
            computed[varName] = resultAsValue
            varNames.push(varName)
            nixCode += `
                ${varName} = (${indent({ string: escapeNixObject(resultAsValue), by: "                        ", noLead: true})});
            `
        // 
        // (package)
        // 
        } else if (kind == "(package)") {
            // from: !!warehouse pythonPackages
            // load: [ "pyopengl",]
            // onlyIf: !!computed isLinux
            // asBuildInput: true
            const values = eachEntry[kind]

            // 
            // handle onlyIf
            // 
            if (values.onlyIf instanceof ComputedVar) {
                // skip if value is false
                if (!computed[values.onlyIf.name]) {
                    continue
                }
            } else {
                // FIXME values.onlyIf  !!nix
            }

            
            // 
            // get nix-value
            // 
            const source = values.from || defaultWarehouse
            const loadAttribute = values.load.map(each=>escapeNixString(each)).join(".")
            let nixValue 
            if (source instanceof NixValue) {
                nixValue = `${source.name}.${loadAttribute}`
            // from a hash/url directly
            } else {
                if (source instanceof Object) {
                    nixValue = `${warehouseAsNixValue(source)}.${loadAttribute}`
                } else if (typeof source == "string") {
                    nixValue = `${warehouseAsNixValue({createWarehouseFrom:{ nixCommitHash:source }})}.${loadAttribute}`
                }
                // TODO: else error
            }
            
            // 
            // add to build inputs
            // 
            if (values.asBuildInput) {
                buildInputStrings.push(nixValue)
            }
            if (values.asNativeBuildInput) {
                nativeBuildInputStrings.push(nixValue)
            }
            
            // 
            // create name if needed
            // 
            if (values.saveAs) {
                const varName = values.saveAs
                varNames.push(varName)
                packages[varName] = values
                nixCode += `
                ${varName} = ${nixValue};
                `
            }
        // 
        // (nix)
        // 
        } else if (kind == "(nix)") {
            // from: !!warehouse pythonPackages
            // load: [ "pyopengl",]
            // saveAs: varName
            const values = eachEntry[kind]
            
            // 
            // get nix-value
            // 
            const source = values.from || defaultWarehouse
            const loadAttribute = values.load.map(each=>escapeNixString(each)).join(".")
            let nixValue
            if (source instanceof NixValue) {
                nixValue = `${source.name}.${loadAttribute}`
            // from a hash/url directly
            } else {
                if (source instanceof Object) {
                    nixValue = `${warehouseAsNixValue(source)}.${loadAttribute}`
                } else if (typeof source == "string") {
                    nixValue = `${warehouseAsNixValue({createWarehouseFrom:{ nixCommitHash:source }})}.${loadAttribute}`
                }
                // TODO: else error
            }
            
            // 
            // create name if needed
            // 
            const varName = values.saveAs
            varNames.push(varName)
            nixValues[varName] = values
            nixCode += `
                ${varName} = ${nixValue};
            `
        }
    }
    
    // TODO: validate that all varNames are actually valid variable names 

    // 
    // library paths for all packages
    // 
    let libraryPathsString = ""
    let packagePathStrings = ""
    for (const [varName, value] of Object.entries(packages)) {
        libraryPathsString += `"${varName}" = __core__.lib.makeLibraryPath [ ${varName} ];\n`
        packagePathStrings += `"${varName}" = ${varName};\n`
    }
    let nixShellData = `
            __nixShellEscapedJsonData__ = (
                let 
                    nixShellDataJson = (__core__.toJSON {
                        libraryPaths = {\n${indent({string:libraryPathsString, by: "                            ",})}
                        };
                        packagePaths = {\n${indent({string:packagePathStrings, by: "                            ",})}
                        };
                    });
                    bashEscapedJson = (builtins.replaceStrings
                        [
                            "'"
                        ]
                        [
                            ${escapeNixString(`'"'"'`)}
                        ]
                        nixShellDataJson
                    );
                in
                    bashEscapedJson
            );
    `
    
    return `
        let
            #
            # create a standard library for convienience 
            # 
            __core__ = (
                let
                    frozenStd = (builtins.import 
                        (builtins.fetchTarball
                            ({url="https://github.com/NixOS/nixpkgs/archive/8917ffe7232e1e9db23ec9405248fd1944d0b36f.tar.gz";})
                        )
                        ({})
                    );
                in
                    (frozenStd.lib.mergeAttrs
                        (frozenStd.lib.mergeAttrs
                            (frozenStd.buildPackages) # <- for fetchFromGitHub, installShellFiles, getAttrFromPath, etc 
                            (frozenStd.lib.mergeAttrs
                                ({ stdenv = frozenStd.stdenv; })
                                (frozenStd.lib) # <- for mergeAttrs, optionals, getAttrFromPath, etc 
                            )
                        )
                        (builtins) # <- for import, fetchTarball, etc 
                    )
            );
            
            # 
            # Packages, Vars, and Compute
            # 
            ${nixCode}
            ${nixShellData}
        in
            __core__.mkShell {
                # inside that shell, make sure to use these packages
                buildInputs =  [\n${indent({
                        string:buildInputStrings.join("\n"),
                        by: "                    ",
                    })}
                ];
                
                nativeBuildInputs = [\n${indent({
                        string: nativeBuildInputStrings.join("\n"),
                        by: "                    ",
                    })}
                ];
                
                # run some bash code before starting up the shell
                shellHook = "
                    export VIRKSHOP_NIX_SHELL_DATA='\${__nixShellEscapedJsonData__}'
                ";
            }
        `.replace(/\n        /g,"\n")
}