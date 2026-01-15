<template>
  <!-- three.js 渲染容器 -->
  <div ref="canvasContainer" class="three-container"></div>
</template>

<script setup lang="ts">
import {nextTick, onMounted, onUnmounted, ref} from 'vue'
import {THREE, OrbitControls, Stats, Water, Sky, WebGLRenderTarget,GLTFLoader,dat} from '@/utils/threeModules'
import {debounce} from "lodash-es";
import {getStaticUrl} from "@/utils/util";

// three.js 容器 DOM 引用
const canvasContainer = ref<HTMLElement | null>(null)

let animationFrameId: number = 0 // 动画帧 ID
const scene = new THREE.Scene() // 创建场景
let controls: OrbitControls | null = null // 轨道控制器
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000) // 透视相机
const renderer = new THREE.WebGLRenderer({
  antialias: true, // 抗锯齿
  alpha: true      // 透明背景
})

// GUI控制器
const gui = new dat.GUI();
const outlineParams = {
  enabled: true,
  color: '#00ffff',
  thickness: 0.01,
  alpha: 1.0
};

const ambientLight = new THREE.AmbientLight(0xffffff, 1.0); // 环境光
scene.add(ambientLight)
scene.add(new THREE.AxesHelper(2)) // 坐标轴辅助器
const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
directionalLight.position.set(5, 5, 5).normalize() // 定向光
// scene.add(directionalLight)

// 安全的材质清理函数
function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach(mat => mat.dispose());
  } else {
    material.dispose();
  }
}

// 创建描边效果
function createOutlineEffect() {
  // 简单的描边效果实现 - 使用法线扩展方法
  scene.traverse((object) => {
    // 添加类型断言
    if ((object as THREE.Mesh).isMesh) {
      const mesh = object as THREE.Mesh;
      // 保存原始材质
      const originalMaterial = mesh.material;

      // 创建描边材质
      const outlineMaterial = new THREE.MeshPhongMaterial({
        color: new THREE.Color(outlineParams.color),
        side: THREE.BackSide,
        transparent: true,
        opacity: outlineParams.alpha,
        emissive: new THREE.Color(outlineParams.color),
        emissiveIntensity: 10,
        shininess: 100 // 可以调整光泽度
      });

      // 创建描边网格
      const outlineMesh = new THREE.Mesh(mesh.geometry, outlineMaterial);
      outlineMesh.scale.multiplyScalar(1 + outlineParams.thickness);
      outlineMesh.visible = outlineParams.enabled;
      outlineMesh.renderOrder = -1; // 确保描边先渲染

      // 将描边网格添加到原网格的父级
      if (mesh.parent) {
        mesh.parent.add(outlineMesh);
      }

      // 存储引用以便更新
      mesh.userData.outlineMesh = outlineMesh;
      mesh.userData.originalMaterial = originalMaterial;
    }
  });
}

// 更新描边效果
function updateOutlineEffect() {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.userData.outlineMesh) {
      const outlineMesh = mesh.userData.outlineMesh;

      // 更新描边可见性
      outlineMesh.visible = outlineParams.enabled;

      // 更新描边颜色
      if (outlineMesh.material) {
        (outlineMesh.material as THREE.MeshBasicMaterial).color.set(outlineParams.color);
        (outlineMesh.material as THREE.MeshBasicMaterial).opacity = outlineParams.alpha;
        (outlineMesh.material as THREE.MeshBasicMaterial).transparent = outlineParams.alpha < 1.0;
      }

      // 更新描边粗细
      const scale = 1 + outlineParams.thickness;
      outlineMesh.scale.set(scale, scale, scale);

      // 同步位置和旋转
      outlineMesh.position.copy(mesh.position);
      outlineMesh.rotation.copy(mesh.rotation);
      outlineMesh.quaternion.copy(mesh.quaternion);
    }
  });
}

// 设置GUI控制器
function setupGUI() {
  const outlineFolder = gui.addFolder('描边效果');
  outlineFolder.add(outlineParams, 'enabled').name('启用描边').onChange(updateOutlineEffect);
  outlineFolder.addColor(outlineParams, 'color').name('描边颜色').onChange(updateOutlineEffect);
  outlineFolder.add(outlineParams, 'thickness', 0.001, 0.1, 0.001).name('描边粗细').onChange(updateOutlineEffect);
  outlineFolder.add(outlineParams, 'alpha', 0.1, 1.0, 0.1).name('不透明度').onChange(updateOutlineEffect);
  outlineFolder.open();
}

const staticUrl = getStaticUrl('~/blender/ship/sanHuoShip.glb');
const loader = new GLTFLoader();
loader.load(staticUrl, (gltf)=>{
  console.log('gltf',gltf)
  scene.add(gltf.scene);

  // 模型加载完成后创建描边效果
  setTimeout(() => {
    createOutlineEffect();
    setupGUI();
    updateOutlineEffect();
  }, 100);
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

  // 更新描边网格的位置和旋转（确保描边跟随原模型）
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh && mesh.userData.outlineMesh) {
      const outlineMesh = mesh.userData.outlineMesh;
      outlineMesh.position.copy(mesh.position);
      outlineMesh.rotation.copy(mesh.rotation);
      outlineMesh.quaternion.copy(mesh.quaternion);
    }
  });

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

  // 清理描边网格
  scene.traverse(obj => {
    const mesh = obj as THREE.Mesh;
    if (mesh.userData.outlineMesh) {
      mesh.userData.outlineMesh.geometry?.dispose();
      // 安全处理材质清理
      if (mesh.userData.outlineMesh.material) {
        disposeMaterial(mesh.userData.outlineMesh.material as THREE.Material | THREE.Material[]);
      }
      if (mesh.parent) {
        mesh.parent.remove(mesh.userData.outlineMesh);
      }
    }
  });

  // 释放场景中所有 mesh 的几何体和材质
  scene.traverse(obj => {
    if ((obj as THREE.Mesh).isMesh) {
      const mesh = obj as THREE.Mesh;
      mesh.geometry?.dispose()
      // 安全处理材质清理
      disposeMaterial(mesh.material);
    }
  })
  renderer.dispose()
  debouncedResize.cancel()
  gui.destroy();
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
