<template>
  <!-- three.js 渲染容器 -->
  <div ref="canvasContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from 'vue'
import {THREE, OrbitControls, Stats} from '@/utils/threeModules'
import group from '@/models/other/gltfTest'
import {debounce} from "lodash-es";

// three.js 容器 DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)

let animationFrameId: number = 0 // 动画帧 ID
const scene = new THREE.Scene() // 创建场景
let controls: OrbitControls | null = null // 轨道控制器
scene.add(group) // 添加模型点云
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) // 透视相机
const renderer = new THREE.WebGLRenderer({
  antialias: true, // 抗锯齿
  alpha: true      // 透明背景
})
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 环境光
scene.add(ambientLight)
scene.add(new THREE.AxesHelper(2)) // 坐标轴辅助器
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5).normalize() // 定向光
scene.add(directionalLight)

// 处理窗口尺寸变化
const handleResize = async () => {
  await nextTick()
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}
// 防抖处理窗口尺寸变化
let debouncedResize = debounce(handleResize, 100)

const stats = new Stats() // 性能监控面板

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  stats.update()
  controls?.update()
  renderer.render(scene, camera)
}

// three.js 初始化
const initThree = () => {
  if (!canvasContainer.value) return
  const {clientWidth: width, clientHeight: height} = canvasContainer.value
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xf0f0f0)
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  canvasContainer.value.appendChild(renderer.domElement)
  camera.aspect = width / height
  camera.position.set(2, 2, 2)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  // 设置 stats 面板样式
  stats.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
    opacity: 0.9;
  `
  canvasContainer.value.appendChild(stats.domElement)
  // 初始化轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
}

// 生命周期：组件挂载
onMounted(() => {
  initThree()
  window.addEventListener('resize', debouncedResize)
  handleResize()
  animate()
})

// 生命周期：组件卸载，清理资源
onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  cancelAnimationFrame(animationFrameId)
  controls?.dispose()
  // 释放场景中所有 mesh 的几何体和材质
  scene.traverse(obj => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      obj.material?.dispose()
    }
  })
  renderer.dispose()
  debouncedResize.cancel()
})
defineExpose({
  handleResize
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  position: relative;
  touch-action: none;
}
</style>
