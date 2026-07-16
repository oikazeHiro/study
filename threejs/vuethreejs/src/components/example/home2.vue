<template>
  <div ref="canvasContainer" class="canvas-fill" @click="onClickCanvas">
    <div class="ui-overlay">
      <el-button-group>
        <el-button size="small" @click="resetCamera">重置视角</el-button>
      </el-button-group>
      <el-tag size="small" :type="hitInfo.startsWith('命中') ? 'success' : 'info'">
        {{ hitInfo }}
      </el-tag>
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
import BatchedCarModel from "@/models/loaderModel/BatchedCarModel";
import { BatchedMeshFoundation } from "@/models/base/BatchedMeshFoundation";
import {getStaticUrl} from "@/utils/util";
import {ModelInstanceData} from "@/models/base2/ManagedModel";
import {THREE} from '@/utils/threeModules'
import {raycastModels} from '@/models/base2/RaycastHelper'
import {EffectComposer} from 'three/examples/jsm/postprocessing/EffectComposer.js'
import {RenderPass} from 'three/examples/jsm/postprocessing/RenderPass.js'
import {OutlinePass} from 'three/examples/jsm/postprocessing/OutlinePass.js'
import {OutputPass} from 'three/examples/jsm/postprocessing/OutputPass.js'

const canvasContainer = ref<HTMLElement | null>(null)
const loaded = ref(false)
const allVisible = ref(true)
const visibles = reactive<Record<string, boolean>>({})
const hitInfo = ref('点击模型查看实例信息')
const raycaster = new THREE.Raycaster()

// 后处理 & 选中描边
let composer: EffectComposer
let outlinePass: OutlinePass
/** 当前选中的描边代理 Mesh */
let outlineProxies: THREE.Object3D[] = []
let prevSelection: string | null = null

const testData: SceneData = {
  // sanHuoShip: {
  //   ship_01: {position: {x: 0, y: 0, z: 0}, rotation: {x: 0, y: 0, z: 0}, scale: {x: 1, y: 1, z: 1}, status: 'normal'},
  //   ...
  // },
  // zhuangZaiJi: { ... },
}

/**
 * 汽车网格参数 —— 调这里控制实例数量
 * BatchedMesh 会将所有几何体数据合并到 GPU 缓冲区，
 * 实例数 × 模型顶点数 = 总显存占用，根据 GPU 显存调整。
 *
 * 参考：单辆汽车约 50K~100K 顶点
 *   10×10 = 100 实例 → ~5M 顶点/车型 → ~160 MB/车型
 *   100×100 = 10,000 实例 → ~500M 顶点/车型 → ~16 GB/车型  ⚠️ 极高
 */
const CAR_GRID = 20       // 网格边长（10×10=100 辆/车型）
const CAR_SPACING = 5     // 车辆间距
const CAR_HEIGHT = 50   // 生成y 的高度

/** 生成汽车网格数据 */
const addCarGrid = (modelKey: string, offsetZ: number) => {
  const carData: Record<string, ModelInstanceData> = {}
  for (let i = 0; i < CAR_GRID; i++) {
    for (let j = 0; j < CAR_GRID; j++) {
      carData[`${modelKey}_${i}_${j}`] = {
        position: { x: CAR_SPACING * i, y: CAR_HEIGHT, z: offsetZ + CAR_SPACING * j },
        rotation: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        status: 'normal',
      }
    }
  }
  testData[modelKey] = carData
  console.log(modelKey+"data: ",carData)
}

const testDataAddData = () => {
  const h = 100; // 长
  const w = 100; // 宽
  const v = 10; // 高
  const x = 4.5;
  const container = new Map<string,ModelInstanceData>
  for (let i = 0; i < h; i++) {
    for (let j = 0; j < w; j++) {
      for (let k = 0; k < v; k++) {
        container.set(`container_${i}_${j}_${k}`,{
          position: {x: x*i, y: x*k, z: x*j},
          rotation: {x: 0, y: Math.PI/2, z: 0},
          scale: {x: 2, y: 1, z: 1},
          status: 'normal'
        })
      }
    }
  }
  // 输出 container 占多少内存

  testData.container = Object.fromEntries(container)
  // 汽车网格：3 种车型，各占一片区域
  // z 轴偏移让不同车型错开，避免重叠
  addCarGrid('chevrolet_m1009', CAR_GRID * CAR_SPACING * 0)
  // addCarGrid('test', CAR_GRID * CAR_SPACING * 1)
  addCarGrid('gt_001_vehicle',    CAR_GRID * CAR_SPACING * 2)
}

const testConfig: OrbitControlOptions = {
  minDistance: 1,
  maxDistance: 400,
  // 去掉 maxPolarAngle 限制，允许从任意角度观察（不限制俯仰）
  // 如果只想限制不过地面可用 Math.PI / 2 + 0.01 略过零点避免卡顿
  rotateSpeed: 0.8,       // 旋转速度略慢，更跟手
  dampingFactor: 0.08,    // 惯性稍大一点，手感更顺滑
  enableDamping: true,
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
  // primitive 是 gltf.scene（THREE.Scene/Group），需遍历找到实际 Mesh
  const meshes: THREE.Mesh[] = []
  primitive.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) meshes.push(child as THREE.Mesh)
  })
  const mesh = meshes[0]
  if (!mesh) {
    console.error('container.glb 中未找到 Mesh 节点')
    return model
  }

  // ----- UV 适配：GLTF → Three.js 纹理坐标转换 -----
  // GLTFLoader 设置 texture.flipY=false（UV 的 V=0 在图像顶部）
  // CanvasTexture（AtlasInstancedMeshFoundation 内部使用）默认 flipY=true（V=0 在图像底部）
  // 因此需要将几何体 UV 的 V 分量翻转，使纹理采样方向正确
  // 同时克隆几何体，避免修改共享的原始 GLB 几何体
  const geometry = mesh.geometry.clone()
  {
    const uvAttr = geometry.getAttribute('uv')
    const uvArr = uvAttr.array as Float32Array
    for (let i = 1; i < uvArr.length; i += 2) {
      uvArr[i] = 1.0 - uvArr[i]
    }
    uvAttr.needsUpdate = true
  }
  // 纹理图集：4 张图片（白/红/黄/蓝）列为 2，合为 2×2 图集
  // AtlasInstancedMeshFoundation 按此图集生成自定义 shader，各实例通过 tileIndex 选取颜色
  await model.initFromUrls(geometry, [
    getStaticUrl('~/assets/container/白色.png'),
    getStaticUrl('~/assets/container/红色.png'),
    getStaticUrl('~/assets/container/黄色.png'),
    getStaticUrl('~/assets/container/蓝色.png'),
  ], data, key, 2)
  return model;
})

// ======================== 汽车模型（BatchedMesh） ========================
// 注册工厂：primitive 是 GLB 加载后的 scene，直接传给 BatchedCarModel
manager.registerModel('chevrolet_m1009', (key, primitive, data) => {
  const model = new BatchedCarModel()
  model.init(key, data, primitive)
  return model
})
manager.registerModel('test', (key, primitive, data) => {
  const model = new BatchedCarModel()
  model.init(key, data, primitive)
  return model
})
manager.registerModel('gt_001_vehicle', (key, primitive, data) => {
  const model = new BatchedCarModel()
  model.init(key, data, primitive)
  return model
})

// 🧪 最小化 BatchedMesh 测试
manager.registerModel('_test_batch', (key, primitive, data) => {
  const model = new BatchedMeshFoundation()
  const geo = (primitive as THREE.Mesh).geometry
  const mat = (primitive as THREE.Mesh).material as THREE.Material
  const vc = geo.getAttribute('position').count
  const ic = geo.index ? geo.index.count : 0
  model.init(
    1, vc, ic,
    mat,
    [{ geometry: geo }],
    data, key,
  )
  return model
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
  manager.camera.position.set(100, 50, 100)
  manager.controls.target.set(0, 0, 0)
  manager.controls.update()
}

/** 清除上一次的描边代理 */
const clearOutline = () => {
  for (const obj of outlineProxies) {
    const idx = outlinePass.selectedObjects.indexOf(obj)
    if (idx !== -1) outlinePass.selectedObjects.splice(idx, 1)
    obj.parent?.remove(obj)
  }
  outlineProxies = []
}

/** 创建描边代理：克隆原始 GLB 放到实例位置 */
const createOutlineProxy = (modelKey: string, instanceKey: string, data: any) => {
  // 从 data 中读取变换
  const pos = data.position ?? {x: 0, y: 0, z: 0}
  const rot = data.rotation ?? {x: 0, y: 0, z: 0}
  const scl = data.scale ?? {x: 1, y: 1, z: 1}

  // 获取原始 GLB primitive
  const primitive = manager.loader.getModel(modelKey)
  if (!primitive) return

  const clone = primitive.clone(true)
  // 重置内部子节点缩放（GLB 导出可能自带 scale，如 container 的 0.5）
  // 保留子节点 position（多部件模型需要相对位置），然后 root 统一应用实例变换
  clone.traverse((child) => {
    child.scale.set(1, 1, 1)
  })
  clone.position.set(pos.x, pos.y, pos.z)
  clone.rotation.set(rot.x, rot.y, rot.z)
  clone.scale.set(scl.x, scl.y, scl.z)

  // 所有子节点关掉动画 / 自发光
  clone.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh
      if (mesh.material) {
        const mat = mesh.material as THREE.MeshStandardMaterial
        mat.emissive = new THREE.Color(0xffffff)
        mat.emissiveIntensity = 0
      }
    }
  })

  outlineProxies.push(clone)
  outlinePass.selectedObjects.push(clone)
  manager.scene.add(clone)
}

const onClickCanvas = (event: MouseEvent) => {
  if (!canvasContainer.value) return
  const rect = canvasContainer.value.getBoundingClientRect()
  const pointer = new THREE.Vector2(
    ((event.clientX - rect.left) / rect.width) * 2 - 1,
    -((event.clientY - rect.top) / rect.height) * 2 + 1,
  )
  raycaster.setFromCamera(pointer, manager.camera)

  const hits = raycastModels(manager.modelMap, raycaster)
  if (hits.length > 0) {
    const h = hits[0]
    // 找到该实例属于哪个 modelMap 的 key
    let modelKey = ''
    for (const [mk, m] of manager.modelMap) {
      if ((m as any).dataMap?.has(h.key)) {
        modelKey = mk
        break
      }
    }

    hitInfo.value = `命中: ${h.key}  modelKey=${modelKey || '?'}`
    console.log('点击了实例:', h.key, 'modelKey:', modelKey, h.data)

    // 更新描边
    clearOutline()
    if (modelKey) {
      createOutlineProxy(modelKey, h.key, h.data)
    }
  } else {
    hitInfo.value = '未命中任何实例'
    clearOutline()
  }
}

const init = async () => {
  if (!canvasContainer.value) return
  await manager.init()
  testDataAddData()
  const {clientWidth: w, clientHeight: h} = canvasContainer.value
  manager.setRendererSize(w, h)
  canvasContainer.value.appendChild(manager.renderer.domElement)
  manager.camera.position.set(100, 50, 100)
  manager.controls.target.set(0, 0, 0)
  manager.controls.update()
  config.apply(manager.controls)
  manager.stats.domElement.style.cssText = 'position:absolute;top:0;left:0;cursor:pointer;opacity:0.9'
  canvasContainer.value.appendChild(manager.stats.domElement)
  await manager.addLoaderSceneByData(testData)

  // ================= 后处理：Outline 描边 =================
  composer = new EffectComposer(manager.renderer)
  composer.addPass(new RenderPass(manager.scene, manager.camera))
  outlinePass = new OutlinePass(
    new THREE.Vector2(w, h),
    manager.scene,
    manager.camera,
  )
  outlinePass.edgeStrength = 4
  outlinePass.edgeGlow = 0.5
  outlinePass.edgeThickness = 2
  outlinePass.visibleEdgeColor = new THREE.Color(0xffffff)
  outlinePass.hiddenEdgeColor = new THREE.Color(0xffffff)
  composer.addPass(outlinePass)
  composer.addPass(new OutputPass())
  manager.customRender = () => composer.render()

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
  if (composer) composer.setSize(w, h)
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
