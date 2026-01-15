import {THREE} from '@/utils/threeModules'

const geometry = new THREE.SphereGeometry(50);
const group = new THREE.Group();
const loader = new THREE.TextureLoader();
const href = new URL('@/assets/earth.jpg', import.meta.url).href;
console.log(href)
const texture = loader.load(href);
const material = new THREE.MeshLambertMaterial({
    map: texture,
});
const mesh = new THREE.Mesh(geometry, material);

const geometry2 = new THREE.CircleGeometry( 30, 32 );
const href1 = new URL('@/assets/twoHa.jpg', import.meta.url).href;
const loader1 = new THREE.TextureLoader();
const texture1 = loader1.load(href1);
const meshLambertMaterial = new THREE.MeshLambertMaterial({map: texture1, });
const circle = new THREE.Mesh(geometry2, meshLambertMaterial);
group.add(mesh);
circle.position.set(0, 80, 0);
group.add(circle);

export default group;
