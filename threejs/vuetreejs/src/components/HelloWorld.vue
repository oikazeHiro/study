<template>
  <el-container>
    <el-aside>
      <el-row v-for="route in routes" :key="route.path">
        <el-button @click="toFirst(route.path)">
          {{ route.name }}
        </el-button>
      </el-row>
    </el-aside>
    <el-main>
      <router-view></router-view>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router';

const router = useRouter();
const routes = ref(router.getRoutes());
console.log('routes', routes.value);
const toFirst = (path: string) => {
  // 跳转到第一个组件
  router.push(path);
}

</script>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
