import {THREE,GLTFLoader} from '~/utils/three-modules'

const gltfLoader = new GLTFLoader();
const href = new URL("@/blender/duck/鸭子.gltf", import.meta.url).href;
const group = new THREE.Group();
gltfLoader.load(href, (gltf) => {
    group.add(gltf.scene);
});

export default group;