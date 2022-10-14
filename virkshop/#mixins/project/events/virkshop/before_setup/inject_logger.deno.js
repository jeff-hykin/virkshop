export const deadlines = {
    async beforeEnteringVirkshop(virkshop) {
        virkshop.injectUsersCommand(`logger`)
    }
}