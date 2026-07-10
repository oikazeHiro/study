<template>
  <el-container class="app-container">
    <div ref="canvasContainer" class="canvas-background"></div>
    <div class="ui-layer">
      <div class="toolbar">
        <el-button-group>
          <el-button size="small" @click="toggleAllVisibility">
            {{ allVisible ? '全部隐藏' : '全部显示' }}
          </el-button>
          <el-button size="small" @click="resetCamera">重置视角</el-button>
        </el-button-group>
        <el-progress
          v-if="loadingProgress < 100"
          :percentage="loadingProgress"
          :stroke-width="6"
          class="progress-bar"
        />
        <div class="instance-list" v-if="loadingProgress === 100">
          <el-tag
            v-for="(_, key) in testSceneData.sanHuoShip"
            :key="key"
            size="small"
            :type="modelVisibles[key] !== false ? '' : 'info'"
            @click="toggleInstance(key)"
            class="instance-tag"
          >
            {{ key }}
          </el-tag>
          <el-divider direction="vertical" />
          <el-tag
            v-for="(_, key) in testSceneData.zhuangZaiJi"
            :key="key"
            size="small"
            :type="modelVisibles[key] !== false ? 'success' : 'info'"
            @click="toggleInstance(key)"
            class="instance-tag"
          >
            {{ key }}
          </el-tag>
        </div>
      </div>
    </div>
  </el-container>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import { debounce } from 'lodash-es'
import SceneModelManager from "@/models/base/SceneModelManager";
import TestModelLoader from '@/models/test/TestModelLoader';
import { testSceneData } from '@/models/test/testData';
import ModsMethodStandardImpl from '@/models/base/ModsMethodStandardImpl';

const canvasContainer = ref<HTMLElement | null>(null)
const loadingProgress = ref(0)
const allVisible = ref(true)
const modelVisibles = reactive<Record<string, boolean>>({})

const sceneModelManager = new SceneModelManager()

sceneModelManager.modelStandardLoader = new TestModelLoader()
SceneModelManager.registerModel('zhuangZaiJi', ModsMethodStandardImpl)

sceneModelManager.setOnProgressCallback((progress: number) => {
  loadingProgress.value = progress
})

const setRendererSize = (width: number, height: number) => {
  sceneModelManager.renderer.setSize(width, height)
}

const toggleAllVisibility = () => {
  allVisible.value = !allVisible.value
  const status = allVisible.value ? 'normal' : 'hidden'
  for (const [modelKey, instances] of Object.entries(testSceneData)) {
    const mapData = new Map<string, { status: string }>()
    for (const instanceKey of Object.keys(instances)) {
      mapData.set(instanceKey, { status })
      modelVisibles[instanceKey] = allVisible.value
    }
    sceneModelManager.modelMap.get(modelKey)?.updateAll(mapData)
  }
}

const toggleInstance = (instanceKey: string) => {
  const next = modelVisibles[instanceKey] !== false ? 'hidden' : 'normal'
  modelVisibles[instanceKey] = next === 'normal'
  for (const [modelKey, instances] of Object.entries(testSceneData)) {
    if (instanceKey in instances) {
      const mapData = new Map([[instanceKey, { status: next }]])
      sceneModelManager.modelMap.get(modelKey)?.updateAll(mapData)
      break
    }
  }
}

const resetCamera = () => {
  sceneModelManager.camera.position.set(20, 15, 25)
  sceneModelManager.controls.target.set(0, 0, 0)
  sceneModelManager.controls.update()
}

const init = async () => {
  if (!canvasContainer.value) return

  await sceneModelManager.init()

  const { clientWidth: width, clientHeight: height } = canvasContainer.value
  setRendererSize(width, height)
  canvasContainer.value.appendChild(sceneModelManager.renderer.domElement)

  sceneModelManager.camera.position.set(20, 15, 25)
  sceneModelManager.controls.target.set(0, 0, 0)
  sceneModelManager.controls.update()

  sceneModelManager.stats.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
    opacity: 0.9;
  `
  canvasContainer.value.appendChild(sceneModelManager.stats.domElement)

  sceneModelManager.addLoaderSceneByData(testSceneData)

  for (const instances of Object.values(testSceneData)) {
    for (const key of Object.keys(instances)) {
      modelVisibles[key] = true
    }
  }
}

const handleResize = () => {
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  sceneModelManager.camera.aspect = width / height
  sceneModelManager.camera.updateProjectionMatrix()
  setRendererSize(width, height)
}

const debouncedResize = debounce(handleResize, 100)

onMounted(() => {
  init()
  window.addEventListener('resize', debouncedResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  sceneModelManager.disposeAll()
})
</script>

<style scoped>
.el-container {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.canvas-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
}

.ui-layer {
  position: relative;
  z-index: 2;
  height: 100%;
  background: transparent;
  pointer-events: none;
}

.toolbar {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: auto;
}

.progress-bar {
  width: 200px;
}

.instance-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}

.instance-tag {
  cursor: pointer;
}
</style>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  width: 100%;
  height: 100%;
}
</style>
