<template>
  <div ref="canvasContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import { tr } from 'element-plus/es/locales.mjs'
import { ref, onMounted, onUnmounted } from 'vue'
import {THREE,OrbitControls} from '~/utils/three-modules' // 引入集中管理的 Three.js 模块

// 1. 使用 ref 引用 DOM 元素
const canvasContainer = ref<HTMLElement | null>(null)

// 2. 集中管理 Three.js 核心对象
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
const renderer = new THREE.WebGLRenderer({ antialias: true })
let controls: OrbitControls
let animationFrameId: number

// 3. 初始化场景内容
const initScene = () => {
  // 创建立方体
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshLambertMaterial({ color: 0x00ff00 })
  const cube = new THREE.Mesh(geometry, material)
  cube.position.set(0, 0.5, 0) // 调整为更合理的比例
  scene.add(cube)


  // 添加光源
  const light = new THREE.AmbientLight(0x404040) // 环境光
  scene.add(light)

  // 添加坐标轴辅助
  const axesHelper = new THREE.AxesHelper(2)
  scene.add(axesHelper)

  // 设置相机
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
}

// 4. 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

// 5. 响应式处理窗口大小变化
const handleResize = () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
}

onMounted(() => {
  if (!canvasContainer.value) return

  // 初始化渲染器
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)) // 限制高DPI设备像素比
  canvasContainer.value.appendChild(renderer.domElement)

  // 初始化场景和控制器
  initScene()
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true // 启用阻尼效果
  controls.dampingFactor = 0.05

  // 启动动画循环
  animate()
  window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
  // 清理资源
  window.removeEventListener('resize', handleResize)
  cancelAnimationFrame(animationFrameId)
  controls?.dispose()
  renderer.dispose()
})
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>