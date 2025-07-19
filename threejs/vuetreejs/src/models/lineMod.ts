import {THREE} from '~/utils/three-modules'

const geometry = new THREE.BufferGeometry();

const vertices = new Float32Array([
    0, 0, 0, 
    10, 0, 0, 
    0, 10, 0, 
    0, 0, 10, 
])

const attribute = new THREE.BufferAttribute(vertices, 3);

geometry.attributes.position = attribute;

const material = new THREE.PointsMaterial({
    color: 0x00ff00,
    size: 1,
})

const line = new THREE.Line(geometry, material);

export default line;