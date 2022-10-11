cd $_PWD
unset _PWD
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