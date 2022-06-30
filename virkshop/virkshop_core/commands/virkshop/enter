#!/usr/bin/env -S bash --norc --noprofile

# summary
    # unlike the start command, this one has access to a standardized version of deno and bash
    # similar to the previous command, it has access to external environment variables
# what this script does:
    # (check that VIRKSHOP_FOLDER exists)
    # phase 0: establish linked files/folders, clean broken links
    # phase 1: isolated setup (cant use other extensions)
    # phase 2: pre_shell setup (can use commands created by extensions)
    # phase 3: start shell/virkshop 

# if env variable doesn't exist
if [ -z "$VIRKSHOP_FOLDER" ]
then
    echo 'Howdy!'
    echo ''
    echo 'This is the entry_point script of the virkshop speaking (just FYI)'
    echo 'So I started but there wasn`t a VIRKSHOP_FOLDER variable'
    echo 'Normally the virkshop/start command is what calls this entry_point'
    echo 'and it sets up a VIRKSHOP_FOLDER among other things'
    echo 'so probably don`t try running this directly unless you really know what you`re doing'
    echo ''
    echo 'if you have no idea why you`re getting this message, I would guess the virkshop'
    echo 'folder is corrupt. So the next step would be to restore it from the github virkshop repo'
    echo 'and then run virkshop/start'
    exit
fi
# if the folder itself doesn't exist
if ! [ -d "$VIRKSHOP_FOLDER" ]
then
    echo 'Howdy!'
    echo ''
    echo 'This is the entry_point script of the virkshop speaking (just FYI)'
    echo 'Bit of a problem the VIRKSHOP_FOLDER:'
    echo '      '"$VIRKSHOP_FOLDER" 
    echo "doesn't seem to exist (or at least not as a folder)"
    echo ''
    echo 'if you have no idea why you`re getting this message, I would guess the virkshop'
    echo 'folder is corrupt. So the next step would be to restore it from the github virkshop repo'
    echo 'and then run virkshop/start'
    exit
fi

# 
# 
# Phase 0: link everything!
# 
# 
    # first: link out 
    commands="$(      cat "$VIRKSHOP_FOLDER/mixins/#core/settings/virkshop/externally_link/commands"       )"
    documentation="$( cat "$VIRKSHOP_FOLDER/mixins/#core/settings/virkshop/externally_link/documentation"  )"
    events="$(        cat "$VIRKSHOP_FOLDER/mixins/#core/settings/virkshop/externally_link/events"         )"
    home="$(          cat "$VIRKSHOP_FOLDER/mixins/#core/settings/virkshop/externally_link/home"           )"
    settings="$(      cat "$VIRKSHOP_FOLDER/mixins/#core/settings/virkshop/externally_link/settings"       )"
    project="$(       cat "$VIRKSHOP_FOLDER/mixins/#core/settings/virkshop/externally_link/mixins/project" )"
    
    
    # copy out
    #     commands
    #     documentation
    #     events
    #     settings
    if ! [ -e "$path_to_project/commands" ]
    then
        "$relative_link" "$path_to_commands" "$path_to_project/commands"
    fi
    if ! [ -e "$path_to_project/documentation" ]
    then
        "$relative_link" "$path_to_documentation" "$path_to_project/documentation"
    fi
    if ! [ -e "$path_to_project/events" ]
    then
        "$relative_link" "$path_to_events" "$path_to_project/events"
    fi
    if ! [ -e "$path_to_project/settings" ]
    then
        "$relative_link" "$path_to_settings" "$path_to_project/settings"
    fi
    # 
    # clean out
    # 
        # FIXME: run purge_system_links on folders
    
# 
# Phase 1
# 
    # 
    # let the mixins set themselves up
    # 
        "$path_to_virkshop_tools/actions/start_phase_1"
    
    # 
    # once theyve created their peices, connect them to the larger outside system
    # 
        "$path_to_virkshop_tools/actions/setup_mixins"
        "$path_to_virkshop_tools/actions/ensure_all_commands_executable"
        # make all events executable
        chmod -R ugo+x "$path_to_commands" &>/dev/null || sudo chmod -R ugo+x "$path_to_commands" &>/dev/null
    # 
    # link all home files into the temp home
    # 
        rm -rf "$path_to_temp_home"
        mkdir -p "$path_to_temp_home"
        # this loop is so stupidly complicated because of many inherent-to-shell reasons, for example: https://stackoverflow.com/questions/13726764/while-loop-subshell-dilemma-in-bash
        for_each_item_in="$path_to_home"; [ -z "$__NESTED_WHILE_COUNTER" ] && __NESTED_WHILE_COUNTER=0;__NESTED_WHILE_COUNTER="$((__NESTED_WHILE_COUNTER + 1))"; trap 'rm -rf "$__temp_var__temp_folder"' EXIT; __temp_var__temp_folder="$(mktemp -d)"; mkfifo "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER"; (find "$for_each_item_in" -maxdepth 1 ! -path "$for_each_item_in" -print0 2>/dev/null | sort -z > "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER" &); while read -d $'\0' each
        do
            "$relative_link" "$path_to_home/$each" "$path_to_temp_home/$each"
        done < "$__temp_var__temp_folder/pipe_for_while_$__NESTED_WHILE_COUNTER";__NESTED_WHILE_COUNTER="$((__NESTED_WHILE_COUNTER - 1))"
# 
# Phase 2
# 
    . "$trigger" "$path_to_events/virkshop/phase_2"

# 
# let the .zshrc start phase 3
# 
    if [ "$VIRKSHOP_DEBUG" = "on" ]; then
        echo "Prepping for phase3"
        echo "    switching from Bash to Zsh"
        echo "    changing HOME to temp folder for nix-shell"
        echo "    (Tools/Commands mentioned in 'system_tools.toml' will become available)"
    fi
    HOME="$path_to_temp_home" nix-shell --pure --command "zsh" "$path_to_mixins/nix/internals/shell.nix"
    if [ "$VIRKSHOP_DEBUG" = "on" ]; then
        echo "    (Tools/Commands mentioned in 'system_tools.toml' are no longer available/installed)"
        echo "    switched from Zsh back to Bash"
        echo "end of phase 3"
    fi