import { FileSystem, glob } from "https://deno.land/x/quickr@0.6.14/main/file_system.js"
import { Console } from "https://deno.land/x/quickr@0.6.14/main/console.js"
import * as yaml from "https://deno.land/std@0.82.0/encoding/yaml.ts"
const { virkshop } = await FileSystem.walkUpImport("virkshop/@core/virkshop.js")

export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        // FIXME: setup hooks

            // # 
            // # hooks
            // #
            // __temp_var_githooks_folder="$__THIS_FORNIX_EXTENSION_FOLDERPATH__/hooks"
            // # if the folder exists
            // if [[ -d "$__temp_var_githooks_folder" ]]
            // then
            //     # iterate over the files
            //     for dir in $(find "$__temp_var_githooks_folder" -maxdepth 1)
            //     do
            //         git_file="$FORNIX_FOLDER/.git/hooks/$(basename "$dir")"
            //         # ensure all the git hook files exist
            //         mkdir -p "$(dirname "$git_file")"
            //         touch "$git_file"
            //         # make sure each calls the hooks # FIXME: some single quotes in $dir probably need to be escaped here
            //         cat "$git_file" | grep "#START: fornix hooks" &>/dev/null || echo "
            //         #START: fornix hooks (don't delete unless you understand)
            //         if [ -n "'"$FORNIX_FOLDER"'" ]
            //         then
            //             absolute_path () {
            //                 "'
            //                 echo "$(builtin cd "$(dirname "$1")"; pwd)/$(basename "$1")"
            //                 '"
            //             }
            //             for hook in "'$'"(find "'"$FORNIX_FOLDER"'"'/settings/extensions/git/hooks/$(basename "$dir")/' -maxdepth 1)
            //             do
            //                 # check if file exists
            //                 if [ -f "'"$hook"'" ]
            //                 then
            //                     hook="'"$(absolute_path "$hook")"'"
            //                     chmod ugo+x "'"'"\$hook"'"'" &>/dev/null || sudo chmod ugo+x "'"'"\$hook"'"'"
            //                     "'"'"\$hook"'"'" || echo "'"'"problem running: \$hook"'"'"
            //                 fi
            //             done
            //         fi
            //         #END: fornix hooks (don't delete unless you understand)
            //         " >> "$git_file"
            //         # ensure its executable
            //         chmod ugo+x "$git_file" &>/dev/null || sudo chmod ugo+x "$git_file"
            //     done
            // fi
    },
}
