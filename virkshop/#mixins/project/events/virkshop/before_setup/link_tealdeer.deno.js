export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        if (Deno.build.os == 'darwin') {
            virkshop.linkRealHomeFor(`Library/Caches/tealdeer`)
        } else {
            virkshop.linkRealHomeFor(`.cache/tldr`)
        }
    }
}