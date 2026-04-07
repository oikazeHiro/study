<template>
  <el-container class="app-container">
    <!-- Canvas 背景层 -->
    <div ref="canvasContainer" class="canvas-background"></div>
    <!-- UI 叠加层 -->
    <div class="ui-layer">
    </div>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { debounce } from 'lodash-es'
import SceneModelManager from "@/models/base/SceneModelManager";

const canvasContainer = ref<HTMLElement | null>(null)
const sceneModelManager: SceneModelManager = new SceneModelManager()

const setRendererSize = (width: number, height: number) => {
  sceneModelManager.renderer.setSize(width, height)
}

// home.vue
const init = async () => {
  if (!canvasContainer.value) return

  // 等待模型加载器初始化完成
  await sceneModelManager.init()

  // 设置渲染器
  const { clientWidth: width, clientHeight: height } = canvasContainer.value
  setRendererSize(width, height)
  canvasContainer.value.appendChild(sceneModelManager.renderer.domElement)

  // 确保模型已加载完成后再添加数据
  addModel()

  sceneModelManager.stats.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
    opacity: 0.9;
  `
  canvasContainer.value.appendChild(sceneModelManager.stats.domElement)
}

const addModel = () => {
  const data = {

  }
  sceneModelManager.addLoaderSceneByData(data)
  console.log(sceneModelManager)
}


// 处理窗口大小变化
const handleResize = () => {
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  sceneModelManager.camera.aspect = width / height
  sceneModelManager.camera.updateProjectionMatrix()
  setRendererSize(width, height)
}

onMounted(() => {
  init()
  const debouncedResize = debounce(handleResize, 100)
  window.addEventListener('resize', debouncedResize)
  handleResize() // 初始调整
})
onUnmounted(() => {
  sceneModelManager.disposeAll()
})

</script>

<style scoped>
.el-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden; /* 隐藏容器滚动条 */
}

.el-main {
  padding: 0 !important;
  overflow: hidden; /* 隐藏 main 滚动条 */
}

.three-container {
  width: 100%;
  height: 100%;
  position: relative;
  touch-action: none; /* 防止触摸事件冲突 */
  overflow: hidden; /* 隐藏容器滚动条 */
}

/* 全局样式 - 确保 body 和 html 没有滚动条 */
:global(html),
:global(body) {
  margin: 0;
  padding: 0;
  overflow: hidden;
}

/* Canvas 背景层 */
.canvas-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

/* UI 叠加层 */
.ui-layer {
  position: relative;
  z-index: 2;
  height: 100%;
  background: transparent; /* 透明背景 */
}
</style>
