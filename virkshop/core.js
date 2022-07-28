import { FileSystem } from "https://deno.land/x/quickr@0.3.38/main/file_system.js"
import { run, hasCommand, throwIfFails, zipInto, mergeInto, returnAsString, Timeout, Env, Cwd, Stdin, Stdout, Stderr, Out, Overwrite, AppendTo } from "https://deno.land/x/quickr@0.3.38/main/run.js"
import { Console, clearStylesFrom, black, white, red, green, blue, yellow, cyan, magenta, lightBlack, lightWhite, lightRed, lightGreen, lightBlue, lightYellow, lightMagenta, lightCyan, blackBackground, whiteBackground, redBackground, greenBackground, blueBackground, yellowBackground, magentaBackground, cyanBackground, lightBlackBackground, lightRedBackground, lightGreenBackground, lightYellowBackground, lightBlueBackground, lightMagentaBackground, lightCyanBackground, lightWhiteBackground, bold, reset, dim, italic, underline, inverse, hidden, strikethrough, visible, gray, grey, lightGray, lightGrey, grayBackground, greyBackground, lightGrayBackground, lightGreyBackground, } from "https://deno.land/x/quickr@0.3.38/main/console.js"

// FIXME: detect folder so this can be an external library
// TODO: detect the path of the caller in the event that a single project has multiple virkshops for some reason
// const virkshopIdentifierPath = `mixins/virkshop/settings/virkshop/`
// const folders = await FileSystem.listFolderPathsIn(FileSystem.pwd)
// let virkshopFolder
// for (const eachPath of folders) {
//     const indentifierInfo = await FileSystem.info(`${eachPath}/${virkshopIdentifierPath}`)
//     if (indentifierInfo.isFolder) {
        
//     }
// }
// let virkshopFolder = await FileSystem.walkUpUntil(virkshopIdentifierPath)
// if (virkshopFolder == null) {
// }

export const virkshop = Object.defineProperties(
    {
        name: FileSystem.basename(FileSystem.thisFolder),
        pathTo: Object.defineProperties(
            {
                project: FileSystem.makeAbsolutePath(FileSystem.parentPath(FileSystem.thisFolder)), // subject to change within this file
                realHome: Console.env.HOME,
            },
            {
                virkshop: { get() { return `${virkshop.pathTo.project}/${virkshop.name}/` }},
                settings: { get() { return `${virkshop.pathTo.mixture}/settings` }},
                fakeHome: { get() { return `${virkshop.pathTo.mixture}/temporary/long_term/home` }},
                mixins:   { get() { return `${virkshop.pathTo.virkshop}/#mixins` }},
                mixture:  { get() { return `${virkshop.pathTo.virkshop}/#mixture` }},
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
        }
    },
)