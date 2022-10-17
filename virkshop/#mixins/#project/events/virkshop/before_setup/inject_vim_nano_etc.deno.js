export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        virkshop.injectUsersCommand(`nano`)
        virkshop.injectUsersCommand(`vi`)
        virkshop.injectUsersCommand(`emacs`)
        virkshop.injectUsersCommand(`vim`)
        virkshop.injectUsersCommand(`pico`)
    }
}