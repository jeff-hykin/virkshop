
let
    #
    # create a standard library for convienience 
    # 
    __core__ = (
        let
            frozenStd = (builtins.import 
                (builtins.fetchTarball
                    ({url="https://github.com/NixOS/nixpkgs/archive/ce6aa13369b667ac2542593170993504932eb836.tar.gz";})
                )
                ({})
            );
        in
            (frozenStd.lib.mergeAttrs
                (frozenStd.lib.mergeAttrs
                    (frozenStd.buildPackages) # <- for fetchFromGitHub, installShellFiles, getAttrFromPath, etc 
                    (frozenStd.lib.mergeAttrs
                        ({ stdenv = frozenStd.stdenv; })
                        (frozenStd.lib) # <- for mergeAttrs, optionals, getAttrFromPath, etc 
                    )
                )
                (builtins) # <- for import, fetchTarball, etc 
            )
    );
    
    # 
    # Packages, Vars, and Compute
    # 
    
    
        defaultWarehouse = (__core__.import
            (__core__.fetchTarball
                ({url="https://github.com/NixOS/nixpkgs/archive/ce6aa13369b667ac2542593170993504932eb836.tar.gz";})
            )
            ({
                "config" = (
                    {
                        "allowUnfree" = true;
                        "cudaSupport" = true;
                        "permittedInsecurePackages" = (
                            [
                                "openssl-1.0.2u"
                            ]);
                    });
            })
        );
    
        warehouseWithTorch_1_8_1 = (__core__.import
            (__core__.fetchTarball
                ({url="https://github.com/NixOS/nixpkgs/archive/141439f6f11537ee349a58aaf97a5a5fc072365c.tar.gz";})
            )
            ({
                "config" = {};
            })
        );
    
        warehouseWithNcclCudaToolkit_11_2 = (__core__.import
            (__core__.fetchTarball
                ({url="https://github.com/NixOS/nixpkgs/archive/2cdd608fab0af07647da29634627a42852a8c97f.tar.gz";})
            )
            ({
                "config" = {};
            })
        );
    
        warehouseForNetworking = (__core__.import
            (__core__.fetchTarball
                ({url="https://github.com/NixOS/nixpkgs/archive/c00039f697caa02208a01e7712bfe11c484cceca.tar.gz";})
            )
            ({
                "config" = {};
            })
        );
    
        isMac = (true);
    
        isLinux = (false);
    
        zsh = defaultWarehouse."zsh";
        
        zshSyntaxHighlighting = defaultWarehouse."zsh-syntax-highlighting";
        
        ohMyZsh = defaultWarehouse."oh-my-zsh";
        
        zshAutosuggestions = defaultWarehouse."zsh-autosuggestions";
        
        spaceshipPrompt = defaultWarehouse."spaceship-prompt";
        
    
    __nixShellEscapedJsonData__ = (
        let 
            nixShellDataJson = (__core__.toJSON {
                libraryPaths = {
                    "zsh" = __core__.lib.makeLibraryPath [ zsh ];
                    "zshSyntaxHighlighting" = __core__.lib.makeLibraryPath [ zshSyntaxHighlighting ];
                    "ohMyZsh" = __core__.lib.makeLibraryPath [ ohMyZsh ];
                    "zshAutosuggestions" = __core__.lib.makeLibraryPath [ zshAutosuggestions ];
                    "spaceshipPrompt" = __core__.lib.makeLibraryPath [ spaceshipPrompt ];
                    
                };
                packagePaths = {
                    "zsh" = zsh;
                    "zshSyntaxHighlighting" = zshSyntaxHighlighting;
                    "ohMyZsh" = ohMyZsh;
                    "zshAutosuggestions" = zshAutosuggestions;
                    "spaceshipPrompt" = spaceshipPrompt;
                    
                };
            });
            bashEscapedJson = (builtins.replaceStrings
                [
                    "'"
                ]
                [
                    "'\"'\"'"
                ]
                nixShellDataJson
            );
        in
            bashEscapedJson
    );
    
in
    __core__.mkShell {
        # inside that shell, make sure to use these packages
        buildInputs =  [
            defaultWarehouse."xcbuild"
            defaultWarehouse."xcodebuild"
            defaultWarehouse."darwin"."libobjc"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."CoreServices"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."CoreFoundation"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."Foundation"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."AVKit"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."AVFoundation"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."AppKit"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."WebKit"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."Accounts"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."Security"
            defaultWarehouse."gcc"
            defaultWarehouse."libkrb5"
            defaultWarehouse."ncurses5"
            defaultWarehouse."openssh"
            defaultWarehouse."fd"
            defaultWarehouse."sd"
            defaultWarehouse."dua"
            defaultWarehouse."tealdeer"
            defaultWarehouse."bottom"
            defaultWarehouse."exa"
            defaultWarehouse."zsh"
            defaultWarehouse."zsh-syntax-highlighting"
            defaultWarehouse."oh-my-zsh"
            defaultWarehouse."zsh-autosuggestions"
            defaultWarehouse."spaceship-prompt"
            defaultWarehouse."nnn"
            defaultWarehouse."jq"
            defaultWarehouse."git-subrepo"
            defaultWarehouse."man"
            defaultWarehouse."coreutils"
            defaultWarehouse."ripgrep"
            defaultWarehouse."which"
            defaultWarehouse."git"
            defaultWarehouse."colorls"
            defaultWarehouse."tree"
            defaultWarehouse."less"
            defaultWarehouse."nano"
            defaultWarehouse."unzip"
            defaultWarehouse."zip"
            defaultWarehouse."findutils"
            defaultWarehouse."wget"
            defaultWarehouse."curl"
            warehouseForNetworking."unixtools"."arp"
            warehouseForNetworking."unixtools"."ifconfig"
            warehouseForNetworking."unixtools"."netstat"
            warehouseForNetworking."unixtools"."ping"
            warehouseForNetworking."unixtools"."route"
            warehouseForNetworking."unixtools"."col"
            warehouseForNetworking."unixtools"."column"
            warehouseForNetworking."unixtools"."fdisk"
            warehouseForNetworking."unixtools"."fsck"
            warehouseForNetworking."unixtools"."getconf"
            warehouseForNetworking."unixtools"."getent"
            warehouseForNetworking."unixtools"."getopt"
            warehouseForNetworking."unixtools"."hexdump"
            warehouseForNetworking."unixtools"."hostname"
            warehouseForNetworking."unixtools"."killall"
            warehouseForNetworking."unixtools"."locale"
            warehouseForNetworking."unixtools"."more"
            warehouseForNetworking."unixtools"."mount"
            warehouseForNetworking."unixtools"."ps"
            warehouseForNetworking."unixtools"."quota"
            warehouseForNetworking."unixtools"."script"
            warehouseForNetworking."unixtools"."sysctl"
            warehouseForNetworking."unixtools"."top"
            warehouseForNetworking."unixtools"."umount"
            warehouseForNetworking."unixtools"."whereis"
            warehouseForNetworking."unixtools"."write"
            warehouseForNetworking."unixtools"."xxd"
            (__core__.import
                        (__core__.fetchTarball
                            ({url="https://github.com/NixOS/nixpkgs/archive/ce6aa13369b667ac2542593170993504932eb836.tar.gz";})
                        )
                        ({})
                    )."deno"
            defaultWarehouse."nix"
        ];
        
        nativeBuildInputs = [
            defaultWarehouse."xcbuild"
            defaultWarehouse."xcodebuild"
            defaultWarehouse."darwin"."libobjc"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."CoreServices"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."CoreFoundation"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."Foundation"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."AVKit"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."AVFoundation"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."AppKit"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."WebKit"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."Accounts"
            defaultWarehouse."darwin"."apple_sdk"."frameworks"."Security"
        ];
        
        # run some bash code before starting up the shell
        shellHook = "
            export VIRKSHOP_NIX_SHELL_DATA='${__nixShellEscapedJsonData__}'
        ";
    }
