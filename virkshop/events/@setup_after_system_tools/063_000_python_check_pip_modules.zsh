# if poetry not installed, install it
if ! python -c "import poetry" 2>/dev/null; then
    python -m pip --disable-pip-version-check install poetry==1.2.1 || python -m pip --disable-pip-version-check install poetry
fi

# 
# check for python-poetry
# 
if [ -f "$PROJECT_FOLDER/pyproject.toml" ] && [ -n "$(command -v "poetry")" ]
then
    # main inputs
    __temp_var__command_name="python_mix/check_pip_modules"
    __temp_var__file_to_watch="$PROJECT_FOLDER/pyproject.toml"
    __temp_var__hash_check_name="pip_poetry_modules"
    failed_check_command () {
        # for newer versions of poetry tell them to use the existing virtual env
        poetry config virtualenvs.path --unset 2>/dev/null
        poetry config virtualenvs.in-project true 2>/dev/null

        # what to do when node modules haven't been installed yet
        poetry install
        # if successful
        if [ $? -eq 0 ] 
        then
            echo "[$__temp_var__command_name] Check finished (dependencies installed)"
            return 0
        # if failed
        else
            echo "[$__temp_var__command_name] Check failed: issues with install"
            return 1
        fi
    }

    # ensure that the source file and hash file exist
    echo 
    echo "[$__temp_var__command_name] Checking"
    if [ -f "$__temp_var__file_to_watch" ]; then
        # 
        # create check file
        # 
        __temp_var__location_of_hash="$TMPDIR/short_term/.$__temp_var__hash_check_name.cleanable.hash"
        if ! [ -f "$__temp_var__location_of_hash" ]; then
            # make sure the folder exists
            mkdir -p "$(dirname "$__temp_var__location_of_hash")"
            touch "$__temp_var__location_of_hash"
        fi
        
        # 
        # compare check files
        # 
        __temp_var__old_hash="$(cat "$__temp_var__location_of_hash")"
        __temp_var__new_hash="$(cat "$__temp_var__file_to_watch" | md5sum)"
        # if something changed since last time; install!
        if [ "$__temp_var__old_hash" != "$__temp_var__new_hash" ]; then
            failed_check_command && echo "$__temp_var__new_hash" > "$__temp_var__location_of_hash"
        else
            echo "[$__temp_var__command_name] Check Passed => assuming packages are installed"
        fi
        
        unset __temp_var__location_of_hash
        unset __temp_var__old_hash
        unset __temp_var__new_hash
    else
        echo "[$__temp_var__command_name] Check Passed (but only because no dependency file was found)"
    fi
    unset __temp_var__command_name
    unset __temp_var__file_to_watch
    unset __temp_var__hash_check_name
fi

# 
# check for requirements.txt
# 
if [ -f "$PROJECT_FOLDER/requirements.txt" ]
then
    # main inputs
    __temp_var__command_name="python_mix/check_pip_modules"
    __temp_var__file_to_watch="$PROJECT_FOLDER/requirements.txt"
    __temp_var__hash_check_name="pip_modules"
    failed_check_command () {
        # what to do when packages haven't been installed yet
        python -m pip --disable-pip-version-check install -r "$__temp_var__file_to_watch"
        # if successful
        if [ $? -eq 0 ] 
        then
            echo "[$__temp_var__command_name] Check finished (dependencies installed)"
            return 0
        # if failed
        else
            echo "[$__temp_var__command_name] Check failed: issues with install"
            return 1
        fi
    }

    # ensure that the source file and hash file exist
    echo 
    echo "[$__temp_var__command_name] Checking"
    if [ -f "$__temp_var__file_to_watch" ]; then
        # 
        # create check file
        # 
        __temp_var__location_of_hash="$TMPDIR/short_term/.$__temp_var__hash_check_name.cleanable.hash"
        if ! [ -f "$__temp_var__location_of_hash" ]; then
            # make sure the folder exists
            mkdir -p "$(dirname "$__temp_var__location_of_hash")"
            touch "$__temp_var__location_of_hash"
        fi
        
        # 
        # compare check files
        # 
        __temp_var__old_hash="$(cat "$__temp_var__location_of_hash")"
        __temp_var__new_hash="$(cat "$__temp_var__file_to_watch" | md5sum)"
        # if something changed since last time; install!
        if [ "$__temp_var__old_hash" != "$__temp_var__new_hash" ]; then
            failed_check_command && echo "$__temp_var__new_hash" > "$__temp_var__location_of_hash"
        else
            echo "[$__temp_var__command_name] Check Passed => assuming packages are installed"
        fi
        
        unset __temp_var__location_of_hash
        unset __temp_var__old_hash
        unset __temp_var__new_hash
    else
        echo "[$__temp_var__command_name] Check Passed (but only because no dependency file was found)"
    fi
    unset __temp_var__command_name
    unset __temp_var__file_to_watch
    unset __temp_var__hash_check_name
fi