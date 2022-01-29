# don't let zsh update itself without telling all the other packages 
# instead use nix to update zsh
DISABLE_AUTO_UPDATE="true"
DISABLE_UPDATE_PROMPT="true"


# 
# Get virkshop config
# 
path_to_virkshop_config=""
file_name="virkshop/internals/configuration"
folder_to_look_in="$PWD"
while :
do
    # check if file exists
    if [ -f "$folder_to_look_in/$file_name" ]
    then
        path_to_virkshop_config="$folder_to_look_in/$file_name"
        break
    else
        if [ "$folder_to_look_in" = "/" ]
        then
            break
        else
            folder_to_look_in="$(dirname "$folder_to_look_in")"
        fi
    fi
done
if [ -z "$path_to_virkshop_config" ]
then
    #
    # what to do if file never found
    #
    echo "$(yellow)"
    echo "|-- Problem -------------------------------------------------------------| $(color_reset)" 1>&2
    echo "|                                                                        |" 1>&2
    echo "|    I can't find the virkshop/internals/configuration folder            |" 1>&2
    echo "|    I started looking in your current folder                            |" 1>&2
    echo "|         current directory is: '$PWD'                                 " 1>&2
    echo "|    I also looked in all the parent folders, but couldn't find it       |" 1>&2
    echo "|                                                                        |" 1>&2
    echo "|    todo:                                                               |" 1>&2
    echo "|      - make sure you're in the right folder (likely to be the problem) |" 1>&2
    echo "|      - make sure the virkshop folder isn't corrupted (re-download)     |" 1>&2
    echo "|                                                                        |" 1>&2
    echo "|------------------------------------------------------------------------|" 1>&2
    echo ""
    exit
fi
export VIRKSHOP_FOLDER="$(dirname "$(dirname "$path_to_virkshop_config")")"
export VIRKSHOP_DEBUG="$path_to_virkshop/$(cat "$path_to_virkshop_config/debugging_mode")"


if [ -z "$VIRKSHOP_FOLDER" ]
then
    echo "[from .zshenv] something must be really broken, because I don't see a VIRKSHOP_FOLDER environment variable"
    exit
fi

# source all the phase 3 files
# this loop is so stupidly complicated because of many inherent-to-shell reasons, for example: https://stackoverflow.com/questions/13726764/while-loop-subshell-dilemma-in-bash
if [ "$VIRKSHOP_DEBUG" = "true" ]; then
    echo "triggering: $(basename "$which_folder")"
fi

# get the list of files
files_to_execute="$("$VIRKSHOP_FOLDER/internals/tools/file_system/sorted_colon_list" "$VIRKSHOP_FOLDER/events/virkshop/phase_3" '(?<!.zsh)$')"
files_to_source="$("$VIRKSHOP_FOLDER/internals/tools/file_system/sorted_colon_list" "$VIRKSHOP_FOLDER/events/virkshop/phase_3" '.zsh$')"
# set the IFS to be colons (the only character consistently not allowed in a file name)
IFS=":"
# execute all the non-zsh files
for each in "$files_to_execute"; do
    if [ "$VIRKSHOP_DEBUG" = "true" ]
    then
        echo "    loading: $each"
    fi
    "$each"
done
# source the zsh files
for each in "$files_to_execute"; do
    if [ "$VIRKSHOP_DEBUG" = "true" ]
    then
        echo "    loading: $each"
    fi
    . "$each"
done
unset IFS