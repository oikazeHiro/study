<template>
  <el-container>
    <el-main>
      <div ref="canvasContainer" class="three-container"></div>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { OrbitControls, Stats, THREE, dat } from '@/utils/threeModules'
import { debounce } from "lodash-es";
// DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)

// 场景
const scene = new THREE.Scene()
// 相机
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) // aspect 初始设为1
// 渲染器
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true // 透明背景
})
// 创建 |时钟
const clock = new THREE.Clock()

const gui = new dat.GUI()
const mod = gui.addFolder('模型控制')
const myAxis = {
  xStep: 0.01,
  yStep: 0.01,
  zStep: 0.01,
  isXRotary: true,
  isYRotary: true,
  isZRotary: true
}
mod.add(myAxis, 'xStep', 0.01, 1).name('X轴旋转步进').step(myAxis.xStep)
mod.add(myAxis, 'yStep', 0.01, 1).name('Y轴旋转步进').step(myAxis.yStep)
mod.add(myAxis, 'zStep', 0.01, 1).name('Z轴旋转步进').step(myAxis.zStep)
mod.add(myAxis, 'isXRotary').name('X轴旋转')
mod.add(myAxis, 'isYRotary').name('Y轴旋转')
mod.add(myAxis, 'isZRotary').name('Z轴旋转')
// 创建 |控制器
const stats = new Stats()
// 创建 |模型
const cubes: Array<THREE.Mesh<THREE.OctahedronGeometry, THREE.Material>> = []
// 创建 |控制器
let controls: OrbitControls | null = null
// 动画帧ID
let animationFrameId: number = 0
// 初始化场景
const initScene = () => {
  // 创建 |模型
  const geometry = new THREE.OctahedronGeometry(1, 0);
  // 创建材质
  const material = new THREE.MeshPhongMaterial({
    // 颜色
    color: 0xf7f709,
    // 透明
    transparent: true,
    // 透明度
    opacity: 0.5
  })

  const mat = gui.addFolder('材质控制')
  mat.addColor(material, 'color').name('颜色').onChange((value: any) => {
    material.color = material.color = new THREE.Color(value.r, value.g, value.b);
     material.needsUpdate = true; 
  })
  mat.add(material, 'transparent').name('透明材质')
  mat.add(material, 'opacity', 0, 1).name('透明度').step(0.01)

  // 创建 |模型
  const cube = new THREE.Mesh(geometry, material)
  mod.add(cube.position, 'x', -5, 5).name('x轴位置').step(0.1)
  mod.add(cube.position, 'y', -5, 5).name('y轴位置').step(0.1)
  mod.add(cube.position, 'z', -5, 5).name('z轴位置').step(0.1)
  // 添加 |模型
  cubes.push(cube)
  // 添加 |模型
  scene.add(cube)
  // 添加 |环境光
  const light = gui.addFolder('光源控制')
  const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
  light.add(ambientLight, 'intensity', 0, 2).name('环境光强度').step(0.1)
  scene.add(ambientLight)
  // 添加 |平行光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  light.add(directionalLight, 'intensity', 0, 2).name('平行光强度').step(0.1)
  // 设置 |平行光位置
  directionalLight.position.set(10, 10, 10)
  // 添加 |平行光
  scene.add(directionalLight)

  // 辅助工具
  // 添加 |坐标轴
  scene.add(new THREE.AxesHelper(2))
}
// 处理窗口大小变化
const handleResize = () => {
  // 获取容器宽高
  if (!canvasContainer.value) return
  const width = canvasContainer.value.clientWidth
  const height = canvasContainer.value.clientHeight
  // 更新相机
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
}

// 动画循环
const animate = () => {
  // 动画帧ID
  animationFrameId = requestAnimationFrame(animate)
  // 更新性能监控
  stats.update()
  // 旋转立方体
  cubes.map(cube => {
    if (myAxis.isXRotary) {
      cube.rotation.x += myAxis.xStep
    }
    if (myAxis.isYRotary) {
      cube.rotation.y += myAxis.yStep
    }
    if (myAxis.isZRotary) {
      cube.rotation.z += myAxis.zStep
    }
  })
  // 更新控制器
  controls?.update()
  // 渲染场景
  renderer.render(scene, camera)
}
const initThree = () => {
  if (!canvasContainer.value) return
  // 设置渲染器
  const { clientWidth: width, clientHeight: height } = canvasContainer.value
  renderer.setSize(width, height)
  console.log(window.devicePixelRatio)
  // 设置像素比
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xf0f0f0)
  canvasContainer.value.appendChild(renderer.domElement)

  // 设置相机
  camera.aspect = width / height
  camera.position.set(10, 10, 10)
  camera.lookAt(0, 0, 0)
  // 更新摄像机投影矩阵
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
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
}

onMounted(() => {
  // 初始化
  initThree()
  // 初始化场景
  initScene()
  // 处理窗口大小变化
  const debouncedResize = debounce(handleResize, 100)
  window.addEventListener('resize', debouncedResize)
  handleResize() // 初始调整
  // 动画循环
  animate()
  //
  onUnmounted(() => {
    // 移除监听器
    window.removeEventListener('resize', debouncedResize)
    // 停止动画循环
    cancelAnimationFrame(animationFrameId)
    // 销毁控制器
    controls?.dispose()
    // 清理材质和几何体
    scene.traverse(obj => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry?.dispose()
        obj.material?.dispose()
      }
    })
    // 销毁渲染器
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
  touch-action: none;
  /* 防止触摸事件冲突 */
}
</style>
