<template>
  <q-page class="flex flex-center">
    <img
      alt="Quasar logo"
      src="~assets/quasar-logo-vertical.svg"
      style="width: 200px; height: 200px"
    >
    
    <button @click="doAThing">
        Run me
    </button>
  </q-page>
</template>

<script>
import { defineComponent, onMounted } from 'vue'

export default defineComponent({
    name: 'IndexPage',
    setup() {
        onMounted(()=> {
            console.log(`hi`)
        })
    },
    methods: {
        doAThing() {
            window.myAPI.doAThing()
        }
    }
})
</script>
