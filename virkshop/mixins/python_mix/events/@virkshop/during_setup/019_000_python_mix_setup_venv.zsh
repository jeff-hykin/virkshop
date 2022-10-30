export VIRTUAL_ENV="$PROJECT_FOLDER/.venv"
export PATH="$VIRKSHOP_HOME/.local/bin:$PATH"
if ! [ -d "$VIRTUAL_ENV" ]
then
    echo "creating virtual env for python"
    # FIXME: run the cleanup
    # . "$VIRKSHOP_FOLDER/mixins/python/events/@project/clean/python_mix.zsh"
    python -m venv "$VIRTUAL_ENV" && echo "virtual env created"
fi

export PATH="$VIRTUAL_ENV/bin:$PATH"