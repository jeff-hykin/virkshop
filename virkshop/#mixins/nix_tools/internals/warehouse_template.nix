let
    WAREHOUSE_NAME_HERE =    
        let
            core = (builtins.import ./core.nix);
        in
            (core.import
                (core.fetchTarball
                    ({url=TARBALL_URL_HERE;})
                    # ({url="https://github.com/NixOS/nixpkgs/archive/${COMMIT_HASH_HERE}.tar.gz";})
                )
                ({
                    config = CONFIG_HERE;
                })
            );
in 