import {THREE} from '~/utils/three-modules'

const geometry = new THREE.BoxGeometry(20,20,20);
const material = new THREE.MeshLambertMaterial({color: 0x00ff00});
const mesh = new THREE.Mesh(geometry, material);
const group = new THREE.Group();
mesh.position.set(0, 50, 0);
mesh.add(new THREE.AxesHelper(30)); // 添加坐标轴辅助器
group.add(mesh);
group.position.set(50, 0, 0);

const v3 = new THREE.Vector3();
mesh.getWorldPosition(v3)
console.log('World Position:', v3);
export default group;
