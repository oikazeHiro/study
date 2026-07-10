<template>
  <div ref="canvasContainer" class="canvas-fill">
    <div class="ui-overlay">
      <el-button-group>
        <el-button size="small" @click="toggleAll">
          {{ allVisible ? '全部隐藏' : '全部显示' }}
        </el-button>
        <el-button size="small" @click="resetCamera">重置视角</el-button>
      </el-button-group>
      <div class="instance-list" v-if="loaded">
        <el-tag
          v-for="(_, key) in testData.sanHuoShip"
          :key="key"
          size="small"
          :type="visibles[key] !== false ? '' : 'info'"
          @click="toggleOne('sanHuoShip', key)"
        >{{ key }}</el-tag>
        <el-divider direction="vertical" />
        <el-tag
          v-for="(_, key) in testData.zhuangZaiJi"
          :key="key"
          size="small"
          :type="visibles[key] !== false ? 'success' : 'info'"
          @click="toggleOne('zhuangZaiJi', key)"
        >{{ key }}</el-tag>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref, reactive } from 'vue'
import { debounce } from 'lodash-es'
import { getCurrentInstance } from 'vue'
import SceneModelManager2 from '@/models/base2/SceneModelManager2'
import TestModelLoader from '@/models/test/TestModelLoader'
import ModsMethodStandardImpl from '@/models/base/ModsMethodStandardImpl'
import type { SceneData } from '@/models/base2/SceneModelManager2'

const canvasContainer = ref<HTMLElement | null>(null)
const loaded = ref(false)
const allVisible = ref(true)
const visibles = reactive<Record<string, boolean>>({})

const testData: SceneData = {
  sanHuoShip: {
    ship_01: { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, status: 'normal' },
    ship_02: { position: { x: 8, y: 0, z: 4 }, rotation: { x: 0, y: Math.PI / 4, z: 0 }, scale: { x: 0.8, y: 0.8, z: 0.8 }, status: 'normal' },
    ship_03: { position: { x: -8, y: 0, z: -4 }, rotation: { x: 0, y: -Math.PI / 3, z: 0 }, scale: { x: 1.2, y: 1.2, z: 1.2 }, status: 'normal' },
    ship_04: { position: { x: 4, y: 0, z: -8 }, rotation: { x: 0, y: Math.PI / 2, z: 0 }, scale: { x: 0.6, y: 0.6, z: 0.6 }, status: 'hidden' },
  },
  zhuangZaiJi: {
    zzj_01: { position: { x: 3, y: 0, z: 3 }, rotation: { x: 0, y: 0, z: 0 }, scale: { x: 1, y: 1, z: 1 }, status: 'normal' },
    zzj_02: { position: { x: -5, y: 0, z: 5 }, rotation: { x: 0, y: Math.PI, z: 0 }, scale: { x: 1, y: 1, z: 1 }, status: 'normal' },
  },
}

const manager = new SceneModelManager2()
manager.loader = new TestModelLoader()

// 用工厂注册替代旧的 registerModel + addModsMethodStandardByKey
manager.registerModel('sanHuoShip', (key, primitive, data) => {
  const model = new ModsMethodStandardImpl()
  model.setAnimationClips(manager.loader.getAnimations(key) ?? [])
  model.init(key, data, primitive)
  return model
})
manager.registerModel('zhuangZaiJi', (key, primitive, data) => {
  const model = new ModsMethodStandardImpl()
  model.setAnimationClips(manager.loader.getAnimations(key) ?? [])
  model.init(key, data, primitive)
  return model
})

const toggleAll = () => {
  allVisible.value = !allVisible.value
  const visible = allVisible.value
  const patch: SceneData = {}
  for (const [modelKey, instances] of Object.entries(testData)) {
    const updates: Record<string, { visible: boolean }> = {}
    for (const key of Object.keys(instances)) {
      updates[key] = { visible }
      visibles[key] = visible
    }
    patch[modelKey] = updates
  }
  manager.updateModelByData(patch)
}

const toggleOne = (modelKey: string, instanceKey: string) => {
  const next = visibles[instanceKey] !== false
  visibles[instanceKey] = !next
  manager.updateModelByData({
    [modelKey]: { [instanceKey]: { visible: !next } },
  })
}

const resetCamera = () => {
  manager.camera.position.set(20, 15, 25)
  manager.controls.target.set(0, 0, 0)
  manager.controls.update()
}

const init = async () => {
  if (!canvasContainer.value) return
  await manager.init()
  const { clientWidth: w, clientHeight: h } = canvasContainer.value
  manager.setRendererSize(w, h)
  canvasContainer.value.appendChild(manager.renderer.domElement)
  manager.camera.position.set(20, 15, 25)
  manager.controls.target.set(0, 0, 0)
  manager.controls.update()
  manager.stats.domElement.style.cssText = 'position:absolute;top:0;left:0;cursor:pointer;opacity:0.9'
  canvasContainer.value.appendChild(manager.stats.domElement)
  manager.addLoaderSceneByData(testData)
  for (const instances of Object.values(testData)) {
    for (const key of Object.keys(instances)) {
      visibles[key] = true
    }
  }
  loaded.value = true
}

const handleResize = () => {
  if (!canvasContainer.value) return
  const { clientWidth: w, clientHeight: h } = canvasContainer.value
  manager.camera.aspect = w / h
  manager.camera.updateProjectionMatrix()
  manager.setRendererSize(w, h)
}

const debouncedResize = debounce(handleResize, 100)

onMounted(() => {
  init()
  window.addEventListener('resize', debouncedResize)
  handleResize()
})

onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  manager.disposeAll()
})
</script>

<style scoped>
.canvas-fill {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  position: relative;
}
.ui-overlay {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  pointer-events: none;
}
.ui-overlay > * {
  pointer-events: auto;
}
.instance-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
}
</style>
