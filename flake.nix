{
    description = "Howdy!";
    inputs = {
        libSource.url = "github:divnix/nixpkgs.lib";
        home-manager.url = "github:nix-community/home-manager";
        # home-manager.inputs.nixpkgs.follows = "nixpkgs";
    };
    outputs = { self, libSource, home-manager, ... }:
        let
            # 
            # generic helpers
            # 
                lib = libSource.lib;
                core = builtins; # this weird trick is so that builtins can be overridden by the user
                getDeep = (path: attrs:
                    builtins.foldl'
                    (acc: key:
                        if acc ? ${key} then acc.${key} else throw "path ${toString path} not found in ${toString attrs}"
                    )
                    attrs
                    path
                );
                isUrl = (str:
                    builtins.any (prefix: builtins.hasPrefix prefix str) [
                        "http://"
                        "https://"
                        "ftp://"
                        "file://"
                    ]
                );
                mkSystemAttrList = supportedSystems: whateverFunc: (builtins.listToAttrs 
                    (builtins.map
                        (eachSystem: {
                            name = eachSystem;
                            value = whateverFunc eachSystem;
                        })
                        supportedSystems
                    )
                );
                # embedded here cause I couldn't get around this problem:
                #       while evaluating attribute 'shellHook' of derivation 'nix-shell'
                #          at /nix/store/agbbjxvdcp9dydmrn2hf3s652k547rbc-source/pkgs/build-support/mkshell/default.nix:53:5:
                #          52|
                #          53|     shellHook = lib.concatStringsSep "\n" (
                #              |     ^
                #          54|       lib.catAttrs "shellHook" (lib.reverseList inputsFrom ++ [ attrs ])
                #      error: attribute 'lib' missing
                makeMkShell = (stdenv:
                    # A special kind of derivation that is only meant to be consumed by the
                    # nix-shell.
                    {
                        name ? "nix-shell",
                        # a list of packages to add to the shell environment
                        packages ? [ ],
                        # propagate all the inputs from the given derivations
                        inputsFrom ? [ ],
                        buildInputs ? [ ],
                        nativeBuildInputs ? [ ],
                        propagatedBuildInputs ? [ ],
                        propagatedNativeBuildInputs ? [ ],
                        ...
                    }@attrs:
                        let
                            mergeInputs =
                                name:
                                (attrs.${name} or [ ])
                                ++
                                    # 1. get all `{build,nativeBuild,...}Inputs` from the elements of `inputsFrom`
                                    # 2. since that is a list of lists, `flatten` that into a regular list
                                    # 3. filter out of the result everything that's in `inputsFrom` itself
                                    # this leaves actual dependencies of the derivations in `inputsFrom`, but never the derivations themselves
                                    (lib.subtractLists inputsFrom (lib.flatten (lib.catAttrs name inputsFrom)));

                            rest = builtins.removeAttrs attrs [
                                "name"
                                "packages"
                                "inputsFrom"
                                "buildInputs"
                                "nativeBuildInputs"
                                "propagatedBuildInputs"
                                "propagatedNativeBuildInputs"
                                "shellHook"
                            ];
                        in

                        stdenv.mkDerivation (
                            {
                                inherit name;

                                buildInputs = mergeInputs "buildInputs";
                                nativeBuildInputs = packages ++ (mergeInputs "nativeBuildInputs");
                                propagatedBuildInputs = mergeInputs "propagatedBuildInputs";
                                propagatedNativeBuildInputs = mergeInputs "propagatedNativeBuildInputs";

                                shellHook = lib.concatStringsSep "\n" (
                                    lib.catAttrs "shellHook" (lib.reverseList inputsFrom ++ [ attrs ])
                                );

                                phases = [ "buildPhase" ];

                                buildPhase = ''
                                    { echo "------------------------------------------------------------";
                                        echo " WARNING: the existence of this path is not guaranteed.";
                                        echo " It is an internal implementation detail for pkgs.mkShell.";
                                        echo "------------------------------------------------------------";
                                        echo;
                                        # Record all build inputs as runtime dependencies
                                        export;
                                    } >> "$out"
                                '';

                                preferLocalBuild = true;
                            }
                            // rest
                        )
                );
            # 
            # vix specifics
            # 
                setup = ({ nixpkgs, warehouses, localPackages, builtins ? core, ... }:
                    {
                        inherit nixpkgs warehouses localPackages builtins;
                        load = (system:
                            let
                                defaultWarehouse = nixpkgs.legacyPackages.${system};
                                unEvaledPackages = localPackages;
                                warehouseToPkgs = eachWarehouse: (
                                    (builtins.import
                                        # import source
                                        (
                                            if (builtins.hasAttr eachWarehouse "tarFileUrl") then
                                                defaultWarehouse.fetchTarball (
                                                    if (builtins.hasAttr eachWarehouse "sha256") then
                                                        { url = eachWarehouse.tarFileUrl; sha256 = eachWarehouse.sha256; }
                                                    else
                                                        { url = eachWarehouse.tarFileUrl; }
                                                )
                                            # TODO: add support for fetchFromGit, and other methods
                                            else if (builtins.isString eachWarehouse) then
                                                if (isUrl eachWarehouse) then
                                                    defaultWarehouse.fetchTarball { url = eachWarehouse; }
                                                else
                                                    # assume nixpkgs hash
                                                    defaultWarehouse.fetchTarball { url = "https://github.com/NixOS/nixpkgs/archive/${eachWarehouse}.tar.gz"; }  
                                            else if (builtins.hasAttr eachWarehouse "gitHubInfo") then
                                                defaultWarehouse.fetchFromGitHub (eachWarehouse.gitHubInfo)
                                                # {
                                                #     owner = eachWarehouse.owner;
                                                #     repo = eachWarehouse.repo;
                                                #     rev = eachWarehouse.rev;
                                                #     sha256 = eachWarehouse.sha256;
                                                # }
                                            else
                                                builtins.throw "unsupported warehouse. Needs a tarFileUrl, or gitHubInfo (owner, repo, rev, and a sha256)"
                                        )
                                        # config
                                        {
                                            system = system;
                                            # overlays = [ ];
                                            # 
                                        } // (eachWarehouse.config or {})
                                    )
                                );
                                # TODO: probably use a set instead of a list
                                warehousesByName = (builtins.listToAttrs
                                    (builtins.map
                                        (eachWarehouse:
                                            {
                                                name = eachWarehouse.name;
                                                value = (warehouseToPkgs eachWarehouse);
                                            }
                                        )
                                        warehouses
                                    )
                                ) // { default = defaultWarehouse; };
                                
                                packagesForThisSystem = (builtins.filter
                                    (eachPackage:
                                        let
                                            defaultOnlyIf = { system, ... }: true;
                                            onlyIf = eachPackage.onlyIf or defaultOnlyIf;
                                        in
                                            (onlyIf {inherit system;})
                                    )
                                    unEvaledPackages
                                );
                                evalPackage = (eachPackage:
                                    # TODO: add limiter here to wrap/filter bins and ENV vars
                                    # maybe also add a shellHook to enable stuff like zsh plugins
                                    if (builtins.isString eachPackage.from) then
                                        let
                                            warehouse = (builtins.getAttr eachPackage.from warehousesByName);
                                        in
                                            (getDeep eachPackage.package warehouse )
                                    else if (builtins.isAttrs eachPackage.from) then
                                        # TODO: probably have vix auto-hoist and give them misc names instead of allowing inline hooks
                                        (getDeep eachPackage.package (warehouseToPkgs eachPackage.from))
                                    else
                                        builtins.throw "unsupported package. Needs a string or attrset"
                                );
                                
                                buildInputs = (builtins.map
                                    evalPackage
                                    (builtins.filter
                                        (each: 
                                            # asBuildInput is kinda redundant, but it's allowed for the edgecase of something that needs to be both a buildInput and a nativeBuildInput
                                            each.asBuildInput or (
                                                !(
                                                    (each.asNativeBuildInput or false)
                                                    && (each.asPropagatedBuildInput or false)
                                                )
                                            )
                                        )
                                        packagesForThisSystem
                                    )
                                );
                                
                                nativeBuildInputs = (builtins.map
                                    evalPackage
                                    (builtins.filter
                                        (each: each.asNativeBuildInput or false)
                                        packagesForThisSystem
                                    )
                                );
                                
                                propagatedBuildInputs = (builtins.map
                                    evalPackage
                                    (builtins.filter
                                        (each: each.asPropagatedBuildInput or false)
                                        packagesForThisSystem
                                    )
                                );
                                
                                packagesByName = (builtins.listToAttrs
                                    (builtins.map
                                        (eachPackage:
                                            {
                                                name = eachPackage.name;
                                                value = evalPackage eachPackage;
                                            }
                                        )
                                        packagesForThisSystem
                                    )
                                );
                            in
                                {
                                    inherit warehousesByName;
                                    packageList = packagesForThisSystem;
                                    pkgs = packagesByName;
                                    inherit buildInputs nativeBuildInputs propagatedBuildInputs;
                                    defaultWarehouse = defaultWarehouse;
                                }
                        );
                    }
                );
                
                mkShells = {
                    vixSetup,
                    supportedSystems,
                    homeManagerConfigFunc ? system: let systemSetup = (vixSetup.load system); in {
                        inherit (systemSetup) pkgs;
                        modules = [
                            {
                                home.username = "default";
                                home.homeDirectory = "/tmp/nix_temp_home";
                                home.stateVersion = "25.11"; # vixSetup.nixpkgs.rev;

                                programs = {
                                    home-manager = {
                                        enable = true;
                                    };
                                    zsh = {
                                        enable = true;
                                        package = systemSetup.pkgs.zsh;
                                        enableCompletion = true;
                                        autosuggestion.enable = true;
                                        syntaxHighlighting.enable = true;
                                        # ohMyZsh = {
                                        #     enable = true;
                                        #     theme = "powerlevel10k/powerlevel10k";
                                        #     plugins = [
                                        #         "git"
                                        #         "z"
                                        #         "sudo"
                                        #         "history"
                                        #         "command-not-found"
                                        #         "colored-man-pages"
                                        #     ];
                                        # };
                                        shellAliases = {
                                            ll = "ls -la";
                                        };
                                        history = {
                                            size = 100000;  # large history size
                                            save = 100000;
                                            share = true;
                                            ignoreDups = true;
                                            extended = true;
                                        };
                                        initContent = ''
                                            setopt HIST_IGNORE_ALL_DUPS
                                            setopt HIST_REDUCE_BLANKS
                                            setopt HIST_VERIFY
                                            setopt SHARE_HISTORY
                                            setopt INC_APPEND_HISTORY
                                            setopt INTERACTIVE_COMMENTS

                                            # Handy options
                                            setopt AUTO_CD
                                            setopt CORRECT
                                            setopt NO_BEEP

                                            # Set LS_COLORS using dircolors
                                            if command -v dircolors &> /dev/null; then
                                                eval "$(dircolors -b)"
                                            fi

                                            # Enable Powerlevel10k if selected
                                            [[ -f ${systemSetup.pkgs.zsh}/share/zsh/site-functions/p10k.zsh ]] && source ${systemSetup.pkgs.zsh}/share/zsh/site-functions/p10k.zsh
                                        '';
                                    };
                                };
                                
                                # vix is primairly for home-setup stuff
                                home.packages = [ systemSetup.defaultWarehouse.coreutils ] ++ builtins.attrValues systemSetup.pkgs;
                            }
                        ];
                    },
                    overrideShell ? null,
                    builtins ? core,
                }:
                    (mkSystemAttrList 
                        supportedSystems
                        (system:
                            let
                                systemSetup = (vixSetup.load system);
                                homeBaseConfig = (homeManagerConfigFunc system);
                                # make sure lib ends up in pkgs (even though thats not great, I'd have to fork home-manager to fix it)
                                homeConfig = homeBaseConfig // { 
                                    pkgs = { 
                                        lib = lib;
                                        inherit (systemSetup.defaultWarehouse) path config overlays stdenv;
                                    } // homeBaseConfig.pkgs; 
                                };
                                home = (home-manager.lib.homeManagerConfiguration 
                                    homeConfig
                                );
                                shellPackageNameProbably = (
                                    if (home.config.programs.zsh.enable) then
                                        "zsh"
                                    else if (home.config.programs.bash.enable) then
                                        "bash"
                                    else if (builtins.isList overrideShell) then
                                        true
                                    else
                                        builtins.throw ''Sorry I don't support the shell you selected in home manager (I only support zsh and bash) However you can override this by giving vix an argument: overrideShell = [ "''${yourShellExecutablePath}" "--no-globalrcs" ]; ''
                                );
                                shellCommandList = (
                                    if (shellPackageNameProbably == "zsh") then
                                        [ "${home.pkgs.zsh}/bin/zsh" "--no-globalrcs" ]
                                    else if (shellPackageNameProbably == "bash") then
                                        [ "${home.pkgs.bash}/bin/bash" "--noprofile" ]
                                    else if (builtins.isList overrideShell) then
                                        overrideShell
                                    else
                                        builtins.throw ''Note: this should be unreachable, but as a fallback: Sorry I don't support the shell you selected in home manager (I ). However you can override this by giving vix an argument: overrideShell = [ "''${yourShellExecutablePath}" "--no-globalrcs" ]; ''
                                );
                                shellCommandString = "${lib.concatStringsSep " " (builtins.map lib.escapeShellArg shellCommandList)}";
                                homePath = home.config.home.homeDirectory;
                            in 
                                {
                                    default = (makeMkShell systemSetup.defaultWarehouse.stdenv) {
                                        inherit (systemSetup) buildInputs nativeBuildInputs propagatedBuildInputs;
                                        # FIXME: ENV vars
                                        # FIXME: PATH modifications/limiter
                                        shellHook = builtins.trace homePath ''
                                            export REAL_HOME="$HOME"
                                            export HOME=${lib.escapeShellArg homePath}
                                            mkdir -p "$HOME/.local/state/nix/profiles"
                                            USER="default" HOME=${lib.escapeShellArg homePath} ${home.activationPackage.out}/activate
                                            env -i VIX_ACTIVE=1 PATH=${lib.escapeShellArg homePath}/bin:${lib.escapeShellArg homePath}/.nix-profile/bin HOME=${lib.escapeShellArg homePath} USER="$USER" SHELL=${lib.escapeShellArg (builtins.elemAt shellCommandList 0)} TERM="$TERM" ${shellCommandString}
                                            exit $?
                                        '';
                                    };
                                    }
                                    }
                                }
                        )
                    ) // {
                        _vix = vixSetup; # for introspection
                    }
                ;
        in
            {
                inherit setup mkShells;
            }
    ;
}