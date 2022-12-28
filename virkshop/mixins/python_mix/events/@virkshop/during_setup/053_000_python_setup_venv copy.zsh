# TMPDIR fixes a pip issue
mkdir -p "$TMPDIR"
export VIRTUAL_ENV="$PROJECT_FOLDER/.venv"
export PATH="$VIRKSHOP_HOME/.local/bin:$PATH"
if ! [ -d "$VIRTUAL_ENV" ]
then
    echo "creating virtual env for python"
    # run the cleanup
    deno run --allow-all "$VIRKSHOP_FOLDER/mixins/python_mix/events/@project/clean/clean_python.deno.js"
    python -m venv "$VIRTUAL_ENV" && echo "virtual env created"
fi

export PATH="$VIRTUAL_ENV/bin:$PATH"

# fix SSL issues
export SSL_CERT_FILE="$(python -c 'import ssl; print(ssl.get_default_verify_paths().openssl_cafile)')"