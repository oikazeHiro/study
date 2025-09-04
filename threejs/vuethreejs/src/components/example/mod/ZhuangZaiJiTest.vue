<template>
  <el-container>
    <el-main>
      <div ref="canvasContainer" class="three-container"></div>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref} from 'vue'
import {AnimationClip, AnimationMixer, dat, GLTFLoader, OrbitControls, Stats, THREE} from '@/utils/threeModules'
import {debounce} from "lodash-es";
import {getStaticUrl} from "@/utils/util";

// DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)
const gui = new dat.GUI()
const clock = new THREE.Clock()

// 场景
const scene = new THREE.Scene()
// 相机
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)
// 渲染器
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true
})

// 动画相关变量
let mixer: AnimationMixer | null = null;
let idleAction: THREE.AnimationAction;
let upAction: THREE.AnimationAction;
let downAction: THREE.AnimationAction;
let activeAction: THREE.AnimationAction;
let previousAction: THREE.AnimationAction;

const settings = {
  'idle': () => {
    prepareCrossFade(idleAction);
  },
  'up': () => {
    prepareCrossFade(upAction);
  },
  'down': () => {
    prepareCrossFade(downAction);
  },
  'use default duration': true,
  'set custom duration': 3.5,
}

let singleStepMode = false;
const crossFadeControls: any[] = [];
const animationControl = gui.addFolder('动作控制');

// 创建 |控制器
const stats = new Stats()
// 创建 |控制器
let controls: OrbitControls | null = null
// 动画帧ID
let animationFrameId: number = 0

// 准备动画过渡
const prepareCrossFade = (targetAction: THREE.AnimationAction, duration: number = 0.5) => {
  if (activeAction === targetAction) return;

  previousAction = activeAction;
  activeAction = targetAction;

  if (previousAction !== targetAction) {
    previousAction.fadeOut(duration);
  }

  activeAction
      .reset()
      .setEffectiveTimeScale(1.0)
      .setEffectiveWeight(1.0)
      .fadeIn(duration)
      .play();
}

// 初始化动画
const initAnimations = (gltf: any) => {
  mixer = new THREE.AnimationMixer(gltf.scene);

  // 获取动画片段
  const animations = gltf.animations;

  // 创建动画动作
  idleAction = mixer.clipAction(animations[0]);
  upAction = mixer.clipAction(animations[2]);
  downAction = mixer.clipAction(animations[1]);

  // 设置动画循环模式：只有idle动画循环播放
  idleAction.setLoop(THREE.LoopRepeat, Infinity); // 待机动画循环播放
  upAction.setLoop(THREE.LoopOnce,0); // 上升动画只播放一次
  downAction.setLoop(THREE.LoopOnce,0); // 下降动画只播放一次

  // 设置动画钳制：播放完成后保持在最后一帧
  upAction.clampWhenFinished = true;
  downAction.clampWhenFinished = true;

  // 初始播放idle动画
  activeAction = idleAction;
  activeAction.play();

  // 创建控制面板
  createPanel();
}

const gltfLoader = new GLTFLoader();
const url = getStaticUrl('~/blender/ship/zhuangZaiJi.glb');
gltfLoader.load(url, (gltf) => {
  console.log(gltf)
  scene.add(gltf.scene);
  initAnimations(gltf);
});

const createPanel = () => {
  crossFadeControls.push(animationControl.add(settings, 'idle').name('待机'));
  crossFadeControls.push(animationControl.add(settings, 'up').name('上升'));
  crossFadeControls.push(animationControl.add(settings, 'down').name('下降'));
  animationControl.open()
}

// 初始化场景
const initScene = () => {
  // 添加 |环境光
  const ambientLight = new THREE.AmbientLight(0x404040, 1.0);
  scene.add(ambientLight);

  const light = gui.addFolder('光源控制')
  // 添加 |平行光
  const directionalLight = new THREE.DirectionalLight(0xffffff, 5)
  directionalLight.position.set(-3, 3, 3)
  directionalLight.castShadow = true;
  scene.add(directionalLight)

  light.add(directionalLight, 'intensity', 0, 10).name('平行光强度').step(0.1)

  const helper = new THREE.DirectionalLightHelper(directionalLight, 1);
  scene.add(helper)

  // 辅助工具
  // 添加 |坐标轴
  scene.add(new THREE.AxesHelper(2))

  // 添加网格地面
  const gridHelper = new THREE.GridHelper(10, 10);
  scene.add(gridHelper);
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

  const delta = clock.getDelta();
  if (mixer) {
    mixer.update(delta);
  }

  stats.update()
  controls?.update()
  renderer.render(scene, camera)
}

const initThree = () => {
  if (!canvasContainer.value) return

  const {clientWidth: width, clientHeight: height} = canvasContainer.value
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
  controls.target.set(0, 0, 0)
  controls.enableDamping = true
  controls.dampingFactor = 0.05
}

onMounted(() => {
  initThree()
  initScene()

  const debouncedResize = debounce(handleResize, 100)
  window.addEventListener('resize', debouncedResize)
  handleResize()

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
    gui.destroy();
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
}
</style>
