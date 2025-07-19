import {THREE} from '~/utils/three-modules'

// 创建一个缓冲几何体
const geometry = new THREE.BufferGeometry();

// 定义矩形的顶点坐标（两个三角形组成）
const vertices = new Float32Array([
    0,0,0,      // 第一个三角形的第一个顶点
    80,0,0,     // 第一个三角形的第二个顶点
    80,80,0,    // 第一个三角形的第三个顶点
    // 0,0,0,      // 第二个三角形的第一个顶点
    // 80,80,0,    // 第二个三角形的第二个顶点
    0,80,0,     // 第二个三角形的第三个顶点
])

// 创建顶点属性并赋值给几何体
const attribute = new THREE.BufferAttribute(vertices, 3);

geometry.attributes.position = attribute;

const indices = new Uint16Array([
    0,1,2,  // 第一个三角形
    0,2,3,  // 第二个三角形
])
// 设置几何体的索引属性
geometry.setIndex(new THREE.BufferAttribute(indices, 1));



// 创建材质，设置为绿色并渲染两面
const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide, // 渲染面部的两侧
    wireframe: true, // 如果需要线框模式，可以取消注释
});

// 创建网格对象
const face = new THREE.Mesh(geometry, material);

export default face