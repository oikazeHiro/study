import {THREE} from '~/utils/three-modules'

const geometry = new THREE.BufferGeometry();

const vertices = new Float32Array([
    0, 0, 0,
    10, 0, 0,
    0, 10, 0,
    0, 0, 2,
    10, 0, 2,
    0, 10, 2,
])

const attribute = new THREE.BufferAttribute(vertices, 3);

geometry.attributes.position = attribute;

const material = new THREE.MeshBasicMaterial({
    color: 0x00ff00,
    side: THREE.DoubleSide, // 渲染面部的两侧
});

const face = new THREE.Mesh(geometry, material);
export default face