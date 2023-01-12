export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        if (Deno.build.os == 'darwin') {
            virkshop.linkRealHomeFolder(`Library/Caches/tealdeer`)
        } else {
            virkshop.linkRealHomeFolder(`.cache/tldr`)
        }
    }
}