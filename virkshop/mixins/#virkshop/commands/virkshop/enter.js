#!/usr/bin/env -S deno run --allow-all

// summary
    // unlike the start command, this one has access to a standardized version of deno and bash
    // similar to the previous command, it has access to external environment variables
// what this script does:
    // (check that VIRKSHOP_FOLDER exists)
    // phase 0: establish linked files/folders, clean broken links
    // phase 1: isolated setup (cant use other extensions)
    // phase 2: pre_shell setup (can use commands created by extensions)
    // phase 3: start shell/virkshop 

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
            object[camelCase(each.name)] = await FileSystem.read(each.path)
        // if its a folder convert it to an object
        } else if () {
            object[camelCase(each.name)] = await objectifyFolder(each.path)
        }
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
    }
}

// todo
    // link things externally
    // link the mixins into virkshop
    // make all commands executable
    // read a config to get loading order of merged events
        // default placement
        // user override
    // design combination method for mixins trying to request things from other mixins
        // system dependencies (nix toml)
        // adding to gitignore
        // adding a pip module
        // adding a git hook
    // create injection tools
        // home link folder
        // external binary wrap+inject
    // design "affect" methods
        // design data storage for holding these (auto generate a folder of .zshrc_peice's that each get sourced)
        // env variable export (add to path)
        // zsh function defintion
        // adding raw text that will later be sourced by zsh


const virkshop = loadVirkshopData()
// 
// 
// Phase 0: link everything!
// 
//
    for (const each of await FileSystem.listItemsIn(`${VIRKSHOP_FOLDER}/mixins/#virkshop/settings/#virkshop`)) {
        
    }
    
//     // first: link out 
//     commands="$(      cat "$VIRKSHOP_FOLDER/mixins/#virkshop/settings/virkshop/externally_link/commands"       )"
//     documentation="$( cat "$VIRKSHOP_FOLDER/mixins/#virkshop/settings/virkshop/externally_link/documentation"  )"
//     events="$(        cat "$VIRKSHOP_FOLDER/mixins/#virkshop/settings/virkshop/externally_link/events"         )"
//     home="$(          cat "$VIRKSHOP_FOLDER/mixins/#virkshop/settings/virkshop/externally_link/home"           )"
//     settings="$(      cat "$VIRKSHOP_FOLDER/mixins/#virkshop/settings/virkshop/externally_link/settings"       )"
//     project="$(       cat "$VIRKSHOP_FOLDER/mixins/#virkshop/settings/virkshop/externally_link/mixins/project" )"
    
    
//     // copy out
//     //     commands
//     //     documentation
//     //     events
//     //     settings
//     if ! [ -e "$path_to_project/commands" ]
//     then
//         "$relative_link" "$path_to_commands" "$path_to_project/commands"
//     fi
//     if ! [ -e "$path_to_project/documentation" ]
//     then
//         "$relative_link" "$path_to_documentation" "$path_to_project/documentation"
//     fi
//     if ! [ -e "$path_to_project/events" ]
//     then
//         "$relative_link" "$path_to_events" "$path_to_project/events"
//     fi
//     if ! [ -e "$path_to_project/settings" ]
//     then
//         "$relative_link" "$path_to_settings" "$path_to_project/settings"
//     fi
//     // 
//     // clean out
//     // 
//         # FIXME: run purge_system_links on folders
    
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