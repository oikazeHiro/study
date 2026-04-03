<template>
  <el-container>
    <el-main>
      <div ref="canvasContainer" class="three-container"></div>
    </el-main>
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
  overflow: hidden;
}

.el-main {
  padding: 0 !important;
  overflow: hidden;
}

.three-container {
  width: 100%;
  height: 100%;
  position: relative;
  touch-action: none;
  /* 防止触摸事件冲突 */
}
</style>
