import { FileSystem } from "https://deno.land/x/quickr@0.4.2/main/file_system.js"
import { run, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } from "https://deno.land/x/quickr@0.4.1/main/run.js"
import { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.4.1/main/console.js"
import { indent, findAll } from "https://deno.land/x/good@0.5.1/string.js"


// 
// 
// Main
// 
// 
let debuggingMode = false
const virkshopIdentifierPath = `#mixins/virkshop/settings/virkshop/` // The only thing that can basically never change
export const createVirkshop = async (arg)=>{
    var { virkshopPath, projectPath } = {...arg}
    virkshopPath = virkshopPath || Console.env.VIRKSHOP_FOLDER         // env var is used when already inside of the virkshop
    projectPath  = projectPath  || Console.env.VIRKSHOP_PROJECT_FOLDER // env var is used when already inside of the virkshop

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
                    commands:         { get() { return `${virkshop.pathTo.mixture}/commands` }},
                    _nixBuildShell:   { get() { return `${virkshop.pathTo.mixins}/virkshop/commands/virkshop/nix_build_shell` }},
                    _tempNixShellFile:{ get() { return `${virkshop.pathTo.temporary}/short_term/virkshop/shell.nix` }},
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
                homeMappingObject: {},
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
                            
                            virkshop._internal.shellSetupPriorities.push([ this.source, `${name}='${escapeShellArgument(value)}'` ])
                        },
                        injectUsersCommand(commandName) {
                            virkshop._internal.deadlines.beforeEnteringVirkshop.push(((async ()=>{
                                const pathThatIsHopefullyGitIgnored = `${virkshop.pathTo.temporary}/long_term/${this.eventName}/${this.mixinName}/${commandName}`
                                const commandPath = `${virkshop.pathTo.commands}/${commandName}`
                                
                                await FileSystem.ensureIsFile(pathThatIsHopefullyGitIgnored)
                                
                                try {
                                    await FileSystem.remove(commandPath)
                                    // FIXME: relativeLink isnt actually being forceful
                                    await FileSystem.relativeLink({
                                        existingItem: pathThatIsHopefullyGitIgnored,
                                        newItem: commandPath,
                                        overwrite: true,
                                        force: true,
                                    })
                                } catch (error) {
                                    
                                }
                                
                                // TODO: there's a lot that could be optimized here since system commands are slow.
                                // Note: this command is intentionally never awaited because it only needs to be done by the time nix-shell starts, which takes multiple orders of magnitude more time (not awaiting lets it be done in parallel)
                                run("command", "-v", commandName, Out(returnAsString)).then(async (absolutePathToCommand)=>{
                                    if (absolutePathToCommand) {
                                        await FileSystem.write({
                                            path: pathThatIsHopefullyGitIgnored,
                                            data: `#!/usr/bin/env bash\nHOME='${escapeShellArgument(virkshop.pathTo.realHome)}' PATH='${escapeShellArgument(Console.env.PATH)}' ${absolutePathToCommand} "$@"`,
                                            overwrite: true,
                                        })
                                    }
                                })
                            })()))
                        },
                        linkRealHomeFor(path) {
                            // use this:
                            virkshop._internal.homeMappingObject
                            
                            // FIXME: implement
                                // create path in real home folder if it doesn't exist
                        },
                    }
                },
                shellProfileString: `
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
            },
            _stages: {
                // 
                // 
                // phase 0: "prep" creates/discovers basic virkshop structure (establish linked files/folders, clean broken links)
                // 
                // 
                async phase0(mixinPaths) {
                    debuggingMode && console.log("[Phase0: Establishing/Verifying Structure]")
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    
                    // 
                    // find hard home files (so they can be protected)
                    // 
                    for await (const eachHomePath of FileSystem.recursivelyIteratePathsIn(virkshop.pathTo.fakeHome, { dontFollowSymlinks: true, onlyHardlinks: true, })) {
                        const shortButUnique = FileSystem.normalize(FileSystem.makeRelativePath({
                            from: virkshop.pathTo.fakeHome,
                            to:eachHomePath,
                        }))
                        virkshop._internal.homeMappingObject[shortButUnique] = { isHardpath: true }
                    }
                    
                    // TODO: purge broken system links more
                    
                    // 
                    // let mixins symlinks finish in any order (efficient), but all of them need to be done before phase 1 starts
                    // 
                    await Promise.all(mixinPaths.map(async eachPath=>{
                        const mixinName = FileSystem.basename(eachPath)
                        for (const eachSpecialFolder of virkshop.structure.specialMixinFolders) {
                            if (FileSystem.basename(eachSpecialFolder) == 'home') {
                                // FIXME: home folder needs to be treated differently
                                continue
                            }
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
                    await Promise.all(Object.entries(virkshop.options.linkToProject).map(async ([whereInProject, whereInVirkshop])=>{
                        
                        const sourcePath = `${virkshop.pathTo.virkshop}/${whereInVirkshop.replace(/^\$VIRKSHOP_FOLDER/g,"./")}`
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
                    debuggingMode && console.log("[Phase1: Mixins Setup]")
                    mixinPaths = mixinPaths || await FileSystem.listPathsIn(virkshop.pathTo.mixins)
                    const alreadExecuted = new Set()
                    const phase1Promises = []
                    for (const eachMixinPath of mixinPaths) {
                        const mixinName = FileSystem.basename(eachMixinPath)
                        const eventName = "before_setup"
                        // 
                        // let the mixin link everything within itself
                        // 
                        const parentFolderString = `${eachMixinPath}/events/virkshop/${eventName}`
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
                                            if (eachItem.path.match(/\.deno\.js$/)) {
                                                const uniquePath = await FileSystem.finalTargetOf(eachItem.path)
                                                if (!alreadExecuted.has(uniquePath)) {
                                                    alreadExecuted.add(uniquePath)
                                                    // puts things inside of virkshop._internal.deadlines
                                                    await virkshop.importDeadlinesFrom({
                                                        path: eachItem.path,
                                                        source: eachItem.path.slice(parentFolderString.length),
                                                        mixinName,
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
                                debuggingMode && console.log(`     [${duration}ms: setting up ${mixinName}]`)
                            }
                        )
                        phase1Promises.push(selfSetupPromise)
                        
                        // 
                        // kick-off work for phase2 so that it runs ASAP
                        // 
                        virkshop._internal.deadlines.beforeShellScripts.push(selfSetupPromise.then(async ()=>{
                            // read the the before_login files as soon as possible
                            const eventName = `during_setup`
                            const parentFolderString = `${eachMixinPath}/events/virkshop/${eventName}/`
                            const files = await FileSystem.listFilePathsIn(parentFolderString)
                            await Promise.all(files.map(async eachPath=>{
                                if (eachPath.match(/\.deno\.js$/)) {
                                    // puts things inside of virkshop._internal.deadlines
                                    await virkshop.importDeadlinesFrom({
                                        path: eachPath,
                                        source: eachPath.slice(parentFolderString.length),
                                        mixinName,
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
                    await Promise.all(phase1Promises.concat(virkshop._internal.deadlines.beforeSetup))
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
                    debuggingMode && console.log("[Phase2: Nix+Zsh Setup]")
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
                            let shellProfileString = virkshop._internal.shellProfileString
                            
                            // 
                            // add project commands
                            // 
                            shellProfileString += `
                                #
                                # inject project's virkshop commands
                                #
                                export PATH='${escapeShellArgument(virkshop.pathTo.commands)}:'"$PATH"
                            `.replace(/\n */g,"\n")

                            // 
                            // add during_setup scripts
                            // 
                            await Promise.all(virkshop._internal.deadlines.beforeShellScripts)
                            virkshop._internal.sortPrioitiesByPath(virkshop._internal.shellSetupPriorities , ([eachSource, ...otherData])=>eachSource)
                            for (const [eachSource, eachContent] of virkshop._internal.shellSetupPriorities) {
                                // TODO: add a debugging echo here if debuggingMode
                                shellProfileString += `\n#\n# ${eachSource}\n#\n${eachContent}\n`
                            }

                            // 
                            // add project commands again
                            // 
                            shellProfileString += `
                                #
                                # inject project's virkshop commands
                                #
                                export PATH='${escapeShellArgument(virkshop.pathTo.commands)}:'"$PATH"
                            `.replace(/\n */g,"\n")
                            // 
                            // make folders work as recursive commands
                            // 
                            for (const eachFolderPath of await FileSystem.listFolderPathsIn(virkshop.pathTo.commands)) {
                                const name = escapeShellArgument(FileSystem.basename(eachFolderPath))
                                shellProfileString += `
                                    # 
                                    # command for ${name} folder
                                    # 
                                        '${name}' () {
                                            # enable globbing
                                            setopt extended_glob &>/dev/null
                                            shopt -s globstar &>/dev/null
                                            shopt -s dotglob &>/dev/null
                                            local search_path='${escapeShellArgument(FileSystem.makeAbsolutePath(eachFolderPath))}'
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
                                            local commands_path='${escapeShellArgument(virkshop.pathTo.commands)}'
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
                                `.replace(/\n                                    /g, "\n")
                                
                            }
                            
                            const autogeneratedPath = `${FileSystem.parentPath(shellApi.profilePath)}/${shellApi.autogeneratedProfile}`
                            const relativeAutogeneratedPath = FileSystem.makeRelativePath({
                                from: virkshop.pathTo.project,
                                to: autogeneratedPath,
                            })
                            await FileSystem.info(shellApi.profilePath).then(async (itemInfo)=>{
                                if (!itemInfo.exists) {
                                    await FileSystem.write({
                                        path: shellApi.profilePath,
                                        data: `
                                            . '${escapeShellArgument(relativeAutogeneratedPath)}'
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
                                            // create the shortcut
                                            await FileSystem.relativeLink({
                                                existingItem: mixinItem.path,
                                                newItem: targetLocation.path,
                                                overwrite: true,
                                            })
                                        }
                                        // TODO: consider another edgecase of mixin item being a file, but existing item being a folder
                                    }
                                }

                            }))
                        })()),
                        
                    ])
                    var duration = (new Date()).getTime() - startTime; var startTime = (new Date()).getTime()
                    debuggingMode && console.log(`     [${duration}ms creating shell profile and shell.nix]`)
                    
                    // 
                    // finish dynamic setup
                    // 
                    await Promise.all(virkshop._internal.deadlines.beforeEnteringVirkshop)
                    // make all commands executable
                    
                    const permissionPromises = []
                    for await (const eachCommandPath of FileSystem.recursivelyIteratePathsIn(virkshop.pathTo.commands)) {
                        permissionPromises.push(
                            FileSystem.addPermissions({path: eachCommandPath, permissions: { owner: {canExecute: true} }})
                        )
                    }
                    await Promise.all(permissionPromises)
                    
                    
                    // 
                    // run nix-shell
                    // 
                    const envVars = {
                        _shell_start_time: `${startTime}`,
                        VIRKSHOP_FOLDER: virkshop.pathTo.virkshop,
                        VIRKSHOP_PROJECT_FOLDER: virkshop.pathTo.project,
                        VIRKSHOP_HOME: virkshop.pathTo.fakeHome,
                        VIRKSHOP_USERS_HOME: virkshop.pathTo.realHome,
                        VIRKSHOP_DEBUG: `${debuggingMode}`,
                        NIX_SSL_CERT_FILE: Console.env.NIX_SSL_CERT_FILE,
                        NIX_BUILD_SHELL: virkshop.pathTo._nixBuildShell, // TODO: clean this up (hardcoded to ZSH, and ignores nix-shell arguments)
                        HOME: virkshop.pathTo.fakeHome,
                        PATH: Console.env.PATH,
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
                        Env(envVars),
                    )
                    // TODO: call all the on_quit scripts
                },
            },
            async trigger(eventPath) {
                let promises = []
                const eventPathInfo = await FileSystem.info(eventPath)
                if (eventPathInfo.isFolder) {
                    const paths = await FileSystem.recursivelyListPathsIn(eventPath)
                    paths.sort((each1, each2) => each1.localeCompare(each2))
                    // FIXME: pad out the 0's to make the numbers equal lengths
                    for (const eachPath of paths) {
                        // FIXME: import the .deno.js files instead of executing them
                        // if (eachPath.endsWith(".deno.js")) {
                        //     // convert them to a hex string then put them in a import statement and eval it
                        //     FileSystem.read(eachPath)
                        // }
                        await run`${eachPath}`
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
                                    source,
                                    mixinName,
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
                    return JSON.parse(Deno.readTextFileSync(virkshop.pathTo.virkshopOptions))
                },
            },
        },
    )
    
    debuggingMode = virkshop.options.debuggingMode
    return virkshop
}
export const virkshop = await createVirkshop()

// 
// shellApi
// 
const shellApi = Object.defineProperties(
    {
        autogeneratedProfile: `.zshrc.autogenerated.ignore`,
        startCommand: "zsh --no-globalrcs",
    },
    {
        profilePath:         { get() { return `${virkshop.pathTo.fakeHome}/.zshrc` } },
    },
)


// 
// 
// Helpers
// 
// 
    function escapeShellArgument(string) {
        return string.replace(/'/g, `'"'"'`)
    }

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

// 
// fornixToNix
// 
export const fornixToNix = async function(yamlString) {
    // TODO: add support for overwriting values (saveAs: python, then saveAs: python without breaking)
    // TODO: make __core__ not be a name, just insert it everywhere using "let,in"
    const start = (new Date()).getTime()
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
                try {
                    resultAsValue = JSON.parse(resultAsJson)
                } catch (error) {
                    throw Error(`There was an error with the output of this command: ${commandForDebugging}\nThe output needs to be a valid JSON string, but there was an error while parsing the string: ${error}\n\nStandard output of the command was: ${JSON.stringify(resultAsJson)}`)
                }
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
        `.replace(/\n        /g,"\n"),
    }
}