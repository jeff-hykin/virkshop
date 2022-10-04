let
    PACKAGE_NAME_HERE =    
        let
            core = (builtins.import ./core.nix);
        in
            # if has a tarball
                # (core.import
                #     (core.fetchTarball
                #         ({url=TARBALL_URL_HERE;})
                #     )
                #     ({
                #         config = CONFIG_HERE;
                #         override = OVERRIDE_HERE;
                #     })
                # ).PACKAGE_ATTRIBUTE_LIST_HERE;
            # if has a commit hash
                # (core.import
                #     (core.fetchTarball
                #         ({url="https://github.com/NixOS/nixpkgs/archive/${COMMIT_HASH_HERE}.tar.gz";})
                #     )
                #     ({
                #         config = CONFIG_HERE;
                #         override = OVERRIDE_HERE;
                #     })
                # ).PACKAGE_ATTRIBUTE_LIST_HERE;
            # if has a warehouse (or fallsback on default warehouse)
                WAREHOUSE_NAME_HERE.PACKAGE_ATTRIBUTE_LIST_HERE.override (OVERRIDE_HERE);
in 