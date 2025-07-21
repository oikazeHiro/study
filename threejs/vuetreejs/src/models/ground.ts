import {THREE} from '~/utils/three-modules'

const loader = new THREE.TextureLoader();
const href = new URL("@/assets/地砖.jpg", import.meta.url).href;
// 加载纹理
const texture = loader.load(href);
texture.wrapS = THREE.RepeatWrapping; // 设置纹理重复方式
texture.wrapT = THREE.RepeatWrapping; // 设置纹理重复方式
texture.repeat.set(10, 10); // 设置纹理重复次数
// 创建一个平面几何体作为地面
const geometry = new THREE.PlaneGeometry(1000, 1000);
const material = new THREE.MeshBasicMaterial({
    map: texture,
});
const mesh = new THREE.Mesh(geometry, material);
mesh.rotation.x = 0-Math.PI / 2; // 使平面水平放置

export default mesh;
