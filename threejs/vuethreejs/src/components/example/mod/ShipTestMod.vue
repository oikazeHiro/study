<template>
  <!-- three.js 渲染容器 -->
  <div ref="canvasContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from 'vue'
import {THREE, OrbitControls, Stats, Water, Sky, WebGLRenderTarget,GLTFLoader} from '@/utils/threeModules'
// import group from '~/models/gltfTest'
import {debounce} from "lodash-es";
import {getStaticUrl} from "@/utils/util";

// three.js 容器 DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)

let animationFrameId: number = 0 // 动画帧 ID
const scene = new THREE.Scene() // 创建场景
let controls: OrbitControls | null = null // 轨道控制器
// scene.add(group) // 添加模型点云
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

/**
 * 创建水面几何体并加载法线贴图，用于渲染水面效果
 *
 * 该代码段完成以下工作：
 * 1. 创建一个大型平面几何体作为水面的基础网格；
 * 2. 加载水体法线贴图，并设置其重复模式；
 * 3. 使用 Water 类创建水面对象，并配置相关参数（如颜色、光照方向等）；
 * 4. 将水面旋转至水平位置并添加到场景中。
 */
const waterGeometry = new THREE.PlaneGeometry( 10000, 10000 )
let url = getStaticUrl("~/assets/waternormals.jpg");
let waterNormals = new THREE.TextureLoader().load( url, function (texture ) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
} );
console.log("waterNormals",waterNormals)
const water = new Water(
    waterGeometry,
    {
      textureWidth: 512,
      textureHeight: 512,
      waterNormals: waterNormals,
      sunDirection: new THREE.Vector3(),
      sunColor: 0xffffff,
      waterColor: 0x001e0f,
      distortionScale: 3.7,
      fog: scene.fog !== undefined
    }
);
// const ground = new THREE.Mesh(waterGeometry, groundMaterial)
water.rotation.x = -Math.PI / 2 // 旋转平面，使其水平
scene.add(water)

/**
 * 初始化天空盒对象并设置其缩放比例
 *
 * 该部分完成以下任务：
 * 1. 创建 Sky 对象作为天空背景；
 * 2. 设置天空盒的缩放系数以匹配场景大小；
 * 3. 将天空盒加入场景。
 */
let sun = new THREE.Vector3();
const sky = new Sky();
sky.scale.setScalar( 10000 );
scene.add( sky );

/**
 * 配置天空材质的环境参数
 *
 * 设置以下参数影响天空渲染效果：
 * - turbidity：大气浑浊度
 * - rayleigh：瑞利散射强度
 * - mieCoefficient：米氏散射系数
 * - mieDirectionalG：米氏散射的方向性因子
 */
const skyUniforms = sky.material.uniforms;

skyUniforms[ 'turbidity' ].value = 10;
skyUniforms[ 'rayleigh' ].value = 2;
skyUniforms[ 'mieCoefficient' ].value = 0.005;
skyUniforms[ 'mieDirectionalG' ].value = 0.8;

/**
 * 定义太阳的位置参数
 *
 * 包含两个属性：
 * - elevation：太阳高度角（单位：角度）
 * - azimuth：太阳方位角（单位：角度）
 */
const parameters = {
  elevation: 2,
  azimuth: 180
};

/**
 * 初始化 PMREM 环境贴图生成器及相关资源
 *
 * 创建以下对象用于环境光照计算：
 * - pmremGenerator：用于从场景生成环境贴图
 * - sceneEnv：临时场景，用于包含天空对象
 * - renderTarget：存储生成的环境贴图
 */
const pmremGenerator = new THREE.PMREMGenerator( renderer );
const sceneEnv = new THREE.Scene();

let renderTarget:WebGLRenderTarget;

/**
 * 更新太阳位置及其对天空和水面的影响
 *
 * 此函数执行以下操作：
 * 1. 根据 elevation 和 azimuth 参数计算太阳在球坐标系中的位置；
 * 2. 更新天空材质中太阳的位置 uniform；
 * 3. 更新水面材质中太阳方向的 uniform；
 * 4. 重新生成环境贴图并应用到场景中。
 */
function updateSun() {

  const phi = THREE.MathUtils.degToRad( 90 - parameters.elevation );
  const theta = THREE.MathUtils.degToRad( parameters.azimuth );

  sun.setFromSphericalCoords( 1, phi, theta );

  sky.material.uniforms[ 'sunPosition' ].value.copy( sun );
  water.material.uniforms[ 'sunDirection' ].value.copy( sun ).normalize();

  if ( renderTarget !== undefined ) renderTarget.dispose();

  sceneEnv.add( sky );
  renderTarget = pmremGenerator.fromScene( sceneEnv );
  scene.add( sky );

  scene.environment = renderTarget.texture;

}

/**
 * 调用 updateSun 函数初始化太阳光照状态
 */
updateSun();

const staticUrl = getStaticUrl('~/blender/ship/sanHuoShip.glb');
const loader = new GLTFLoader();
loader.load(staticUrl, (gltf)=>{
  console.log('gltf',gltf)
  scene.add(gltf.scene);
});


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
  water.material.uniforms[ 'time' ].value += 1.0 / 60.0;
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