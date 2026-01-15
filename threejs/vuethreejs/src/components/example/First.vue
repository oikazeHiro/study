<template>
  <el-container>
    <el-main>
      <div ref="canvasContainer" class="three-container"></div>
    </el-main>
  </el-container>
</template>

<script lang="ts" setup>
import {onMounted, onUnmounted, ref} from 'vue'
import {debounce} from 'lodash-es'
import {Earcut, OrbitControls, Stats, THREE} from '@/utils/threeModules'
import SquaresAndText from "@/models/codeModel/SquaresAndText";

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
// let cube: THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>
const cubes: Array<THREE.Mesh<THREE.BoxGeometry, THREE.MeshLambertMaterial>> = []
let controls: OrbitControls | null = null
let animationFrameId: number = 0
let baseShape: Array<any>, topHeights: Array<number>;
// 初始化场景
const initScene = () => {
  // 添加辅助网格
  const gridHelper = new THREE.GridHelper(20, 20, 0xe2e8f0, 0xf1f5f9);
  scene.add(gridHelper);
  // 光源
  scene.add(new THREE.AmbientLight(0x404040))
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  // 辅助工具
  scene.add(new THREE.AxesHelper(2))


  let stepx = 5, stepy = 5;
  for (let i = 0; i < 50; i++) {
    for (let j = 0; j < 50; j++) {
      let verticalAlign = '';
      if (j % 3 == 0)
        verticalAlign = 'top';
      if (j % 3 == 1)
        verticalAlign = 'middle';
      if (j % 3 == 2)
        verticalAlign = 'bottom';
      const SquaresAndTextData = {
        plane: {
          width: 5,
          height: 5,
          color: getRandomColor(),
        },
        text: {
          message: (i*50+(j+1))+'',
          color: getRandomColor(),
          verticalAlign: verticalAlign,
          size: 1,
        },
        initialPosition: new THREE.Vector3(i * stepx, 0, j * stepy),
      }

      new SquaresAndText(scene, SquaresAndTextData, null, clock, renderer)
    }
  }


}
const getRandomColor = () => {
  return Math.floor(Math.random() * 0x1000000);
}

const createIrregularModel = () => {
  const baseZ = 0; // 底座Z坐标（确保平整）
  const vertices = [];
  // 先添加底座顶点（z=baseZ）
  baseShape.forEach(p => {
    vertices.push(p.x, p.y, baseZ);
  });
  // 再添加上部顶点（z=baseZ + height）
  baseShape.forEach((p, i) => {
    vertices.push(p.x, p.y, baseZ + topHeights[i]);
  });
  const vertexCount = baseShape.length; // 底座顶点数量
  // 定义三角形索引（面）
  const indices = [];
  // 底座三角化（用EarCut处理多边形）
  const baseCoords = [];
  baseShape.forEach(p => {
    baseCoords.push(p.x, p.y);
  });
  const baseTriangles = Earcut.triangulate(baseCoords);
  baseTriangles.forEach(idx => indices.push(idx));

  // 顶部三角化
  const topTriangles = [...baseTriangles];
  topTriangles.forEach(idx => indices.push(idx + vertexCount));
  // 侧面三角化
  for (let i = 0; i < vertexCount; i++) {
    const j = (i + 1) % vertexCount; // 下一个顶点（循环）
    // 侧面四边形拆分为两个三角形
    indices.push(
        i, j, j + vertexCount,    // 第一个三角形
        i, j + vertexCount, i + vertexCount // 第二个三角形
    );
  }
  // 创建几何体
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(new THREE.Uint32BufferAttribute(indices, 1));
  geometry.computeVertexNormals(); // 计算法向量用于光照
  // 创建材质和网格
  const material = new THREE.MeshStandardMaterial({
    color: 0x4F46E5,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
    metalness: 0.1,
    roughness: 0.7,
    wireframe: true  // 改为 true 显示线框
  });

  // 创建底座特殊材质 - 同样改为线框模式
  const baseMaterial = new THREE.MeshStandardMaterial({
    color: 0x10B981,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.95,
    metalness: 0.2,
    roughness: 0.5,
    wireframe: true  // 改为 true 显示线框
  });

  // 创建底座网格
  const baseGeometry = new THREE.BufferGeometry();
  const baseVertices = [];
  baseShape.forEach(p => {
    baseVertices.push(p.x, p.y, baseZ - 0.05); // 稍微低于原底座，避免z-fighting
  });
  baseGeometry.setAttribute('position', new THREE.Float32BufferAttribute(baseVertices, 3));
  baseGeometry.setIndex(new THREE.Uint32BufferAttribute(baseTriangles, 1));
  baseGeometry.computeVertexNormals();

  const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
  baseMesh.receiveShadow = true;

  // 创建上部网格
  const irregularMesh = new THREE.Mesh(geometry, material);
  irregularMesh.castShadow = true;
  irregularMesh.receiveShadow = true;

  // 创建组合对象
  const group = new THREE.Group();
  group.add(baseMesh);
  group.add(irregularMesh);
  scene.add(group);
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
  // cube.rotation.y += 0.01
  // cubes.map(cube => {
  //   cube.rotation.y += 0.01
  // })

  // 更新控制器
  controls?.update()

  // 渲染场景
  renderer.render(scene, camera)
}

// 初始化Three.js
const initThree = () => {
  if (!canvasContainer.value) return

  // 设置渲染器
  const {clientWidth: width, clientHeight: height} = canvasContainer.value
  renderer.setSize(width, height)
  console.log(window.devicePixelRatio)
  // 设置像素比
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setClearColor(0xf0f0f0)
  canvasContainer.value.appendChild(renderer.domElement)

  // 设置相机
  camera.aspect = width / height
  camera.position.set(0, 20, 0)
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
