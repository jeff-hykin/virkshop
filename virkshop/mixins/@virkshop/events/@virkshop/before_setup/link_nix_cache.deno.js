export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        // TODO: I don't think this is the correct folder name
        virkshop.linkRealHomeFolder(`.cache/nix`)
    }
}
