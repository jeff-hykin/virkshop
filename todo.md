
# pre-alpha:
- have virkshop/enter do the basics of
    - DONE: generate the #mixture
    - DONE: generate the .zshrc file
    - DONE convert the system_tools.yaml into a nix file using deno
        - convert the warehouses using the template, and concat
        - convert the packages using the template, and concat
        - create a javascript value to nix value converter
            - figure out how to escape js string into a nix string
            - recusrive method for converting objects into nix-attribute sets
        - figure out how to escape the attribute paths for packages
        - keep track of packages that are native build inputs or regular build inputs
        - generate the mkshell at the end
    - DONE run the nix-shell command with the generated nix.shell
    - DONE create a new fix for getting package paths
        need to keep track of paths when generating yaml file
        add another field to the (package) that allows a package to export
        env vars, which can be done in the shellHook
        `__core__.lib.main.makeLibraryPath [ __core__.pkgs.${attributePath} ]`
        packagePathsAsJson = (main.toJSON
            ({
                packagePathFor = depedencyPackages;
                libPathFor = (main.listToAttrs
                    (main.map
                        (each:
                            ({
                                name = each.name;
                                value = "${main.makeLibraryPath [ each.value ]}";
                            })
                        )
                        (tomlAndBuiltinPackagesWithSources)
                    )
                );
            })
        );
    - DONE get `nano` command to work
        - implement injectUsersCommand()
    - get the home folder to link to `.cache/nix` and the deno cache
        - implement linkRealHomeFor()
    - add commands to path (use deno to make them executable, use deno to make the zsh function for each folder)
        ```
        # 
        # create aliases for all of the folders to allow recursive execution
        # 
        # yes its ugly, welcome to bash programming
        # this loop is so stupidly complicated because of many inherent-to-shell reasons, for example: https://stackoverflow.com/questions/13726764/while-loop-subshell-dilemma-in-bash
        for_each_item_in="$FORNIX_COMMANDS_FOLDER"
        [ -z "$__NESTED_WHILE_COUNTER" ] && __NESTED_WHILE_COUNTER=0;__NESTED_WHILE_COUNTER="$((__NESTED_WHILE_COUNTER + 1))"; trap 'rm -rf "$__temp_var__temp_folder"' EXIT; __temp_var__temp_folder="$(mktemp -d)"; mkfifo "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER"; (find "$for_each_item_in" -maxdepth 1 ! -path . -print0 2>/dev/null | sort -z > "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER" &); while read -d $'\0' each
        do
            # if its a folder
            if [[ -d "$each" ]]
            then
                name="$(basename "$each")"
                eval '
                '"$name"' () {
                    # enable globbing
                    setopt extended_glob &>/dev/null
                    shopt -s globstar &>/dev/null
                    shopt -s dotglob &>/dev/null
                    local search_path='"'""$("$FORNIX_FOLDER/settings/extensions/#standard/commands/tools/string/escape_shell_argument" "$each")"'/'"'"'
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
                                        printf "\nThat is a sub folder, not a command\nValid sub-commands are\n" 1>&2
                                        ls -1FL --group-directories-first --color "$each" | sed '"'"'s/^/    /'"'"' | sed -E '"'"'s/(\*|@)$/ /'"'"' 1>&2
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
                        printf "\nI could not find that sub-command\n" 1>&2
                    fi
                    printf "Valid next-arguments would be:\n" 1>&2
                    ls -1FL --group-directories-first --color "$search_path" | sed '"'"'s/^/    /'"'"' | sed -E '"'"'s/(\*|@)$/ /'"'"' 1>&2
                    return 1 # error, no command
                }
                __autocomplete_for__'"$name"' () {
                    local commands_path='"'""$("$FORNIX_FOLDER/settings/extensions/#standard/commands/tools/string/escape_shell_argument" "$FORNIX_COMMANDS_FOLDER")""'"'
                    # TODO: make this space friendly
                    # TODO: make this do partial-word complete 
                    function join_by { local d=${1-} f=${2-}; if shift 2; then printf %s "$f" "${@/#/$d}"; fi; }
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
                compdef __autocomplete_for__'"$name"' '"$name"'
                ' > /dev/null
            fi
        done < "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER";__NESTED_WHILE_COUNTER="$((__NESTED_WHILE_COUNTER - 1))"
        ```
    - fix problem with linked folders
    - DONE load all the env vars

- reconsider having the .zshrc always generated (generate 1 other file and have a .zshrc that is synced)
- DONE rename events

- get git ignore to work 
- purge/clean event
- allow loading advanced nix code

# beta
- cli "virkshop/install [package name]"
- make a way to change shells (implement a javascript API for Zsh shell)
old todo:

- create `virkshop.appendToEnvVar`
    - will need a way to save/seralize data
        - add a hidden getter that maps to a json file inside of short term temp
    - create `setEnvVar()`
        - add a process as the very first .zsh script, have it be dynamically generated by a deno script
            - handle defining env vars
    - create `appendToEnvVar()`
    - create `prependToEnvVar()`
    - make those functions give an error if they're executed inside the Virkshop itself (or come up with a complex system of writing to another file and having zsh source that file after every execution)
- inline all the startup scripts
    - generate a single .zshrc file
    - for each .zsh file, inline it
    - for all other files, just try running them
- do custom work for the home mixin
    - notify user about potential conflicts
    - notify mixins if they attempt to use something like `.bashrc`
- create `addToGitignore()` function
- mixin tools
    - redo the startup message
    - have nix_tools use deno to link to the nix profile real-home, then 
    - fix git hooks
- figure out how to combine the nix file from individual mixins
- `triggerEvent()` function
- `wrapExecutable()` function for sudo, vim, and the like
- `appendToEnvVar()`
- `zshrc()`
- standardize and publish a deno FileSystem lib
- standardize and publish a deno Virkshop lib
- consider having a background deno task for faster execution times of scripts
- consider verifying the structure (broken links) as a background task after the shell starts
- make the nix install check faster
- make enter rewrite itself (and ignore changes) after a user successfully runs it once. Have the rewrite change the hashbang