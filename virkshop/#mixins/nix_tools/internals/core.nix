let
    # 
    # create a standard library for convienience 
    # 
    frozenStd = (builtins.import 
        (builtins.fetchTarball
            ({url="https://github.com/NixOS/nixpkgs/archive/8917ffe7232e1e9db23ec9405248fd1944d0b36f.tar.gz";})
        )
        ({})
    );
    core = (frozenStd.lib.mergeAttrs
        (frozenStd.lib.mergeAttrs
            (frozenStd.buildPackages) # <- for fetchFromGitHub, installShellFiles, getAttrFromPath, etc 
            (frozenStd.lib.mergeAttrs
                ({ stdenv = frozenStd.stdenv; })
                (frozenStd.lib) # <- for mergeAttrs, optionals, getAttrFromPath, etc 
            )
        )
        (builtins) # <- for import, fetchTarball, etc 
    );
in
    core.mkShell {
        # inside that shell, make sure to use these packages
        buildInputs =  [
            
        ];
        
        nativeBuildInputs = [
            
        ];
        
        # run some bash code before starting up the shell
        shellHook = ''
            
            
            
        '';
    }
