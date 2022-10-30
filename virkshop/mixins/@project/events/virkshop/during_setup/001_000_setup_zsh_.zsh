# AVAILABLE TOOLS:
#     system_tools nix_path_for package $PACKAGE_NAME
#     system_tools nix_lib_path_for package $PACKAGE_NAME
#     deno
# AVAILABLE ENV VARS:
#     VIRKSHOP_FOLDER
#     VIRKSHOP_HOME # same as HOME 
#     VIRKSHOP_PROJECT_FOLDER
#     NIX_SSL_CERT_FILE

# 
# import paths from nix
# 
zsh_syntax_highlighting__path="$(system_tools nix_path_for package zshSyntaxHighlighting)"
zsh_auto_suggest__path="$(       system_tools nix_path_for package zshAutosuggestions)"
spaceship_prompt__path="$(       system_tools nix_path_for package spaceshipPrompt)"
oh_my_zsh__path="$(              system_tools nix_path_for package ohMyZsh)"
zsh__path="$(                    system_tools nix_path_for package zsh)"

# 
# set fpath for zsh
# 
local_zsh="$VIRKSHOP_FOLDER/mixture/temporary/long_term/home/.cache/zsh.ignore/site-functions/"
mkdir -p "$local_zsh"

export fpath=("$local_zsh")
export fpath=("$oh_my_zsh__path"/share/oh-my-zsh/functions $fpath)
export fpath=("$oh_my_zsh__path"/share/oh-my-zsh/completions $fpath)
export fpath=("$zsh__path"/share/zsh/site-functions $fpath)
export fpath=("$zsh__path"/share/zsh/*/functions $fpath)

# See https://github.com/ohmyzsh/ohmyzsh/wiki/Themes
ZSH_THEME="robbyrussell" # default

# 
# add spaceship-prompt theme
# 
ln -fs "$spaceship_prompt__path/lib/spaceship-prompt/spaceship.zsh" "$local_zsh"prompt_spaceship_setup
export ZSH="$oh_my_zsh__path/share/oh-my-zsh"
. "$ZSH/oh-my-zsh.sh" 2>/dev/null

# 
# enable syntax highlighing
# 
export ZSH_HIGHLIGHT_HIGHLIGHTERS_DIR="$zsh_syntax_highlighting__path/share/zsh-syntax-highlighting/highlighters"
. "$ZSH_HIGHLIGHT_HIGHLIGHTERS_DIR/../zsh-syntax-highlighting.zsh"

# 
# enable auto suggestions
# 
. "$zsh_auto_suggest__path/share/zsh-autosuggestions/zsh-autosuggestions.zsh"

SPACESHIP_CHAR_SYMBOL="∫ " # ☣ ⁂ ⌘ ∴ ∮ ֎ Ͽ ♫ ⛬ ⚿ ♦ ♢ ⛶ ✾ ❒ ⟩ ⟡ ⟜ ⟦ ⦊ ⦒ ⪢ ⪾ ∫ ∬ ∭
SPACESHIP_VENV_SYMBOL="🐍$(python -V 2>&1 | sed -E 's/Python//g' )"
SPACESHIP_VENV_PREFIX=""
SPACESHIP_VENV_GENERIC_NAMES="."
SPACESHIP_VENV_COLOR="green"
SPACESHIP_NODE_COLOR="yellow"

# Set Spaceship ZSH as a prompt
autoload -U promptinit; promptinit
prompt spaceship

# 
# enable auto complete
# 
# remove path paths added by oh-my-zsh
# for each argument (in a argument-might-have-spaces friendly way)
new_fpath=()
for each_path in $fpath; do
    # workaround for a bug in zsh (doesnt expect hashes to be in paths)
    # makes me wonder if it would break with spaces/tabs too
    each_path_escaped="$(deno eval 'console.log(Deno.args[0].replace(/#/,`"#"`))' "$each_path")"
    new_fpath=($each_path_escaped $new_fpath)
done
export fpath=($new_fpath)
autoload -Uz compinit
compinit

autoload bashcompinit
bashcompinit

unalias -m '*' # remove all default aliases