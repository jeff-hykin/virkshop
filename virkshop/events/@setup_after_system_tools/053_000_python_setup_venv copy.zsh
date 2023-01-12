# TMPDIR fixes a pip issue
mkdir -p "$TMPDIR"
export VIRTUAL_ENV="$PROJECT_FOLDER/.venv"
export PATH="$VIRKSHOP_HOME/.local/bin:$PATH"
if ! [ -d "$VIRTUAL_ENV" ]
then
    echo "creating virtual env for python"
    # run the cleanup
    cleanup_event_file="$VIRKSHOP_FOLDER/events/project/clean/python_clean.deno.js"
    # check if file exists
    if [ -f "$cleanup_event_file" ]
    then
        deno run --allow-all "$VIRKSHOP_FOLDER/events/project/clean/python_clean.deno.js"
    fi
    python -m venv "$VIRTUAL_ENV" && echo "virtual env created"
fi

export PATH="$VIRTUAL_ENV/bin:$PATH"

# fix SSL issues
export SSL_CERT_FILE="$(python -c 'import ssl; print(ssl.get_default_verify_paths().openssl_cafile)')"