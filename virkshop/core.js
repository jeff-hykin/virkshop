import { FileSystem } from "https://deno.land/x/quickr@0.3.41/main/file_system.js"
import { run, hasCommand, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } from "https://deno.land/x/quickr@0.3.41/main/run.js"
import { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.3.41/main/console.js"
import { findAll } from "https://deno.land/x/good@0.5.1/string.js"

const virkshopIdentifierPath = `#mixins/virkshop/settings/virkshop/`
const createVirkshop = async (arg)=>{
    var { virkshopPath, projectPath } = {...arg}
    // 
    // auto-detect a virkshop path
    // 
    if (!virkshopPath) {
        const callerPath = pathOfCaller()
        const walkUpPath = await FileSystem.walkUpUntil(virkshopIdentifierPath, callerPath)
        if (walkUpPath) {
            virkshopPath = walkUpPath
        // fallback case, caller must be in project, try looking for top level virkshop
        } else {
            projectPath = projectPath || FileSystem.pwd
            // try the most common place
            const defaultPlaceInfo = await FileSystem.info(`${projectPath}/virkshop/${virkshopIdentifierPath}`)
            if (defaultPlaceInfo.isFolder) {
                virkshopPath = defaultPlaceInfo
            } else {
                // time to brute force search for it
                const virkshopPaths = []
                const iterator = FileSystem.recursivelyIteratePathsIn(
                    projectPath,
                    {
                        searchOrder: 'breadthFirstSearch',
                        maxDepth: 2, // TODO: this may change in the future
                    },
                )
                for await (const eachPath of iterator) {
                    const eachInfo = await FileSystem.info(`${eachPath}/${virkshopIdentifierPath}`)
                    if (eachInfo.isFolder) {
                        virkshopPaths.push(eachInfo.path)
                    }
                }
                if (virkshopPaths.length == 1) {
                    virkshopPath = virkshopPaths[0]
                } else if (virkshopPaths.length >= 2) {
                    // TODO: although I want to give a warning here, if I did then there would be no way to get rid of it
                    // (beacuse the default virkshop object is always created first, and would throw an error before they get a chance to create their own)
                    return Error(`\n\n(This is the virkshop library speaking)\nI'm unable to load using the default methods because it seems there is more than one virkshop folder in the project.\nTo specify which one to use do\n    import { createVirkshop } from "..."\n    createVirkshop({ virkshopPath: "WHICH_FOLDER_HERE", projectPath: "" })\nAnd then specify which of the ones you want to use inside ${callerPath}\n`)
                } else if (virkshopPaths.length == 0) {
                    return Error(`\n\n(This is the virkshop library speaking)\nI'm unable to load using the default methods because I couldn't find any virkshop folders in the project.\nTo specify which one to use do\n    import { createVirkshop } from "..."\n    createVirkshop({ virkshopPath: "WHICH_FOLDER_HERE", projectPath: "" })\nAnd then specify which of the ones you want to use inside ${callerPath}\n`)
                }
            }
        }
    }
    
    const virkshop = Object.defineProperties(
        {
            pathTo: Object.defineProperties(
                {
                    realHome: Console.env.HOME,
                    virkshop: virkshopPath,
                    project: FileSystem.makeAbsolutePath(projectPath || FileSystem.parentPath(virkshopPath)),
                },
                {
                    mixins:   { get() { return `${virkshop.pathTo.virkshop}/#mixins` }},
                    mixture:  { get() { return `${virkshop.pathTo.virkshop}/#mixture` }},
                    settings: { get() { return `${virkshop.pathTo.mixture}/settings` }},
                    fakeHome: { get() { return `${virkshop.pathTo.mixture}/temporary/long_term/home` }},
                    virkshopOptions: { get() { return `${virkshop.pathTo.settings}/virkshop/options.json` }},
                }
            ),
            structure: {
                specialMixinFolders: [
                    'commands',
                    'documentation',
                    'events',
                    'home',
                    'settings'
                ],
            },
            async trigger(eventPath) {
                let promises = []
                const eventPathInfo = await FileSystem.info(eventPath)
                if (eventPathInfo.isFolder) {
                    const paths = await FileSystem.recursivelyListPathsIn(eventPath)
                    paths.sort()
                    // FIXME: sort them numerically
                    // FIXME: pad out the 0's to make the numbers equal lengths
                    // FIXME: import the .deno.js files instead of executing them
                    for (const eachPath of paths) {
                        await run`${eachPath}`
                    }
                }
            },
        },
        {
            folder:      { get() { return virkshop.pathTo.virkshop } }, // alias
            projectName: { get() { return FileSystem.basename(virkshop.pathTo.project)   } },
            options: { 
                get() {
                    return JSON.parse(Deno.readTextFileSync(virkshop.pathTo.virkshopOptions))
                },
            },
        },
    )
    return virkshop
}

export const virkshop = await createVirkshop()

function pathOfCaller() {
    const err = new Error()
    const filePaths = findAll(/^.+file:\/\/(\/[\w\W]*?):/gm, err.stack).map(each=>each[1])
    
    // if valid file
    // FIXME: make sure this works inside of anonymous functions (not sure if error stack handles that well)
    const secondPath = filePaths[1]
    if (secondPath) {
        try {
            if (Deno.statSync(secondPath).isFile) {
                return secondPath
            }
        } catch (error) {
        }
    }
    // if in an interpreter
    return Deno.cwd()
}