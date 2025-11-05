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
import {getStaticUrl} from "@/utils/util";
import CurvedBar from "@/models/CurvedBar";

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

  // 定义底座形状（不规则五边形）
  baseShape = [
    {x: 0, y: 0},    // 顶点0
    {x: 4, y: 0},    // 顶点1
    {x: 5, y: 3},    // 顶点2
    {x: 2, y: 5},    // 顶点3
    {x: -1, y: 2}    // 顶点4
  ];
  // 初始上部高度
  // topHeights = [1.2, 3.5, 2.1, 4.3, 1.8];
  topHeights = [0.1, 0.1, 0.1, 0.1, 0.1];
  // createIrregularModel()
  const data = {
    id: '10086',
    name: 'irregularModel',
    baseShape: baseShape,
    topHeights: topHeights
  }
  // const irregularShape = new IrregularShape(scene, data)

  // 动态设置高度贴图
  const textureLoader = new THREE.TextureLoader();
  // textureLoader.load(getStaticUrl('~/blender/test.jpg'), (heightMap) => {
  //   irregularShape.setHeightMap(heightMap, 0.5).recreateModel();
  // });

  const data2 = {
    id: '10087',
    name: 'irregularModel2',
    baseShape: [
      {x: 0, y: 0},
      {x: 0, y: 5},
      {x: 5, y: 5},
      {x: 5, y: 10},
      {x: 10, y: 10},
      {x: 0, y: 10},
    ],
    topHeights: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
    // colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Displacement.jpg'),
    // heightMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
  }
  // const irregularShape2 = new IrregularShape2(scene, data2)

  const planeData = {
    width: 20,
    height: 20,
    widthSegments: 512,
    heightSegments: 512,

    // 纹理URL
    colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
    heightMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Displacement.jpg'),
    normalMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_NormalGL.jpg'),

    // 纹理参数
    textureRepeat: [1, 1],
    displacementScale: 4.0,
    normalScaleX: 1.0,
    normalScaleY: 1.0,

    // 材质参数
    roughness: 0.8,
    metalness: 0.2
  };

  // const plane = new PlaneHeight(scene, planeData);


  const data3 = {
    id: 'csv-plane',
    modName: 'CSV Height Plane with Textures',
    csvUrl: getStaticUrl('~/blender/data_1_reduced.csv'),
    colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
    normalMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_NormalGL.jpg'),
    // color: 0xffffff,
    margin: 0.1,
    maxWidthSegments: 512,
    maxHeightSegments: 512,
    textureRepeat: [8, 8], // 纹理重复
    normalScaleX: 1.0,     // 法线贴图缩放
    normalScaleY: 1.0
  }
  const vertices = [
    {x: 0, y: 0},
    {x: 0, y: 5},
    {x: 5, y: 5},
    {x: 5, y: 10},
    {x: 10, y: 10},
    {x: 0, y: 10},
  ];

  // const radialPlane = new RadialHeightPlane(scene, {
  //   id: 'radial-terrain',
  //   modName: 'Radial Height Terrain',
  //   vertices: vertices,
  //   maxHeight: 8,
  //   heightFunction: 'cosine', // 可选择: 'cosine', 'sine', 'quadratic', 'exponential', 'circular'
  //   colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
  //   normalMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_NormalGL.jpg'),
  //   widthSegments: 128,
  //   heightSegments: 128,
  //   color: 0x88ff88,
  //   roughness: 0.7,
  //   metalness: 0.1
  // });
// const csvPlane = new PlaneHeightFromCSV(scene, data3)


  // 不规则图形示例
  const irregularVertices = [
    {x: -6, y: -4},
    {x: 2, y: -6},
    {x: 8, y: -2},
    {x: 6, y: 4},
    {x: 0, y: 7},
    {x: -5, y: 5},
    {x: -8, y: 1}
  ];

  // const irregularPlane = new RadialHeightPlane(scene, {
  //   id: 'irregular-terrain',
  //   modName: 'Irregular Shape Terrain',
  //   vertices: irregularVertices,
  //   maxHeight: 5,
  //   heightFunction: 'cosine',
  //   falloffSharpness: 1.5, // 控制衰减锐度
  //   colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
  //   normalMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_NormalGL.jpg'),
  //   widthSegments: 512,    // 增加分段数以更好地表现不规则边缘
  //   heightSegments: 512,
  //   color: 0xffffff
  // });


  // const circularRibbon = new CircularRibbon(scene, {
  //   id: 'circular-ribbon',
  //   modName: 'Circular Ribbon',
  //   pathPoints: [
  //     {x: -30, y: 0, z: 0},
  //     {x: -15, y: 15, z: 10},
  //     {x: 0, y: 0, z: 20},
  //     {x: 15, y: -15, z: 10},
  //     {x: 30, y: 0, z: 0}
  //   ],
  //   pointScales: [0.2, 0.8, 1.2, 0.8, 0.2], // 每个点的独立缩放
  //   pathType: 'catmullrom',
  //   pathClosed: false,
  //   circleRadius: 3,
  //   circleSegments: 16,
  //   color: 0x88aaff,
  //   roughness: 0.6,
  //   metalness: 0.2,
  //   steps: 80,
  //   colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
  //   normalMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_NormalGL.jpg'),
  //   castShadow: true,
  //   receiveShadow: true
  // });
  const nodes = [
    {position: new THREE.Vector3(0, 0, 0), radius: 0.5},
    {position: new THREE.Vector3(0.5, 1, 0.2), radius: 0.8},
    {position: new THREE.Vector3(1, 2, 0), radius: 0.2}
  ];
  const bar = new CurvedBar(scene, {
    nodes,
    tubularSegments: 300,
    radialSegments: 16,
    color: 0xffffff,
    colorMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_Color.jpg'),
    normalMapUrl: getStaticUrl('~/blender/Rock058_1K-JPG_NormalGL.jpg'),
  });
  // bar.setTextureRepeat(4, 1);


  // 光源
  scene.add(new THREE.AmbientLight(0x404040))
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5)
  directionalLight.position.set(1, 1, 1)
  scene.add(directionalLight)

  // 辅助工具
  scene.add(new THREE.AxesHelper(2))
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
  cubes.map(cube => {
    cube.rotation.y += 0.01
  })

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
  camera.position.set(17, 10, 17)
  camera.lookAt(10, 0, 10)
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
  controls.target.set(10, 0, 10)
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
