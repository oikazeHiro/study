<template>
  <div ref="canvasContainer" class="canvas-fill">
    <div class="ui-overlay">
      <el-button-group>
        <el-button size="small" @click="toggleAll">
          {{ allVisible ? '全部隐藏' : '全部显示' }}
        </el-button>
        <el-button size="small" @click="resetCamera">重置视角</el-button>
      </el-button-group>
      <div v-if="loaded" class="instance-list">
        <el-tag
            v-for="(_, key) in testData.sanHuoShip"
            :key="key"
            :type="visibles[key] !== false ? '' : 'info'"
            size="small"
            @click="toggleOne('sanHuoShip', key)"
        >{{ key }}
        </el-tag>
        <el-divider direction="vertical"/>
        <el-tag
            v-for="(_, key) in testData.zhuangZaiJi"
            :key="key"
            :type="visibles[key] !== false ? 'success' : 'info'"
            size="small"
            @click="toggleOne('zhuangZaiJi', key)"
        >{{ key }}
        </el-tag>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, reactive, ref} from 'vue'
import {debounce} from 'lodash-es'
import type {SceneData} from '@/models/base2/SceneModelManager2'
import SceneModelManager2 from '@/models/base2/SceneModelManager2'
import TestModelLoader from '@/models/test/TestModelLoader'
import ModsMethodStandardImpl from '@/models/base/ModsMethodStandardImpl'

import {OrbitControlConfig, OrbitControlOptions} from '@/models/base2/OrbitControlConfig'
import SanHuoShipModel from "@/models/loaderModel/SanHuoShipModel";
import ContainerModel from "@/models/loaderModel/ContainerModel";
import {AtlasInstancedMeshFoundation} from "@/models/base/AtlasInstancedMeshFoundation";
import {getStaticUrl} from "@/utils/util";
import {ModelInstanceData} from "@/models/base2/ManagedModel";
import {THREE} from '@/utils/threeModules'

const canvasContainer = ref<HTMLElement | null>(null)
const loaded = ref(false)
const allVisible = ref(true)
const visibles = reactive<Record<string, boolean>>({})

const testData: SceneData = {
  // sanHuoShip: {
  //   ship_01: {position: {x: 0, y: 0, z: 0}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, status: 'normal'},
  //   ship_02: {
  //     position: {x: 8, y: 0, z: 4},
  //     rotation: {x: 0, y: Math.PI / 4, z: 0},
  //     scale: {x: 0.8, y: 0.8, z: 0.8},
  //     status: 'normal'
  //   },
  //   ship_03: {
  //     position: {x: -8, y: 0, z: -4},
  //     rotation: {x: 0, y: -Math.PI / 3, z: 0},
  //     scale: {x: 1.2, y: 1.2, z: 1.2},
  //     status: 'normal'
  //   },
  //   ship_04: {
  //     position: {x: 4, y: 0, z: -8},
  //     rotation: {x: 0, y: Math.PI / 2, z: 0},
  //     scale: {x: 0.6, y: 0.6, z: 0.6},
  //     status: 'hidden'
  //   },
  // },
  // zhuangZaiJi: {
  //   zzj_01: {position: {x: 3, y: 0, z: 3}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, status: 'normal'},
  //   zzj_02: {
  //     position: {x: -5, y: 0, z: 5},
  //     rotation: {x: 0, y: Math.PI, z: 0},
  //     scale: {x: 1, y: 1, z: 1},
  //     status: 'normal'
  //   },
  // },
}

const testDataAddData = () => {
  const h = 100; // 长
  const w = 100; // 宽
  const v = 10; // 高
  const x = 1.5;
  const container = new Map<string,ModelInstanceData>
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      for (let k = 0; k < v; k++) {
        container.set(`container_${i}_${j}_${k}`,{
          position: {x: x*i, y: x*k, z: x*j},
          rotation: {x: 0, y: 0, z: 0},
          scale: {x: 1, y: 1, z: 1},
          status: 'normal'
        })
      }
    }
  }
  testData.container = Object.fromEntries(container)
  const geometry = new THREE.BoxGeometry( 1, 1, 1 );
  AtlasInstancedMeshFoundation.remapBoxUVForCrossLayout(geometry);
  const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
  const cube = new THREE.Mesh( geometry, material );
  manager.loader.loadedModels.set("container",cube);
  console.log(testData)
}

const testConfig: OrbitControlOptions = {
  minDistance: 1,
  maxDistance: 400,
  maxPolarAngle: Math.PI / 2,
}

const manager = new SceneModelManager2()
manager.loader = new TestModelLoader()
const config = new OrbitControlConfig(testConfig)

// 用工厂注册替代旧的 registerModel + addModsMethodStandardByKey
manager.registerModel('sanHuoShip', (key, primitive, data) => {
  const model = new SanHuoShipModel()
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

manager.registerModel('container', async (key, primitive, data) => {
  const model = new ContainerModel()
  // initFromUrls 期望 BufferGeometry，但 primitive 是 Mesh，需要取 .geometry
  const geometry = (primitive as THREE.Mesh).geometry
  await model.initFromUrls(geometry, [
    getStaticUrl('~/assets/container/Wood095_1K-JPG_Color.jpg'),
    getStaticUrl('~/assets/container/PavingStones150_1K-JPG_Color.jpg'),
    getStaticUrl('~/assets/container/PavingStones149_1K-JPG_Color.jpg'),
  ], data, key, 2)
  return model;
})

const toggleAll = () => {
  allVisible.value = !allVisible.value
  const visible = allVisible.value
  const patch: SceneData = {}
  for (const [modelKey, instances] of Object.entries(testData)) {
    const updates: Record<string, { visible: boolean }> = {}
    for (const key of Object.keys(instances)) {
      updates[key] = {visible}
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
    [modelKey]: {[instanceKey]: {visible: !next}},
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
  testDataAddData()
  const {clientWidth: w, clientHeight: h} = canvasContainer.value
  manager.setRendererSize(w, h)
  canvasContainer.value.appendChild(manager.renderer.domElement)
  manager.camera.position.set(20, 15, 25)
  manager.controls.target.set(0, 0, 0)
  manager.controls.update()
  config.apply(manager.controls)
  manager.stats.domElement.style.cssText = 'position:absolute;top:0;left:0;cursor:pointer;opacity:0.9'
  canvasContainer.value.appendChild(manager.stats.domElement)
  await manager.addLoaderSceneByData(testData)
  for (const instances of Object.values(testData)) {
    for (const key of Object.keys(instances)) {
      visibles[key] = true
    }
  }
  loaded.value = true
}

const handleResize = () => {
  if (!canvasContainer.value) return
  const {clientWidth: w, clientHeight: h} = canvasContainer.value
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
