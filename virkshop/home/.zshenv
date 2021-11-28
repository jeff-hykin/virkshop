# don't let zsh update itself without telling all the other packages 
# instead use nix to update zsh
DISABLE_AUTO_UPDATE="true"
DISABLE_UPDATE_PROMPT="true"

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
files_to_execute="$("$VIRKSHOP_FOLDER/internals/tools/sorted_colon_list.js" "$VIRKSHOP_FOLDER/events/phase_3" '(?<!.zsh)$')"
files_to_source="$("$VIRKSHOP_FOLDER/internals/tools/sorted_colon_list.js" "$VIRKSHOP_FOLDER/events/phase_3" '.zsh$')"
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