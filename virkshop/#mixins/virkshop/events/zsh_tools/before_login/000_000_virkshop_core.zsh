cd $_PWD
unset _PWD

if [ "$VIRKSHOP_DEBUG" = "true" ]
then
    deno eval 'console.log(`     [${(new Date()).getTime()-Deno.env.get("_shell_start_time")}ms nix-shell]`)'
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