<template>
  <div class="card">
    <button type="button" @click="toggleDark()">count is {{ count }}</button>
  </div>
</template>

<script setup lang="ts">
import {ref} from 'vue'
import {toggleDark} from '~/composables'

const count = ref(0)

</script>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
