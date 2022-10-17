# import snowball and main (tools within nix), use them to load packages
let
    snowball = import (builtins.fetchurl "https://raw.githubusercontent.com/jeff-hykin/snowball/29a4cb39d8db70f9b6d13f52b3a37a03aae48819/snowball.nix");
    # 
    # load most things from the nix.toml
    # 
    main = (builtins.import ../internals/main.nix);
    
    # just a helper
    emptyOptions = ({
        buildInputs = [];
        nativeBuildInputs = [];
        shellHook = "";
    });
in 
    # 
    # Mac Only
    # 
    if main.stdenv.isDarwin then ({
        buildInputs = [];
        nativeBuildInputs = [];
        shellHook = ''
            if [[ "$OSTYPE" = "darwin"* ]] 
            then
                true # add important nix-MacOS code here
                export EXTRA_CCFLAGS="$EXTRA_CCFLAGS:-I/usr/include:${main.packages.darwin.apple_sdk.frameworks.CoreServices}/Library/Frameworks/CoreServices.framework/Headers/"
            fi
        '';
    }) else emptyOptions