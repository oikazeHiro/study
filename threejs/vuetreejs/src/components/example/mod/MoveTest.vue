<template>
  <div ref="canvasContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from 'vue'
import {THREE, OrbitControls, Stats,Ammo} from '@/utils/threeModules'
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
const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 环境光
scene.add(ambientLight)
scene.add(new THREE.AxesHelper(15)) // 坐标轴辅助器
scene.add(new THREE.GridHelper( 30, 30 ))
// const btCollisionDispatcher = new Ammo.btCollisionDispatcher();


// 创建一个柱体
const cylinderGeometry = new THREE.CylinderGeometry(0.2, 0.2, 1, 32)
const cylinderMaterial = new THREE.MeshBasicMaterial({color: 0x00ff00}) // 绿色材质
const cylinder = new THREE.Mesh(cylinderGeometry, cylinderMaterial)
cylinder.position.set(0, 0.5, 0) // 设置柱体位置在 Y 轴上方
scene.add(cylinder) // 将柱体添加到场

const keyEnum = {
  w:false,
  a:false,
  s:false,
  d:false,
}

const keyDown = (evt: KeyboardEvent) => {
  console.log('Key down:', evt)
  const key = evt.key
  if (Object.prototype.hasOwnProperty.call(keyEnum, key)) {
    keyEnum[key as keyof typeof keyEnum] = true
  }
  console.log('Key state:', keyEnum)
}
const keyUp = (evt: KeyboardEvent) => {
  console.log('Key up:', evt)
  const key = evt.key
  if (Object.prototype.hasOwnProperty.call(keyEnum, key)) {
    keyEnum[key as keyof typeof keyEnum] = false
  }
  console.log('Key state:', keyEnum)
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
// 防抖处理窗口尺寸变化
let debouncedResize = debounce(handleResize, 100)
let animationFrameId: number = 0 // 动画帧 ID
const stats = new Stats() // 性能监控面板
let controls: OrbitControls | null = null // 轨道控制器
const clock = new THREE.Clock() // 时钟，用于计算时间差

// 处理键盘输入，控制柱体移动
const moveCylinder = (delta: number) => {
  const speed = 2 // 移动速度
  if (keyEnum.w) {
    cylinder.position.z -= speed * delta // 向前移动
  }
  if (keyEnum.s) {
    cylinder.position.z += speed * delta // 向后移动
  }
  if (keyEnum.a) {
    cylinder.position.x -= speed * delta // 向左移动
  }
  if (keyEnum.d) {
    cylinder.position.x += speed * delta // 向右移动
  }
}

// 动画循环
const animate = () => {
  animationFrameId = requestAnimationFrame(animate)
  const delta = clock.getDelta() // 获取时间差
  moveCylinder(delta) // 移动柱体
  // 更新 stats 面板
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
  camera.position.set(0, 5, 5)
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

// 生命周期：组件挂载
onMounted(() => {
  initThree()
  window.addEventListener('resize', debouncedResize)
  handleResize()
  window.addEventListener('keydown', keyDown)
  window.addEventListener('keyup', keyUp)
  animate()
})

// 生命周期：组件卸载，清理资源
onUnmounted(() => {
  window.removeEventListener('resize', debouncedResize)
  window.removeEventListener('keydown', keyDown)
  window.removeEventListener('keyup', keyUp)
  // 移除鼠标事件监听
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
