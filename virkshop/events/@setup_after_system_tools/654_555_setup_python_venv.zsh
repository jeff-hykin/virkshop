# TMPDIR fixes a pip issue
export TMPDIR="$VIRKSHOP_FOLDER/temporary.ignore"
mkdir -p "$TMPDIR"
export VIRTUAL_ENV="$PROJECT_FOLDER/.venv"
export PATH="$HOME/.local/bin:$PATH"
if ! [ -d "$VIRTUAL_ENV" ]
then
    echo "creating virtual env for python"
    # TODO: run the cleanup
    # . "$VIRKSHOP_FOLDER/settings/extensions/python/during_clean.sh"
    python -m venv "$VIRTUAL_ENV" && echo "virtual env created"
fi

export PATH="$VIRTUAL_ENV/bin:$PATH"

# fix SSL issues
export SSL_CERT_FILE="$(python -c 'import ssl; print(ssl.get_default_verify_paths().openssl_cafile)')"  