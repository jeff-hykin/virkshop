import { FileSystem } from "https://deno.land/x/quickr@0.4.6/main/file_system.js"
import { run, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } from "https://deno.land/x/quickr@0.4.6/main/run.js"
import { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.4.6/main/console.js"
import { indent, findAll } from "https://deno.land/x/good@0.7.7/string.js"
import { intersection, subtract } from "https://deno.land/x/good@0.7.7/set.js"
import { move as moveAndRename } from "https://deno.land/std@0.133.0/fs/mod.ts"
import { zip } from "https://deno.land/x/good@0.7.7/array.js"
import { Type } from "https://deno.land/std@0.82.0/encoding/_yaml/type.ts"
import * as yaml from "https://deno.land/std@0.82.0/encoding/yaml.ts"
import * as Path from "https://deno.land/std@0.128.0/path/mod.ts"
import { stats, sum, spread, normalizeZeroToOne, roundedUpToNearest, roundedDownToNearest } from "https://deno.land/x/good@0.7.8/math.js"

// 
// 
// Main
// 
// 
let debuggingLevel = false
const virkshopIdentifierPath = `mixins/@virkshop/events/@virkshop/` // The only thing that can basically never change
const masterMixin = "@project"
export const createVirkshop = async (arg)=>{
    var { virkshopPath, projectPath } = {...arg}
    virkshopPath = virkshopPath || Console.env.VIRKSHOP_FOLDER         // env var is used when already inside of the virkshop
    projectPath  = projectPath  || Console.env.PROJECT_FOLDER // env var is used when already inside of the virkshop

    const realHome = Console.env.VIRKSHOP_USERS_HOME || Console.env.HOME
    
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
    
    const virkshopCache = {}
    const virkshop = Object.defineProperties(
        {
            pathTo: Object.defineProperties(
                {
                    realHome,
                    virkshop: virkshopPath,
                    project: FileSystem.makeAbsolutePath(projectPath || FileSystem.parentPath(virkshopPath)),
                },
                {
                    mixins:           { get() { return `${virkshop.pathTo.virkshop}/mixins` }},
                    mixture:          { get() { return `${virkshop.pathTo.virkshop}/mixture` }},
                    events:           { get() { return `${virkshop.pathTo.mixture}/events` }},
                    settings:         { get() { return `${virkshop.pathTo.mixture}/settings` }},
                    temporary:        { get() { return `${virkshop.pathTo.mixture}/temporary` }},
                    fakeHome:         { get() { return `${virkshop.pathTo.mixture}/home` }},
                    virkshopOptions:  { get() { return `${virkshop.pathTo.virkshop}/settings.yaml` }},
                    systemTools:      { get() { return `${virkshop.pathTo.virkshop}/system_tools.yaml` }},
                    commands:         { get() { return `${virkshop.pathTo.mixture}/commands` }},
                    _tempNixShellFile:{ get() { return `${virkshop.pathTo.fakeHome}/shell.nix` }},
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
            _internal: {
                homeMappingPriorities: [],
                shellSetupPriorities: [],
                deadlines: {
                    beforeSetup: [],
                    beforeReadingSystemTools: [],
                    beforeShellScripts: [],
                    beforeEnteringVirkshop: [],
                },
                sortPrioitiesByPath(array, convert=each=>each) {
                    array.sort((each1, each2) => convert(each1).localeCompare(convert(each2)))
                },
                createApi({ source, mixinName, eventName, deadlineName }) {
                    return {
                        ...virkshop,
                        source,
                        mixinName,
                        eventName,
                        addToShellProfile(string) {
                            if (deadlineName == "beforeEnteringVirkshop") {
                                throw Error(`
                                    There is a virkshop.addToShellProfile() inside a ${deadlineName}()
                                    In this file: ${this.source}
                                    
                                    The problem:
                                        The shell profile will already be done by the time of ${deadlineName}
                                    
                                    Likely solution:
                                        Change ${deadlineName}() to beforeShellScripts()
                                        Note: the available deadlines are:
                                            beforeSetup, beforeReadingSystemTools, beforeShellScripts, beforeEnteringVirkshop
                                `.replace(/\n                                /g,"\n"))
                            }
                            
                            virkshop._internal.shellSetupPriorities.push([ this.source, string ])
                        },
                        setEnvVar(name, value) {
                            if (deadlineName == "beforeEnteringVirkshop") {
                                throw Error(`
                                    There is a virkshop.setEnvVar() inside a ${deadlineName}()
                                    In this file: ${this.source}
                                    
                                    The problem:
                                        The shell profile will already be done by the time of ${deadlineName}
                                    
                                    Likely solution:
                                        Change ${deadlineName}() to beforeShellScripts()
                                        Note: the available deadlines are:
                                            beforeSetup, beforeReadingSystemTools, beforeShellScripts, beforeEnteringVirkshop
                                `.replace(/\n                                /g,"\n"))
                            }
                            
                            virkshop._internal.shellSetupPriorities.push([ this.source, `${name}='${shellApi.escapeShellArgument(value)}'` ])
                        },
                        injectUsersCommand(commandName) {
                            virkshop._internal.deadlines.beforeEnteringVirkshop.push(((async ()=>{
                                const pathThatIsHopefullyGitIgnored = `${virkshop.pathTo.temporary}/long_term/${this.eventName}/${this.mixinName}/${commandName}`
                                const commandPath = `${virkshop.pathTo.commands}/${commandName}`
                                
                                await FileSystem.ensureIsFile(pathThatIsHopefullyGitIgnored)
                                
                                try {
                                    await FileSystem.remove(commandPath)
                                    await FileSystem.relativeLink({
                                        existingItem: pathThatIsHopefullyGitIgnored,
                                        newItem: commandPath,
                                        overwrite: true,
                                        force: true,
                                    })
                                } catch (error) {
                                    console.error(error)
                                }
                                
                                // TODO: there's a lot that could be optimized here since system commands are slow.
                                // Note: this command is intentionally never awaited because it only needs to be done by the time nix-shell starts, which takes multiple orders of magnitude more time (not awaiting lets it be done in parallel)
                                run("command", "-v", commandName, Out(returnAsString)).then(async (absolutePathToCommand)=>{
                                    if (absolutePathToCommand) {
                                        await FileSystem.write({
                                            path: pathThatIsHopefullyGitIgnored,
                                            data: `#!/usr/bin/env bash\n`+`HOME='${shellApi.escapeShellArgument(virkshop.pathTo.realHome)}' PATH='${shellApi.escapeShellArgument(Console.env.PATH)}' ${absolutePathToCommand} "$@"`.replace(/\n/g, ""),
                                            overwrite: true,
                                        })
                                    } else {
                                        await FileSystem.remove(pathThatIsHopefullyGitIgnored)
                                    }
                                })
                            })()))
                        },
                        linkRealHomeFolder(path) {
                            virkshop._internal.homeMappingPriorities.push({
                                relativePathFromHome: path,
                                target: FileSystem.makeAbsolutePath(`${virkshop.pathTo.realHome}/${path}`),
                                targetIsFile: false, // TODO: add a check/warning if home-thing exists and disagrees
                                mixinName,
                                source,
                            })
                        },
                        linkRealHomeFile(path) {
                            virkshop._internal.homeMappingPriorities.push({
                                relativePathFromHome: path,
                                target: FileSystem.makeAbsolutePath(`${virkshop.pathTo.realHome}/${path}`),
                                targetIsFile: true, // TODO: add a check/warning if home-thing exists and disagrees
                                mixinName,
                                source,
                            })
                        },
                    }
                },
            },
            _stages: {
                // 
                // 
                // phase 0: "prep" creates/discovers basic virkshop structure (establish linked files/folders, clean broken links)
                // 
                // 
                async phase0(mixinPaths) {
                    debuggingLevel && console.log("[Phase0: Establishing/Verifying Structure]")
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    
                    // TODO: purge broken system links more
                    
                    // 
                    // let mixins symlinks finish in any order (efficient), but all of them need to be done before phase 1 starts
                    // 
                    await Promise.all(mixinPaths.map(async eachPath=>{
                        const mixinName = FileSystem.basename(eachPath)
                        for (const eachSpecialFolder of virkshop.structure.specialMixinFolders) {
                            // 
                            // home is extra special
                            // 
                            if (FileSystem.basename(eachSpecialFolder) == "home") {
                                const mixinsHome = `${eachPath}/${eachSpecialFolder}`
                                const homeMappingPriorities = virkshop._internal.homeMappingPriorities
                                virkshop._internal.deadlines.beforeSetup.push(new Promise(async (resolve, reject)=>{
                                    for (const eachHomePathInfo of await FileSystem.recursivelyListItemsIn(mixinsHome)) {
                                        const relativeHomePath = FileSystem.normalize(FileSystem.makeRelativePath({
                                            from: mixinsHome,
                                            to: eachHomePathInfo.path,
                                        })).replace(/^\.\//, "")
                                        if (mixinName != masterMixin) {
                                            // if any non-master mixin tries to set a protected path, ban it
                                            if (shellApi.protectedPaths.includes(relativeHomePath)) {
                                                console.warn(`The ${mixinName} mixin tried to set this file: $HOME/${relativeHomePath}. However only the master mixin (${masterMixin}) is allowed to set this file.\nThis issue can likely be solved by deleting: ${eachHomePathInfo}`)
                                                // skip adding this to homeMappingPriorities
                                                continue
                                            }
                                        }
                                        homeMappingPriorities.push({
                                            relativePathFromHome: relativeHomePath,
                                            target: eachHomePathInfo.path,
                                            targetIsFile: !eachHomePathInfo.isFolder,
                                            mixinName,
                                            source: `home/${relativeHomePath}`,
                                        })
                                    }
                                    // everything for this mixin has been added to homeMappingPriorities
                                    resolve()
                                }))
                                continue
                            }

                            // 
                            // all other folders
                            // 
                            const mixinFolder                      = `${eachPath}/${eachSpecialFolder}/${mixinName}`
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
                                const target = await FileSystem.nextTargetOf(namespaceCheck.path)
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
                                    newItem: commonFolderReservedForThisMixin,
                                    overwrite: true,
                                })
                            }
                        }
                    }))
                    
                    // rule1: never overwrite non-symlink files (in commands/ settings/ etc)
                    //        hardlink files are presumably created by the user, not a mixin
                    // link virkshop folders up-and-out into the project folder
                    await Promise.all(Object.entries(virkshop.options.projectLinks).map(async ([whereInProject, whereInVirkshop])=>{
                        // TODO: make $VIRKSHOP_FOLDER and $PROJECT_FOLDER required at the front
                        whereInProject = whereInProject.replace(/^\$PROJECT_FOLDER\//, "./")
                        whereInVirkshop = whereInVirkshop.replace(/^\$VIRKSHOP_FOLDER\//, "./")
                        const sourcePath = `${virkshop.pathTo.virkshop}/${whereInVirkshop}`
                        const target = await FileSystem.info(`${virkshop.pathTo.project}/${whereInProject}`)
                        if (target.isBrokenLink) {
                            await FileSystem.remove(target.path)
                        }
                        // create it, but dont destroy an existing folder (unless its a broken link)
                        if (target.isBrokenLink || !target.exists)  {
                            await FileSystem.relativeLink({
                                existingItem: sourcePath,
                                newItem: target.path,
                                overwrite: true,
                            })
                        }
                    }))
                },
                // 
                // 
                // phase 1: "mixing" lets all the mixin's set themselves up (but other mixins are not guarenteed to be setup)
                // 
                // 
                async phase1(mixinPaths) {
                    debuggingLevel && console.log("[Phase1: Mixins Setup]")
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)

                    // 
                    // make all the numbers correct
                    // 
                    const promises = []
                    for (const eachMixinPath of mixinPaths) {
                        promises.push(FileSystem.listFilePathsIn(`${eachMixinPath}/events/`, {recursively:true}))
                    }
                    const paths = (await Promise.all(promises)).flat(1)
                    const pathsThatNeedRenaming = numberPrefixRenameList(paths)
                    promises.length = 0 // clear contents
                    for (const { oldPath, newPath } of pathsThatNeedRenaming) {
                        promises.push(moveAndRename(oldPath, newPath))
                    }
                    await Promise.all(promises)
                    
                    // 
                    // let mixins set themselves up
                    // 
                    const alreadExecuted = new Set()
                    for (const eachMixinPath of mixinPaths) {
                        const mixinName = FileSystem.basename(eachMixinPath)
                        const eventName = "before_setup"
                        // 
                        // let the mixin link everything within itself
                        // 
                        const parentFolderString = `${eachMixinPath}/events/@virkshop/${eventName}`
                        const selfSetupPromise = FileSystem.recursivelyListItemsIn(parentFolderString).then(
                            async (phase1Items)=>{
                                virkshop._internal.sortPrioitiesByPath(phase1Items, (each)=>each.path.slice(parentFolderString.length))
                                const startTime = (new Date()).getTime()
                                for (const eachItem of phase1Items) {
                                    // if its not a folder
                                    if (!eachItem.isFolder && eachItem.exists) {
                                        await FileSystem.addPermissions({path: eachItem.path, permissions: { owner: {canExecute: true} }})
                                        try {
                                            // if importable, then import it
                                            if (eachItem.path.endsWith(".deno.js")) {
                                                const uniquePath = await FileSystem.finalTargetOf(eachItem.path)
                                                if (!alreadExecuted.has(uniquePath)) {
                                                    alreadExecuted.add(uniquePath)
                                                    // puts things inside of virkshop._internal.deadlines
                                                    await virkshop.importDeadlinesFrom({
                                                        path: eachItem.path,
                                                        mixinName,
                                                        source: eachItem.path.slice(parentFolderString.length),
                                                        eventName,
                                                    })
                                                }
                                            // otherwise execute it
                                            } else {
                                                await run`${eachItem.path}`
                                            }
                                        } catch (error) {
                                            console.log(`\n\nWARNING: error while executing ${eventName} of ${FileSystem.basename(eachMixinPath)}, ${error.stack}`,)
                                        }
                                    }
                                }
                                const duration = (new Date()).getTime() - startTime
                                debuggingLevel && console.log(`     [${duration}ms: setting up ${mixinName}]`)
                            }
                        )
                        virkshop._internal.deadlines.beforeSetup.push(selfSetupPromise)
                        
                        // 
                        // kick-off work for phase2 so that it runs ASAP
                        // 
                        virkshop._internal.deadlines.beforeShellScripts.push(selfSetupPromise.then(async ()=>{
                            // read the the before_login files as soon as possible
                            const eventName = `during_setup`
                            const parentFolderString = `${eachMixinPath}/events/@virkshop/${eventName}/`
                            const files = await FileSystem.listFilePathsIn(parentFolderString)
                            await Promise.all(files.map(async eachPath=>{
                                if (eachPath.match(/\.deno\.js$/)) {
                                    // puts things inside of virkshop._internal.deadlines
                                    await virkshop.importDeadlinesFrom({
                                        path: eachPath,
                                        mixinName,
                                        source: eachPath.slice(parentFolderString.length),
                                        eventName,
                                    })
                                } else if (eachPath.match(/\.zsh$/)) {
                                    virkshop._internal.shellSetupPriorities.push(
                                        [
                                            eachPath.slice(parentFolderString.length),
                                            await FileSystem.read(eachPath),
                                        ]
                                    )
                                } else {
                                    console.warn(`\n\nThis file: ${eachPath}\nwas inside a ${eventName}/\nBut it didn't have a .zsh or .deno.js file extension\n(so it will be ignored besides generating this warning)`)
                                }
                            }))
                        }))
                    }

                    // 
                    // let the mixins set themselves up before starting phase2
                    // 
                    await Promise.all(virkshop._internal.deadlines.beforeSetup)

                    // 
                    // start linking home together right after
                    // 
                    virkshop._internal.deadlines.beforeEnteringVirkshop.push(
                        ((async ()=>{
                            const homeMappingPriorities = virkshop._internal.homeMappingPriorities.map(
                                each=>({
                                    ...each,
                                    isMasterMixin: each.mixinName == masterMixin,
                                    relativePathFromHome: FileSystem.normalize(each.relativePathFromHome),
                                })
                            )
                            debuggingLevel && console.log("Here are the priority mappings for home")
                            debuggingLevel && console.log(homeMappingPriorities.sort((a,b)=>a.relativePathFromHome.localeCompare(b.relativePathFromHome)))
                            const lowPriorityHomeAspects = homeMappingPriorities.filter(each=>!each.isMasterMixin)
                            const highPriorityHomeAspects = homeMappingPriorities.filter(each=>each.isMasterMixin)
                            // do low priority stuff first because its going to be overwritten by higher priority
                            for (const eachListOfItems of [lowPriorityHomeAspects, highPriorityHomeAspects]) {
                                const pathsToCreate = {}

                                // put longest paths at the end of the list
                                eachListOfItems.sort((a,b)=>a.relativePathFromHome.length - b.relativePathFromHome.length)
                                // resolve as many overlaps here before actual file operations happen
                                for (const each of eachListOfItems) {
                                    pathsToCreate[each.relativePathFromHome] = each
                                }

                                // 
                                // create items
                                // 
                                for (const [eachPath, eachItem] of Object.entries(pathsToCreate)) {
                                    // FIXME: detect conflicts/overwrites and schedule them to be mentioned (so long as theyre not resovled by the masterMixin)
                                    // in masterMixin the conflicts need to be reported because they're likely non-obvious even if they're rare
                                    
                                    // make sure target exists
                                    if (eachItem.targetIsFile) {
                                        await FileSystem.ensureIsFile(eachItem.target)
                                        await FileSystem.info(eachItem.target)
                                    } else {
                                        await FileSystem.ensureIsFolder(eachItem.target)
                                    }
                                    
                                    // clear a path
                                    const newHomePath = `${virkshop.pathTo.fakeHome}/${eachItem.relativePathFromHome}`
                                    await FileSystem.remove(newHomePath)
                                    
                                    // relative link
                                    if (FileSystem.isRelativePath(eachItem.target)) {
                                        await FileSystem.relativeLink({
                                            existingItem: eachItem.target,
                                            newItem: newHomePath,
                                            overwrite: true,
                                            force: true,
                                        })
                                    // absolute link
                                    } else {
                                        try {
                                            await FileSystem.absoluteLink({
                                                existingItem: eachItem.target,
                                                newItem: newHomePath,
                                                overwrite: true,
                                                force: true,
                                            })
                                        } catch (error) {
                                            console.debug(`eachItem.target is:`,eachItem.target)
                                            console.debug(`newHomePath is:`,newHomePath)
                                            throw error
                                        }
                                    }
                                }
                            }
                        })())
                    )
                },
                // 
                // 
                // phase 2: "cooking" enters the virkshop, and runs zsh login scripts created by the mixins
                // 
                // 
                async phase2(mixinPaths) {
                    // 
                    // the three operations below can be done in any order, which is why they're in this Promise.all
                    // 
                    debuggingLevel && console.log("[Phase2: Nix+Zsh Setup]")
                    var startTime = (new Date()).getTime()
                    var defaultWarehouse
                    await Promise.all([

                        // 
                        // parse the systemTools file
                        // 
                        ((async ()=>{
                            // make sure the systemTools file is stable
                            await Promise.all(virkshop._internal.deadlines.beforeReadingSystemTools)
                            
                            const yamlString = await FileSystem.read(virkshop.pathTo.systemTools)
                            // TODO: get a hash of this and see if nix-shell should even be regenerated or not (as an optimization)
                            const result = await fornixToNix(yamlString)
                            defaultWarehouse = result.defaultWarehouse
                            // TODO: add error for no default warehouse
                            await FileSystem.write({
                                data: result.string,
                                path: virkshop.pathTo._tempNixShellFile,
                                overwrite: true,
                            })
                        })()),
                        
                        // 
                        // create the zshrc file
                        // 
                        ((async ()=>{
                            let shellProfileString = shellApi.shellProfileString
                            
                            // 
                            // add project commands
                            // 
                            shellProfileString += `
                                #
                                # inject project's virkshop commands
                                #
                                export PATH='${shellApi.escapeShellArgument(virkshop.pathTo.commands)}:'"$PATH"
                            `.replace(/\n */g,"\n")

                            // 
                            // add during_setup scripts
                            // 
                            await Promise.all(virkshop._internal.deadlines.beforeShellScripts)
                            virkshop._internal.sortPrioitiesByPath(virkshop._internal.shellSetupPriorities , ([eachSource, ...otherData])=>eachSource)
                            for (const [eachSource, eachContent] of virkshop._internal.shellSetupPriorities) {
                                // TODO: add a debugging echo here if debuggingLevel
                                shellProfileString += `\n#\n# ${eachSource}\n#\n${eachContent}\n`
                            }
                            
                            // 
                            // add project commands again
                            // 
                            shellProfileString += `
                                #
                                # inject project's virkshop commands
                                #
                                ${shellApi.generatePrependToPathString(virkshop.pathTo.commands)}
                            `.replace(/\n */g,"\n")
                            // 
                            // make folders work as recursive commands
                            // 
                            for (const eachFolderPath of await FileSystem.listFolderPathsIn(virkshop.pathTo.commands)) {
                                shellProfileString += shellApi.createHierarchicalCommandFor(eachFolderPath)
                            }
                            
                            const autogeneratedPath = `${virkshop.pathTo.fakeHome}/${shellApi.autogeneratedProfile}`
                            await FileSystem.info(shellApi.profilePath).then(async (itemInfo)=>{
                                if (!itemInfo.exists) {
                                    await FileSystem.write({
                                        path: shellApi.profilePath,
                                        data: `
                                            . './${shellApi.escapeShellArgument(shellApi.autogeneratedProfile)}'
                                        `.replace(/\n                                            /g, "\n"),
                                    })
                                }
                            })
                            
                            // write the new shell profile
                            await FileSystem.write({
                                path: autogeneratedPath,
                                data: shellProfileString,
                                force: true,
                                overwrite: true,
                            })
                        })()),

                        // 
                        // since phase2 created the mixture, connect parts of the mixture to the outside folder system
                        // 
                        ((async ()=>{
                            mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                            await Promise.all(mixinPaths.map(async eachMixinPath=>{

                                const mixinName = FileSystem.basename(eachMixinPath)
                                for (const eachSpecialFolder of virkshop.structure.specialMixinFolders) {
                                    const commonFolder = `${virkshop.pathTo.mixture}/${eachSpecialFolder}`
                                    const mixinFolder  = `${eachMixinPath}/${eachSpecialFolder}`

                                    // 
                                    // add all the shortcut links
                                    // 
                                    for (const eachPath of await FileSystem.recursivelyListPathsIn(mixinFolder)) {
                                        const relativePart = eachPath.slice(mixinFolder.length)
                                        const sourceLocation = eachPath
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
                                                const currentTarget  = await FileSystem.finalTargetOf(targetLocation.path)
                                                const intendedTarget = await FileSystem.finalTargetOf(eachPath)
                                                if (currentTarget == intendedTarget) {
                                                    // already linked
                                                    continue
                                                } else {
                                                    // linked but to the wrong thing
                                                    console.warn(`
                                                        This path:               ${targetLocation.path}
                                                        Should link to:          ${intendedTarget}
                                                        But instead it links to: ${currentTarget}

                                                        The fix is probably to just delete: ${targetLocation.path}
                                                        (I'm not sure how you would end up in this situation)
                                                    `.replace(/\n                            /g,"\n"))
                                                    const answeredYes = await Console.askFor.yesNo("Would you like me to delete it for you?")
                                                    if (answeredYes) {
                                                        await FileSystem.remove(targetLocation.path)
                                                    }
                                                    console.log("Continuing setup ...")

                                                    if (!answeredYes) {
                                                        continue
                                                    }
                                                }
                                            }
                                        }
                                        const mixinItem = await FileSystem.info(eachPath)
                                        if (mixinItem.isFile) {
                                            // TODO: this could technically destroy a user-made file, if it was "thing/thing" in a "thing/thing/${mixinItem}" path
                                            
                                            // make sure it exists by this point
                                            await FileSystem.ensureIsFolder(FileSystem.parentPath(mixinItem.path))
                                            try {
                                                // create the shortcut
                                                await FileSystem.relativeLink({
                                                    existingItem: mixinItem.path,
                                                    newItem: targetLocation.path,
                                                    overwrite: true,
                                                })
                                            } catch (error) {
                                                // can remove this try-catch once 1.0 is published
                                                console.debug(`relativeLink failed: `,)
                                                console.debug(`    mixinItem.path is:`,mixinItem.path)
                                                console.debug(`    targetLocation.path is:`,targetLocation.path)
                                                console.debug(`    error is:`, error)
                                                throw error
                                            }
                                        }
                                        // TODO: consider another edgecase of mixin item being a file, but existing item being a folder
                                    }
                                }

                            }))
                        })()),
                        
                    ])
                    var duration = (new Date()).getTime() - startTime; var startTime = (new Date()).getTime()
                    debuggingLevel && console.log(`     [${duration}ms creating shell profile and shell.nix]`)
                    
                    // 
                    // finish dynamic setup
                    // 
                    await Promise.all(virkshop._internal.deadlines.beforeEnteringVirkshop)
                    // make all commands executable
                    
                    const permissionPromises = []
                    for await (const eachCommand of FileSystem.recursivelyIterateItemsIn(virkshop.pathTo.commands)) {
                        if (eachCommand.isFile) {
                            permissionPromises.push(
                                await FileSystem.addPermissions({path: eachCommand.path, permissions: { owner: {canExecute: true} }})
                            )
                        }
                    }
                    await Promise.all(permissionPromises)
                    
                    var duration = (new Date()).getTime() - startTime; var startTime = (new Date()).getTime()
                    debuggingLevel && console.log(`     [${duration}ms creating mixture]`)
                    
                    // 
                    // run nix-shell
                    // 
                    const newPwd = FileSystem.parentPath(virkshop.pathTo._tempNixShellFile)
                    const envVars = {
                        _shell_start_time: `${startTime}`,
                        VIRKSHOP_FOLDER: virkshop.pathTo.virkshop,
                        PROJECT_FOLDER: virkshop.pathTo.project,
                        VIRKSHOP_HOME: virkshop.pathTo.fakeHome,
                        VIRKSHOP_USERS_HOME: virkshop.pathTo.realHome,
                        VIRKSHOP_DEBUG: `${debuggingLevel}`,
                        NIX_SSL_CERT_FILE: Console.env.NIX_SSL_CERT_FILE,
                        NIXPKGS_ALLOW_UNFREE: "1",
                        NIX_PROFILES: Console.env.NIX_PROFILES,
                        HOME: virkshop.pathTo.fakeHome,
                        PATH: Console.env.PATH,
                        PWD: newPwd,
                        _PWD: Console.env.PWD,
                        TMPDIR: "/tmp", // fixes some build problems (workaround for a bug in Nix)
                        SHELL: Console.env.SHELL,
                        USER: Console.env.USER,
                        SSH_AUTH_SOCK: Console.env.SSH_AUTH_SOCK || '',
                        SHLVL: Console.env.SHLVL || '',
                        OLDPWD: Console.env.OLDPWD || '',
                        COLORTERM: Console.env.COLORTERM || '',
                        TERM: Console.env.TERM || '',
                        COMMAND_MODE: "unix2003",
                        LANG: "en_US.UTF-8", // TODO: put this in settings
                    }
                    await run(
                        "nix-shell",
                        "--pure",
                        "--command", shellApi.startCommand,
                        ...Object.keys(envVars).map(
                            name=>["--keep", name]
                        ).flat(),
                        `${virkshop.pathTo._tempNixShellFile}`,
                        "-I", `nixpkgs=${defaultWarehouse.tarFileUrl}`,
                        Cwd(newPwd),
                        Env(envVars),
                    )
                    // TODO: call all the on_quit scripts
                },
            },
            async trigger(eventPath) {
                const alreadExecuted = new Set()
                const fullPathToEvent = `${virkshop.pathTo.events}/${eventPath}`
                for await (const eachPath of FileSystem.recursivelyIteratePathsIn(fullPathToEvent, { searchOrder: 'depthFirstSearch', })) {
                    const uniquePath = await FileSystem.finalTargetOf(eachPath)
                    if (!alreadExecuted.has(uniquePath)) {
                        var success = true
                        try {
                            // if deno, then import it (much faster than executing it)
                            if (eachPath.endsWith(".deno.js")) {
                                const escapedPath = `${encodeURIComponent(eachPath).replace(/%2F/g,'/')}`
                                await import(escapedPath)
                            // otherwise execute it using the hashbang
                            } else {
                                await FileSystem.addPermissions({
                                     path: eachPath, 
                                     permissions: { owner: { canExecute: true} },
                                })
                                var { success } = await run(eachPath)
                            }
                            alreadExecuted.add(eachPath)
                        } catch (error) {
                            console.warn(`    Tried to trigger ${eachPath}, but there was an error:\n`, error)
                        }
                        if (!success) {
                            console.warn(`    Tried to trigger ${eachPath}, but there was an error (info above)`)
                        }
                    }
                }
            },
            async importDeadlinesFrom({path, mixinName, eventName, source }) {
                const escapedPath = `${encodeURIComponent(path).replace(/%2F/g,'/')}`
                const {deadlines} = await import(escapedPath) || {}
                for (const eachDeadlineName of Object.keys(virkshop._internal.deadlines)) {
                    if (deadlines[eachDeadlineName] instanceof Function) {
                        virkshop._internal.deadlines[eachDeadlineName].push(
                            // start the function, and we'll await it at the respective deadline
                            deadlines[eachDeadlineName](
                                virkshop._internal.createApi({
                                    mixinName,
                                    source,
                                    eventName,
                                    deadlineName: eachDeadlineName,
                                })
                            )
                        )
                    }
                }
            }
        },
        {
            folder:      { get() { return virkshop.pathTo.virkshop } }, // alias
            projectName: { get() { return FileSystem.basename(virkshop.pathTo.project)   } },
            options: { 
                get() {
                    if (virkshopCache.options) {
                        return virkshopCache.options
                    }

                    let yamlString
                    try {
                        yamlString = Deno.readTextFileSync(virkshop.pathTo.virkshopOptions)
                    } catch (error) {
                        console.log(`Couldn't find the ${FileSystem.basename(virkshop.pathTo.virkshopOptions)} file, so one will be created`)
                        yamlString = `
                            virkshop:
                                projectLinks:
                                    "$PROJECT_FOLDER/commands":      "$VIRKSHOP_FOLDER/mixture/commands"
                                    "$PROJECT_FOLDER/documentation": "$VIRKSHOP_FOLDER/mixture/documentation"
                                    "$PROJECT_FOLDER/events":        "$VIRKSHOP_FOLDER/mixture/events"
                                    "$PROJECT_FOLDER/settings":      "$VIRKSHOP_FOLDER/mixture/settings"
                                
                                debuggingLevel: 1
                        `.replace(/\n                            /g,"\n")
                        // async write is not awaited because this is inside a getter
                        FileSystem.write({
                            data: yamlString,
                            path: virkshop.pathTo.virkshopOptions,
                        })
                    }
                    virkshopCache.options = yaml.parse(yamlString).virkshop
                    return virkshopCache.options
                },
            },
        },
    )
    
    debuggingLevel = virkshop.options.debuggingLevel
    return virkshop
}
export const virkshop = await createVirkshop()

// 
// shellApi
// 
export const shellApi = Object.defineProperties(
    {
        autogeneratedProfile: `.zshrc.autogenerated.ignore`,
        startCommand: "zsh --no-globalrcs",
        protectedPaths: [ ".zshrc", ".zshenv", ".zlogin", ".zlogout", ".zprofile" ], // TODO: check that zlogout zprofile are correct
        fileExtensions: [ `.zsh` ],
        shellProfileString: `
            cd "$_PWD" # go back to real location
            unset _PWD

            # don't let zsh update itself without telling all the other packages 
            # instead use nix to update zsh
            DISABLE_AUTO_UPDATE="true"
            DISABLE_UPDATE_PROMPT="true"

            if [ "$VIRKSHOP_DEBUG" = "true" ]
            then
                deno eval 'console.log(\`     [\${(new Date()).getTime()-Deno.env.get("_shell_start_time")}ms nix-shell]\`)'
            fi
            unset _shell_start_time

            # This is runtime-faster than creating/calling several individual commands
            system_tools () {
                sub_command="$1"
                shift
                if [ "$sub_command" = "nix_path_for" ]
                then
                    sub_command="$1"
                    shift
                    if [ "$sub_command" = "package" ]
                    then
                        deno eval 'console.log(JSON.parse(Deno.env.get("VIRKSHOP_NIX_SHELL_DATA")).packagePaths[Deno.args[0]])' "$@"
                    fi
                elif [ "$sub_command" = "nix_lib_path_for" ]
                then
                    sub_command="$1"
                    shift
                    if [ "$sub_command" = "package" ]
                    then
                        deno eval 'console.log(JSON.parse(Deno.env.get("VIRKSHOP_NIX_SHELL_DATA")).libraryPaths[Deno.args[0]])' "$@"
                    fi
                fi
            }
        `,
        escapeShellArgument(string) {
            return string.replace(/'/g, `'"'"'`)
        },
        generatePrependToPathString(newPath) {
            return `export PATH='${this.escapeShellArgument(newPath)}:'"$PATH"`
        },
        createHierarchicalCommandFor(folderPath) {
            const name = this.escapeShellArgument(FileSystem.basename(folderPath))
            folderPath = FileSystem.makeAbsolutePath(folderPath)
            return `
                # 
                # command for ${name} folder
                # 
                    '${name}' () {
                        # enable globbing
                        setopt extended_glob &>/dev/null
                        shopt -s globstar &>/dev/null
                        shopt -s dotglob &>/dev/null
                        local search_path='${this.escapeShellArgument(folderPath)}'
                        local argument_combination="$search_path/$1"
                        while [[ -n "$@" ]]
                        do
                            shift 1
                            for each in "$search_path/"**/*
                            do
                                if [[ "$argument_combination" = "$each" ]]
                                then
                                    # if its a folder, then we need to go deeper
                                    if [[ -d "$each" ]]
                                    then
                                        search_path="$each"
                                        argument_combination="$argument_combination/$1"
                                        
                                        # if there is no next argument
                                        if [[ -z "$1" ]]
                                        then
                                            printf "\\nThat is a sub folder, not a command\\nValid sub-commands are\\n" 1>&2
                                            ls -1FL --group-directories-first --color "$each" | sed 's/^/    /' | sed -E 's/(\\*|@)$/ /' 1>&2
                                            return 1 # error, no command
                                        fi
                                        
                                        break
                                    # if its a file, run it with the remaining arguments
                                    elif [[ -f "$each" ]]
                                    then
                                        "$each" "$@"
                                        # make exit status identical to executed program
                                        return $?
                                    fi
                                fi
                            done
                        done
                        # if an option was given
                        if ! [ -z "$each" ]
                        then
                            echo "$each"
                            printf "\\nI could not find that sub-command\\n" 1>&2
                        fi
                        printf "Valid next-arguments would be:\\n" 1>&2
                        ls -1FL --group-directories-first --color "$search_path" | sed 's/^/    /' | sed -E 's/(\\*|@)$/ /' 1>&2
                        return 1 # error, no command
                    }
                    '__autocomplete_for__${name}' () {
                        local commands_path='${this.escapeShellArgument(FileSystem.parentPath(folderPath))}'
                        # TODO: make this space friendly
                        # TODO: make this do partial-word complete 
                        function join_by { local d=\${1-} f=\${2-}; if shift 2; then printf %s "$f" "\${@/#/$d}"; fi; }
                        local item_path="$(join_by "/" $words)"
                        if [ -d "$commands_path/$item_path" ]
                        then
                            compadd $(ls "$commands_path/$item_path")
                        elif [ -d "$(dirname "$commands_path/$item_path")" ]
                        then
                            # check if file exists (finished completion)
                            if ! [ -f "$commands_path/$item_path" ]
                            then
                                # TODO: add a better check for sub-matches "java" [tab] when "java" and "javascript" exist
                                compadd $(ls "$(dirname "$commands_path/$item_path")")
                            fi
                        fi
                        # echo "$(dirname "$commands_path/$item_path")"
                    }
                    compdef '__autocomplete_for__${name}' '${name}'
            `.replace(/\n                /g, "\n")
        }
    },
    {
        profilePath:         { get() { return `${virkshop.pathTo.mixins}/${masterMixin}/home/.zshrc` } },
    },
)


// 
// 
// Helpers
// 
// 
    function pathOfCaller() {
        const err = new Error()
        const filePaths = findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
        
        // if valid file
        // TODO: make sure this works inside of anonymous functions (not sure if error stack handles that well)
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

    function numberPrefixRenameList(filepaths) {
        let largestNumber = -Infinity
        const items = []
        const basenames = filepaths.map(eachPath=>FileSystem.basename(eachPath))
        for (const each of basenames) {
            const matchData = each.match(/^((?:[0-9_]*[0-9])?)_?(.*)/)
            const digits = matchData[1].replace(/_/g, "")
            const name = matchData[2]
            const number = `${digits || 0}`-0
            const padding = digits.match(/^0*/)[0]
            items.push({
                name,
                number,
                padding,
                noDigits: digits.length == 0,
            })
            if (number > largestNumber) {
                largestNumber = number
            }
        }
        const numberOfDigits = `${largestNumber}`.length
        const roundedToNearestThree = roundedUpToNearest({value: numberOfDigits, factor: 3})
        const newBasenames = []
        for (const each of items) {
            if (each.noDigits) {
                newBasenames.push(each.name)
            } else {
                const newDigits = `${each.padding}${each.number}`.padEnd(roundedToNearestThree, "0")
                const newPrefix = newDigits.replace(/(\d\d\d)/g, "$1_")
                newBasenames.push(`${newPrefix}${each.name}`)
            }
        }
        const thingsToRename = []
        for (const [ path, oldBasename, newBasename, item] of zip(filepaths, basenames, newBasenames, items)) {
            if (oldBasename != newBasename) {
                thingsToRename.push({
                    oldPath: path,
                    newPath: `${FileSystem.parentPath(path)}/${newBasename}`,
                })
            }
        }
        return thingsToRename
    }

// 
// 
// Yaml support
// 
// 
    class CustomYamlType {
        asString = null
    }
    function createCustomTag({tagName, javascriptValueisACustomType, yamlNodeIsValidACustomTyp, createJavasriptValueFromYamlString, customValueToYamlString, kind="scalar", }) {
        if (kind != "scalar") {
            throw Error(`Sorry in createCustomTag({ kind: '${kind}' }), the only valid kind (currently) is scalar`)
        }
        const universalTag = `tag:yaml.org,2002:${tagName}`
        class ACustomType extends CustomYamlType {}

        const validVariableNameRegex = /^ *\b[a-zA-Z_][a-zA-Z_0-9]*\b *$/
        const customValueSupport = new Type(universalTag, {
            kind: "scalar",
            predicate: javascriptValueisACustomType || function(object) {
                return object instanceof ACustomType
            },
            resolve: yamlNodeIsValidACustomTyp || function(data) {
                return true
            },
            construct: createJavasriptValueFromYamlString || function(data) {
                const customValue = new ACustomType()
                customValue.asString = data
                return customValue
            },
            represent: customValueToYamlString || function(object /*, style*/) {
                return customValue.asString
            },
        })

        // hack it into the default schema (cause .extend() isnt available)
        yaml.DEFAULT_SCHEMA.explicit.push(customValueSupport)
        yaml.DEFAULT_SCHEMA.compiledTypeMap.fallback[universalTag] = customValueSupport
        yaml.DEFAULT_SCHEMA.compiledTypeMap.scalar[universalTag] = customValueSupport

        return ACustomType
    }

    // 
    // !!nix support
    // 
        const validVariableNameRegex = /^ *\b[a-zA-Z_][a-zA-Z_0-9]*\b *$/
        const NixValue = createCustomTag({
            tagName: "nix",
        })
    // 
    // !!warehouse support
    // 
        const WarehouseVar = createCustomTag({
            tagName: "warehouse",
            yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                return !!data.match(validVariableNameRegex)
            },
            createJavasriptValueFromYamlString(data) {
                const nixVar = new WarehouseVar()
                nixVar.asString = data
                nixVar.name = data.trim()
                return nixVar
            }
        })
    // 
    // !!computed support
    // 
        const ComputedVar = createCustomTag({
            tagName: "computed",
            yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                return !!data.match(validVariableNameRegex)
            },
            createJavasriptValueFromYamlString(data) {
                const nixVar = new ComputedVar()
                nixVar.asString = data
                nixVar.name = data.trim()
                return nixVar
            }
        })
    // 
    // !!package support
    // 
        const PackageVar = createCustomTag({
            tagName: "package",
            yamlNodeIsValidNixVar(data) {
                if (typeof data !== 'string') return false
                if (data.length === 0) return false
                
                data = data.trim()
                // if its a variable name
                return !!data.match(validVariableNameRegex)
            },
            createJavasriptValueFromYamlString(data) {
                const nixVar = new PackageVar()
                nixVar.asString = data
                nixVar.name = data.trim()
                return nixVar
            }
        })

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
            if (obj instanceof WarehouseVar || obj instanceof ComputedVar || obj instanceof PackageVar) {
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
                                string: `${escapeNixString(key)} = ${escapeNixObject(value)};`
                            }) + "\n"
                        } else {
                            string += indent({
                                string: `${escapeNixString(key)} = (\n${
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

export const parsePackageTools = async (pathToPackageTools)=>{
    // in the future their may be some extra logic here
    const dataStructure = yaml.parse(await FileSystem.read(pathToPackageTools), {schema: yaml.DEFAULT_SCHEMA,},)
    const allSaveAsValues = dataStructure.map(each=>each[Object.keys(each)[0]].saveAs)
    const illegalNames = allSaveAsValues.filter(each=>each.startsWith("_-"))
    if (illegalNames.length > 0) {
        throw Error(`Inside ${pathToPackageTools}, there are some illegal saveAs names (names that start with "_-")\nPlease rename these values:${illegalNames.map(each=>`\n    saveAs: ${each}`).join("")}`)
    }
    dataStructure.packages = dataStructure.map(each=>each["(package)"]).filter(each=>each instanceof Object)
    dataStructure.warehouses = dataStructure.map(each=>each["(warehouse)"] || each["(defaultWarehouse)"]).filter(each=>each instanceof Object)
    dataStructure.directPackages = dataStructure.packages.filter(each=>each.asBuildInput&&(each.load instanceof Array))
    return dataStructure
}

// 
// fornixToNix
// 
export const fornixToNix = async function(yamlString) {
    // TODO: add error for trying to assign to a keyword (like "builtins", "rec", "let", etc)
    const start = (new Date()).getTime()
    const dataStructure = yaml.parse(yamlString, {schema: yaml.DEFAULT_SCHEMA,},)
    const allSaveAsValues = dataStructure.map(each=>each[Object.keys(each)[0]].saveAs)
    const frequencyCountOfVarNames = allSaveAsValues.filter(each=>each).reduce((frequency, item)=>(frequency[item]?frequency[item]++:frequency[item]=1, frequency), {})
    const varNames = []
    let defaultWarehouse = null
    let defaultWarehouseName = ""
    const buildInputStrings = []
    const nativeBuildInputStrings = []
    const computed = {}
    const nixValues = {}
    const warehouses = {}
    const packages = {}

    const uniqueVarValues = Object.fromEntries(Object.entries(frequencyCountOfVarNames).filter(([eachName, eachCount])=>eachCount==1))
    const nonUniqueVarNames = Object.entries(frequencyCountOfVarNames).filter(([eachName, eachCount])=>eachCount!=1).map((eachName, eachCount)=>eachName)
    const nonUniqueVarValuesSoFar = {}
    const nixVarsAtThisPoint = ()=>`\n${Object.entries(nonUniqueVarValuesSoFar).map(([eachVarName, eachNixString])=>`${eachVarName} = ${indent({ string: eachNixString, by: "    ", noLead: true })};`).join("\n")}`
    const saveNixVar = (varName, varNixValue)=>{
        varNames.push(varName)
        // if its going to end up unique, store it in the uniqueVarValues
        const storageLocation = uniqueVarValues[varName] ? uniqueVarValues : nonUniqueVarValuesSoFar
        const varsSoFar = nixVarsAtThisPoint().trim()
        if (varsSoFar.length == 0) {
            storageLocation[varName] = `${indent({ string: varNixValue, by: "    ", noLead: true })}`
        } else {
            storageLocation[varName] = `(
                let
                    ${indent({ string: nixVarsAtThisPoint(), by: "                    ", noLead: true })}
                in
                    ${indent({ string: varNixValue, by: "                    ", noLead: true })}
            )`.replace(/\n            /g,"\n")
        }
    }
    const warehouseAsNixValue = (values)=> {
        const nixCommitHash = values.createWarehouseFrom.nixCommitHash
        const tarFileUrl = values.createWarehouseFrom.tarFileUrl || `https://github.com/NixOS/nixpkgs/archive/${nixCommitHash}.tar.gz`
        const warehouseArguments = values.arguments || {}
        return `(_-_core.import
            (_-_core.fetchTarball
                ({url=${JSON.stringify(tarFileUrl)};})
            )
            (${indent({ string: escapeNixObject(warehouseArguments), by: "            ", noLead: true})})
        )`.replace(/\n        /g,"\n")
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
            // if is will end up being a unique name
            saveNixVar(varName, warehouseAsNixValue(values))
            // save defaultWarehouse name
            if (kind == "(defaultWarehouse)") {
                defaultWarehouseName = varName
                defaultWarehouse = warehouses[varName]
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
            let resultAsValue
            if (values.builtinDenoEval) {
                resultAsValue = eval(values.builtinDenoEval)
            } else {
                const packages = values.withPackages || []
                const whichWarehouse = values.fromWarehouse || defaultWarehouse
                const tarFileUrl = warehouses[whichWarehouse.name].tarFileUrl // TODO: there's a lot of things that could screw up here, add checks/warnings for them
                const escapedArguments = 'NO_COLOR=true '+values.runCommand.map(each=>`'${shellApi.escapeShellArgument(each)}'`).join(" ")
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
                try {
                    resultAsValue = JSON.parse(resultAsJson)
                } catch (error) {
                    throw Error(`There was an error with the output of this command: ${commandForDebugging}\nThe output needs to be a valid JSON string, but there was an error while parsing the string: ${error}\n\nStandard output of the command was: ${JSON.stringify(resultAsJson)}`)
                }
            }
            computed[varName] = resultAsValue
            saveNixVar(varName, escapeNixObject(resultAsValue))
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
            } else if (values.onlyIf instanceof NixValue) {
                // TODO values.onlyIf  !!nix
                throw Error(`
                    Sorry the !!nix part isn't supported yet in the beta
                    For this value:
                        - ${kind}:
                            onlyIf: !!nix ${values.onlyIf.asString}
                `)
            // string 
            } else if (values.onlyIf) {
                const onlyIfString = values.onlyIf.name || values.onlyIf
                throw Error(`
                    

                    Inside a system_tools.yaml file
                    For this value:
                        - ${kind}:
                            # [stuff]
                            onlyIf: ${onlyIfString}
                    
                    You might have been wanting this:
                        - ${kind}:
                            # [stuff]
                            onlyIf: !!computed ${onlyIfString}
                    
                    
                `.replace(/\n                    /g,"\n"))
            }

            
            // 
            // get nix-value
            // 
            const source = values.from || defaultWarehouse
            let nixValue
            if (values.load instanceof NixValue) {
                nixValue = `(${values.load.asString})`
            } else if (source instanceof WarehouseVar || source instanceof ComputedVar || source instanceof PackageVar) {
                const loadAttribute = values.load.map(each=>escapeNixString(each)).join(".")
                nixValue = `${source.name}.${loadAttribute}`
            // from a hash/url directly
            } else {
                const loadAttribute = values.load.map(each=>escapeNixString(each)).join(".")
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
                packages[varName] = values
                saveNixVar(varName, nixValue)
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
            if (source instanceof WarehouseVar || source instanceof ComputedVar || source instanceof PackageVar) {
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
            nixValues[varName] = values
            saveNixVar(varName, nixValue)
        }
    }
    
    // TODO: validate that all varNames are actually valid variable names 

    // 
    // library paths for all packages
    // 
    let libraryPathsString = ""
    let packagePathStrings = ""
    for (const [varName, value] of Object.entries(packages)) {
        libraryPathsString += `"${varName}" = _-_core.lib.makeLibraryPath [ ${varName} ];\n`
        packagePathStrings += `"${varName}" = ${varName};\n`
    }
    
    return {
        defaultWarehouse,
        computed,
        nixValues,
        warehouses,
        packages,
        string: `
        let
            #
            # create a standard library for convienience 
            # 
            _-_core = (
                let
                    frozenStd = (builtins.import 
                        (builtins.fetchTarball
                            ({url="https://github.com/NixOS/nixpkgs/archive/ce6aa13369b667ac2542593170993504932eb836.tar.gz";})
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
            # 
            # Packages, Vars, and Compute
            #
            #\n${Object.entries(uniqueVarValues).map(
                ([eachVarName, eachNixString])=>
                    `            ${eachVarName} = ${indent({ string: eachNixString, by: "            ", noLead: true })};`
            ).join("\n")}
            #
            # var names that were assigned more than once
            #${indent({ string: nixVarsAtThisPoint(), by: "            ", noLead: true })}
            #
            # nix shell data
            #
                _-_nixShellEscapedJsonData = (
                    let 
                        nixShellDataJson = (_-_core.toJSON {
                            libraryPaths = {\n${indent({string:libraryPathsString, by: "                                ",})}
                            };
                            packagePaths = {\n${indent({string:packagePathStrings, by: "                                ",})}
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
        in
            _-_core.mkShell {
                # inside that shell, make sure to use these packages
                buildInputs =  [\n${indent({
                        string: [...new Set(buildInputStrings)].join("\n"),
                        by: "                    ",
                    })}
                ];
                
                nativeBuildInputs = [\n${indent({
                        string: [...new Set(nativeBuildInputStrings)].join("\n"),
                        by: "                    ",
                    })}
                ];
                
                # run some bash code before starting up the shell
                shellHook = "
                    export VIRKSHOP_NIX_SHELL_DATA='\${_-_nixShellEscapedJsonData}'
                ";
            }
        `.replace(/\n        /g,"\n"),
    }
}