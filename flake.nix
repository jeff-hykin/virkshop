{
    description = "Howdy!";
    inputs = {
        nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    };
    outputs = { self, nixpkgs, flake-utils }:
        {
            mkShells = { nixpkgs, supportedSystems, warehouses, installedPackages, core ? builtins }:
                let
                    builtins = core; # this weird trick is so that builtins can be overridden by the user
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
                in
                    (builtins.listToAttrs 
                        (map
                            (system:
                                let
                                    defaultWarehouse = nixpkgs.legacyPackages.${system};
                                    warehouseToPkgs = eachWarehouse: (
                                        (builtins.import
                                            # import source
                                            (
                                                if (builtins.hasAttr eachWarehouse 'tarFileUrl') then
                                                    defaultWarehouse.fetchTarball (
                                                        if (builtins.hasAttr eachWarehouse 'sha256')
                                                        then
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
                                                        defaultWarehouse.fetchTarball { url = "https://github.com/NixOS/nixpkgs/archive/${eachWarehouse}.tar.gz";; }  
                                                else if (builtins.hasAttr eachWarehouse 'gitHubInfo') then
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
                                    warehousesByName = (builtins.listToAttrs
                                        (builtins.map
                                            (eachWarehouse:
                                                {
                                                    name = eachWarehouse.name;
                                                    value = (warehouseToPkgs eachWarehouse);
                                                }
                                            )
                                        )
                                    ) // { default = defaultWarehouse; };
                                    
                                    packagesForThisSystem = (builtins.filter (eachPackage: (eachPackage.onlyIf {inherit system;})) installedPackages);
                                    evalPackage = (eachPackage:
                                        # TODO: add limiter here to wrap/filter bins and ENV vars
                                        # maybe also add a shellHook to enable stuff like zsh plugins
                                        if (builtins.isString eachPackage.from)
                                        then
                                            let
                                                warehouse = (builtins.getAttr eachPackage.from warehousesByName);
                                            in
                                                (getDeep each.package warehouse )
                                        else if (builtins.isAttrs eachPackage.from)
                                        then
                                            # TODO: probably have vix auto-hoist and give them misc names instead of allowing inline hooks
                                            (getDeep each.package (warehouseToPkgs eachPackage.from))
                                        else
                                            builtins.throw "unsupported package. Needs a string or attrset"
                                    );
                                    
                                    buildInputs = (builtins.map
                                        evalPackage
                                        (builtins.filter
                                            (each: each.asBuildInput or false)
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
                                in 
                                    {
                                        name = system;
                                        value = {
                                            default = defaultWarehouse.mkShell {
                                                # FIXME: this needs to iterate over all the installed packages and load them accordingly
                                                inherit buildInputs nativeBuildInputs;
                                                # FIXME: ENV vars
                                                # FIXME: PATH modifications/limiter
                                                shellHook = ''
                                                    echo "howdy!"
                                                '';
                                            };
                                        };
                                    }
                                )
                            supportedSystems
                        )
                    ) // { _vix = { inherit nixpkgs warehouses supportedSystems installedPackages; /* for introspection */}; };
        }
    ;
}