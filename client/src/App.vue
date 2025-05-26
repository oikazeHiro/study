<template>
  <el-config-provider :locale="zhCn">
    <hello-world  msg="hello world"/>
  </el-config-provider>
</template>

<script setup lang="ts">
import { ElConfigProvider } from 'element-plus'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import HelloWorld from "./components/HelloWorld.vue";
</script>
