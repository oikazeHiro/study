<template>
  <!-- three.js 渲染容器 -->
  <div ref="canvasContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from 'vue'
import {THREE, OrbitControls, Stats} from '~/utils/three-modules'
import {debounce} from "lodash-es";

// three.js 容器 DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)
// 渲染器
const renderer = new THREE.WebGLRenderer({
  antialias: true, // 抗锯齿
  alpha: true      // 透明背景
})
const scene = new THREE.Scene() // 创建场景
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) // 透视相机

// 创建三个球体
const sphere1 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({color: 0xffff00})
)
const sphere2 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({color: 0xffff00})
)
const sphere3 = new THREE.Mesh(
    new THREE.SphereGeometry(1, 32, 32),
    new THREE.MeshBasicMaterial({color: 0xffff00})
)

// 设置球体位置
sphere1.position.set(3, 0, 0)  // 避免太靠近边缘
sphere2.position.set(-3, 0, 0)
sphere3.position.set(0, 3, 0)  // 放在不同高度

scene.add(sphere1)
scene.add(sphere2)
scene.add(sphere3)

let meshes = [sphere1, sphere2, sphere3] // 存储所有球体 Mesh
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(); // 创建一个二维向量来存储鼠标位置

scene.add(new THREE.AxesHelper(5)) // 坐标轴辅助器

let animationFrameId: number = 0 // 动画帧 ID
const stats = new Stats() // 性能监控面板
let controls: OrbitControls | null = null // 轨道控制器
const clock = new THREE.Clock() // 时钟，用于计算时间差

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  stats.update()
  controls?.update()
  renderer.render(scene, camera)
}

// 初始化 three.js 场景、相机、渲染器、性能面板和轨道控制器
const initThree = () => {
  // 检查容器 DOM 是否存在
  if (!canvasContainer.value) return
  // 获取容器宽高
  const {clientWidth: width, clientHeight: height} = canvasContainer.value
  // 设置渲染器尺寸
  renderer.setSize(width, height)
  // 设置像素比，防止高分屏模糊
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  // 设置渲染器背景色
  renderer.setClearColor(0xf0f0f0)
  // 将渲染器 DOM 添加到容器
  canvasContainer.value.appendChild(renderer.domElement)
  // 设置相机宽高比
  camera.aspect = width / height
  // 设置相机位置（更近的观察距离）
  camera.position.set(5, 5, 5)
  // 相机朝向原点
  camera.lookAt(0, 0, 0)
  // 更新相机投影矩阵
  camera.updateProjectionMatrix()
  // 设置 stats 面板样式
  stats.domElement.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    cursor: pointer;
    opacity: 0.9;
  `
  // 将 stats 面板添加到容器
  canvasContainer.value.appendChild(stats.domElement)
  // 初始化轨道控制器
  controls = new OrbitControls(camera, renderer.domElement)
  // 设置控制器目标点为原点
  controls.target.set(0, 0, 0)
  // 启用阻尼（惯性）
  controls.enableDamping = true
  // 设置阻尼系数
  controls.dampingFactor = 0.05
}

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

// 鼠标点击处理函数
const handleMouseDown = (evt: MouseEvent) => {
  if (!canvasContainer.value) return

  // 获取容器在视口中的位置
  const rect = canvasContainer.value.getBoundingClientRect()
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight

  // 计算相对于容器的坐标
  const x = evt.clientX - rect.left
  const y = evt.clientY - rect.top

  // 转换为three.js的标准化设备坐标
  pointer.x = (x / width) * 2 - 1
  pointer.y = -(y / height) * 2 + 1

  console.log('鼠标位置:', pointer)

  // 更新射线
  raycaster.setFromCamera(pointer, camera)

  // 检测交互
  const intersects = raycaster.intersectObjects(meshes)
  console.log('射线交点:', intersects)

  // 高亮选中的球体（视觉反馈）
  meshes.forEach(mesh => {
    (mesh.material as THREE.MeshBasicMaterial).color.set(0xffff00) // 黄色
  })

  if (intersects.length > 0) {
    const selectedMesh = intersects[0].object as THREE.Mesh
    const material = selectedMesh.material as THREE.MeshBasicMaterial
    material.color.set(0xff0000) // 红色

    // 获取射线方向（调试用）
    const rayOrigin = raycaster.ray.origin.clone()
    const rayDirection = raycaster.ray.direction.clone()
    console.log('射线方向:', rayOrigin)
    console.log('射线方向:', rayDirection)
  }
}

// 防抖处理窗口尺寸变化
let debouncedResize = debounce(handleResize, 100)

// 生命周期：组件挂载
onMounted(() => {
  initThree()
  window.addEventListener('resize', debouncedResize)
  handleResize()
  // 添加鼠标事件监听
  window.addEventListener('mousedown', handleMouseDown)
  animate()
})

// 生命周期：组件卸载，清理资源
onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  // 移除鼠标事件监听
  window.removeEventListener('mousedown', handleMouseDown)
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
</script>

<style scoped>
.three-container {
  width: 100%;
  height: 100%;
  position: relative;
  touch-action: none;
}
</style>