#!/usr/bin/env -S deno run --allow-all

// summary
    // unlike the start command, this one has access to a standardized version of deno and bash
    // similar to the previous command, it has access to external environment variables
// what this script does:
    // phase 0: create folder structure (establish linked files/folders, clean broken links)
    // phase 1: import all the .js files of mixins (they can access external ENV vars, and dont have the full env)
    // phase 2: start shell/virkshop, which will run all the zsh scripts

const { run, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo, zipInto, mergeInto, returnAsString, } = await import(`https://deno.land/x/sprinter@0.3.1/index.js`)
const { FileSystem, Console } = await import(`https://deno.land/x/file_system_js@0.0.28/main/deno.js`)
const { vibrance } = (await import('https://cdn.skypack.dev/vibrance@v0.1.33')).default


function camelCase(str) {
    const addedSeperator = str.replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[^a-zA-Z0-9 _.-]/,"_").toLowerCase()
    const words = addedSeperator.split(/[ _.-]+/g)
    const capatalizedWords = words.map(each=>each.replace(/^\w/, (group0)=>group0.toUpperCase()))
    // make the first one lowercase
    capatalizedWords[0] = capatalizedWords[0].toLowerCase()
    return capatalizedWords.join('')
}

const varnamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/
async function objectifyFolder(folder) {
    const object = {}
    for (const each of await FileSystem.listItemsIn(folder)) {
        // ignore many file names for future compatibility
        if (!each.basename.match(varnamePattern)) {
            continue
        }
        // if file, just read it
        if (each.isFile) {
            object[each.name] = await FileSystem.read(each.path)
        // if its a folder convert it to an object
        } else if () {
            object[each.name] = await objectifyFolder(each.path)
        }
    }
}

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

async function loadVirkshopData() {
    // 
    // if the env var doesn't exist something is wrong
    // 
    const VIRKSHOP_FOLDER = Console.env.VIRKSHOP_FOLDER
    if (!VIRKSHOP_FOLDER) {
        Console.explain.error({
            title: `Hmm there doesnt seem to be a VIRKSHOP_FOLDER env variable`,
            body: `
                This is the entry point script of the virkshop speaking (just FYI)

                So I started but there wasn't a VIRKSHOP_FOLDER variable.
                Normally the ${vibrance.cyan("virkshop/start")} command is what calls 
                this entry point and it sets up a VIRKSHOP_FOLDER among other things.
                So probably don't try running this directly unless you really know 
                what you're doing.
            `.replace(/\n            /g, "\n"),
            suggestions: [
                "first try virkshop/start",
                "if you get this message after running virkshop/start that probably means \n"+
                "something is really broken/corrupted. Re-downloading/installing virkshop \n"+
                "might be the best option there",
            ],
        })
        Deno.exit()
    }

    // 
    // if its not a folder something is wrong
    // 
    if (!(await FileSystem.info(VIRKSHOP_FOLDER)).isDirectory) {
        Console.explain.error({
            title: `Hmm the VIRKSHOP_FOLDER doesnt seem to exist O.O`,
            body: `
                This is the entry point script of the virkshop speaking (just FYI)

                I used the VIRKSHOP_FOLDER env variable, which should be auto-created
                By ${vibrance.cyan("virkshop/start")} and that variable contained:
                ${vibrance.cyan(VIRKSHOP_FOLDER)}
                
                But that^ path doesn't seem to lead to a folder
                Its possible something is really broken.
            `.replace(/\n            /g, "\n"),
            suggestions: [
                "if you get this message after running virkshop/start that probably means \n"+
                "something is really broken/corrupted. Re-downloading/installing virkshop \n"+
                "might be the best option there",
            ],
        })
        Deno.exit()
    }

    // 
    // try to load all the settings
    // 
    const settings = await objectifyFolder(`${VIRKSHOP_FOLDER}/mixins/#virkshop/settings/#virkshop`)
    return {
        folder,
        settings,
        structure: {
            fakeHome: `${VIRKSHOP_FOLDER}/temporary/virkshop/home`,
            mixins: {
                linkedFolderNames: ['commands', 'documentation', 'events', 'home', 'settings'],
            }
        },
    }
}

function linkMixinNamespace(path) {
    const mixinName = `${virkshopFolder}/${FileSystem.basename(path)}`
    const specialFolderNames     = virkshop.structure.mixins.linkedFolderNames
    const specialVirkshopPaths   = specialFolderNames.map(each => `${virkshop.folder}/${each}`)
    const specialPaths           = specialFolderNames.map(each => `${path}/${each}`)
    for (const each of specialFolderNames) { // FIXME: home folder needs to be treated differently
        const virkshopFolder = `${virkshop.folder}/${each}`
        const mixinFolder    = `${path}/${each}`
        const namespace      = `${virkshopFolder}/${mixinName}`

        // 
        // create the "namespaced" folder of the file first
        // 
        const namespaceCheck = await FileSystem.info(namespace)
        let needToCreateNamespace = false
        if (!namespaceCheck.exists) {
            needToCreateNamespace = true
        } else if (!namespaceCheck.isSymlink) {
            await FileSystem.remove(namespace)
            needToCreateNamespace = true
        } else {
            const target = FileSystem.makeAbsolutePath(namespaceCheck.target)
            const thisFolder = FileSystem.makeAbsolutePath(mixinFolder)
            if (target != thisFolder) {
                await FileSystem.remove(namespace)
                needToCreateNamespace = true
            }
        }
        // create the namespace
        if (needToCreateNamespace) {
            await FileSystem.relativeLink({existingItem: mixinFolder, newItem: namespace})
        }
    }
}

function linkMixinShortcuts(path) {
    // NOTE: linkMixinNamespace needs to be run for EVERY mixin before shortcuts can run. Otherwise there could be order of operations problems

    const mixinName = `${virkshopFolder}/${FileSystem.basename(path)}`
    const specialFolderNames     = virkshop.structure.mixins.linkedFolderNames
    const specialVirkshopPaths   = specialFolderNames.map(each => `${virkshop.folder}/${each}`)
    const specialPaths           = specialFolderNames.map(each => `${path}/${each}`)
    for (const each of specialFolderNames) {
        const virkshopFolder = `${virkshop.folder}/${each}`
        const mixinFolder    = `${path}/${each}`
        const namespace      = `${virkshopFolder}/${mixinName}`

        // 
        // add all the shortcut links
        // 
        for (const eachPath of await FileSystem.recursivelyListPathsIn(mixinFolder)) {
            const relativePart = eachPath.slice(mixinFolder.length)
            const targetLocation = await FileSystem.info(`${virkshopFolder}/${relativePart}`)
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
                await FileSystem.ensureIsFolder(FileSystem.parent)
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


const virkshop = await loadVirkshopData()

// 
// 
// Phase 0: link everything!
// 
//
    // rule1: never overwrite non-symlink files (in commands/ settings/ etc)
    //        hardlink files are presumably created by the user, not a mixin

    // link virkshop folders up-and-out into the project folder
    const promises = Object.entries(virkshop.settings.link_to_project_root).map(async ([key, value])=>{
        const target = await FileSystem.info(`${virkshop.folder}/../${key}`)
        if (target.isBrokenLink) {
            await FileSystem.remove(target.path)
        }
        // create it, but dont destroy an existing folder (unless its a broken link)
        if (!target.exists)  {
            await FileSystem.relativeLink({existingItem: value, newItem: target.path})
        }
    })

    // 
    // link mixins
    // 
    // FIXME: problem here with priority, what happens if two extensions write to the same location
    //    SOLUTION! this is just like traits/mixins
    //              instead of using a number priority, put all their stuff under a namespace
    //              then attempt to put it outside the namespace
    //                  if there is a conflict, make the command print out "there is a conflict, please specify if you want the command from __ or __"
    //  new FIXME: the above solution doesnt work for the home folder.
    //             maybe add a message any time a .profile or .rc file is added to the home and explain
    //     possible solution: use the project extension to pick one, which can be a combination (concat or pick one or whatever)
    const mixinPaths = await FileSystem.listFolderItemsIn(`${virkshop.folder}/mixins`)
    // namespace
    for (const eachMixin of mixinPaths) {
        await linkMixinNamespace(eachMixin)
    }
    // TODO: purge broken system links more


// 
// Phase 1
// 
    // 
    // let the mixins set themselves up
    // 
    "$path_to_virkshop_tools/actions/start_phase_1"
    
    // 
    // once theyve created their peices, connect them to the larger outside system
    // 
    
    // shortcuts 
    for (const eachMixin of mixinPaths) {
        await linkMixinShortcuts(eachMixin)
    }
    

    // 
    // link stuff into fake home
    // 
    await recursivelyFileLink({
        existingFolder: `${virkshop.folder}/home`,
        targetFolder: virkshop.structure.fakeHome,
    })

    
// // 
// // Phase 1
// // 
//     // 
//     // let the mixins set themselves up
//     // 
//         "$path_to_virkshop_tools/actions/start_phase_1"
    
//     // 
//     // once theyve created their peices, connect them to the larger outside system
//     // 
//         "$path_to_virkshop_tools/actions/setup_mixins"
//         "$path_to_virkshop_tools/actions/ensure_all_commands_executable"
//         # make all events executable
//         chmod -R ugo+x "$path_to_commands" &>/dev/null || sudo chmod -R ugo+x "$path_to_commands" &>/dev/null
//     // 
//     // link all home files into the temp home
//     // 
//         rm -rf "$path_to_temp_home"
//         mkdir -p "$path_to_temp_home"
//         # this loop is so stupidly complicated because of many inherent-to-shell reasons, for example: https://stackoverflow.com/questions/13726764/while-loop-subshell-dilemma-in-bash
//         for_each_item_in="$path_to_home"; [ -z "$__NESTED_WHILE_COUNTER" ] && __NESTED_WHILE_COUNTER=0;__NESTED_WHILE_COUNTER="$((__NESTED_WHILE_COUNTER + 1))"; trap 'rm -rf "$__temp_var__temp_folder"' EXIT; __temp_var__temp_folder="$(mktemp -d)"; mkfifo "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER"; (find "$for_each_item_in" -maxdepth 1 ! -path "$for_each_item_in" -print0 2>/dev/null | sort -z > "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER" &); while read -d $'\0' each
//         do
//             "$relative_link" "$path_to_home/$each" "$path_to_temp_home/$each"
//         done < "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER";__NESTED_WHILE_COUNTER="$((__NESTED_WHILE_COUNTER - 1))"
// // 
// // Phase 2
// // 
//     . "$trigger" "$path_to_events/virkshop/phase_2"

// // 
// // let the .zshrc start phase 3
// // 
//     if [ "$VIRKSHOP_DEBUG" = "on" ]; then
//         echo "Prepping for phase3"
//         echo "    switching from Bash to Zsh"
//         echo "    changing HOME to temp folder for nix-shell"
//         echo "    (Tools/Commands mentioned in 'system_tools.toml' will become available)"
//     fi
//     HOME="$path_to_temp_home" nix-shell --pure --command "zsh" "$path_to_mixins/nix/internals/shell.nix"
//     if [ "$VIRKSHOP_DEBUG" = "on" ]; then
//         echo "    (Tools/Commands mentioned in 'system_tools.toml' are no longer available/installed)"
//         echo "    switched from Zsh back to Bash"
//         echo "end of phase 3"
//     fi