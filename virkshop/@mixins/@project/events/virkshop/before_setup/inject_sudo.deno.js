export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        virkshop.injectUsersCommand(`sudo`)
        virkshop.injectUsersCommand(`doas`)
    }
}