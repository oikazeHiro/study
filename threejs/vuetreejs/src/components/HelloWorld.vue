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
.el-container {
  height: 98vh;
  overflow: hidden;
}

.el-aside {
  width: 120px !important; /* 固定侧边栏宽度 */
}

.el-main {
  padding: 0 !important;
  overflow: hidden; /* 新增 */
}
</style>
