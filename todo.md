- open the enter.js
- make all commands executable
- finish figuring out how to link files
    - link mixin namespaces
    - then do mixin phase 1 (pre extension setup)
    - then do mixin phase 2 (post extension setup)
    - then do mixin phase 3 (post virkshop setup)
- generate the home folder
- create a standard way to pass phase_1 data into phase_2
    - create a JSON file inside temporary/short_term 
    - have zsh read the JSON file and create some env vars based on them
- `addToGitignore` function
- `triggerEvent` function
- `wrapExecutable` function for sudo, vim, and the like
- standardize and publish a deno FileSystem lib
- standardize and publish a deno Virkshop lib



// todo
    // make all commands executable
    // create a trigger event function
    // design combination method for mixins trying to request things from other mixins
        // system dependencies (nix toml)
        // adding to gitignore
        // adding a pip module
        // adding a git hook
    // create injection tools
        // home link folder
        // external binary wrap+inject
    // design "affect" methods (set env vars, add to path)
        // design data storage for holding these (auto generate a folder of .zshrc_peice's that each get sourced)
        // env variable export (add to path)
        // zsh function defintion
        // adding raw text that will later be sourced by zsh

