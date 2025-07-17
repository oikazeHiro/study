<template>
  <el-container>
    <el-main>
      <div ref="canvasContainer" class="three-container"></div>
    </el-main>
  </el-container>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { debounce } from 'lodash-es'
import { THREE, OrbitControls, Stats } from '~/utils/three-modules'

// DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)

// Three.js 核心对象
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) // aspect 初始设为1
const renderer = new THREE.WebGLRenderer({ 
  antialias: true,
  alpha: true // 透明背景
})
const clock = new THREE.Clock()
const stats = new Stats()
let cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>
let controls: OrbitControls | null = null
let animationFrameId: number = 0

// 初始化场景
const initScene = () => {
  // 立方体
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshLambertMaterial({ 
    color: 0x00ff00,
    transparent: true,
    opacity: 0.9
  })
  cube = new THREE.Mesh(geometry, material)
  cube.position.set(0, 0.5, 0)
  scene.add(cube)

  // 光源
  scene.add(new THREE.AmbientLight(0x404040))
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  // 辅助工具
  scene.add(new THREE.AxesHelper(2))
}

// 处理窗口大小变化
const handleResize = () => {
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  
  // 更新性能监控
  stats.update()
  
  // 旋转立方体
  cube.rotation.y += 0.01
  
  // 更新控制器
  controls?.update()
  
  // 渲染场景
  renderer.render(scene, camera)
}

// 初始化Three.js
const initThree = () => {
  if (!canvasContainer.value) return
  
  // 设置渲染器
  const { clientWidth: width, clientHeight: height } = canvasContainer.value
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xf0f0f0)
  canvasContainer.value.appendChild(renderer.domElement)
  
  // 设置相机
  camera.aspect = width / height
  camera.position.set(5, 5, 5)
  camera.lookAt(0, 0, 0)
  camera.updateProjectionMatrix()
  
  // 添加性能监控
  stats.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
    opacity: 0.9;
  `
  canvasContainer.value.appendChild(stats.domElement)
  
  // 初始化控制器
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
}

// 组件挂载
onMounted(() => {
  initThree()
  initScene()
  
  const debouncedResize = debounce(handleResize, 100)
  window.addEventListener('resize', debouncedResize)
  handleResize() // 初始调整
  
  animate()
  
  onUnmounted(() => {
    window.removeEventListener('resize', debouncedResize)
    cancelAnimationFrame(animationFrameId)
    controls?.dispose()
    
    // 清理材质和几何体
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        obj.material?.dispose()
      }
    })
    
    renderer.dispose()
  })
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
  touch-action: none; /* 防止触摸事件冲突 */
}
</style>