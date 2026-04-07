import {THREE} from "@/utils/threeModules";
import {getStaticUrl} from "@/utils/util";
import {Water} from 'three/addons/objects/Water.js';
import StaticModel from "@/models/base/StaticModel";

export default class MySea extends StaticModel {

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
        super(scene, renderer);
        this.id = 'sea';
        this.name = 'sea';
        this.init();
    }

    init() {
        const waterGeometry = new THREE.PlaneGeometry(8000, 8000)
        let url = getStaticUrl("~/assets/waternormals.jpg");
        let waterNormals = new THREE.TextureLoader().load(url, function (texture) {
            texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
        });
        this.model = new Water(
            waterGeometry,
            {
                textureWidth: 512,
                textureHeight: 512,
                waterNormals: waterNormals,
                sunDirection: new THREE.Vector3(),
                sunColor: 0xffffff,
                waterColor: 0x001e0f,
                distortionScale: 3.7,
                fog: this.scene.fog !== undefined
            }
        );
        this.model.position.set(0,-2,0);
        this.model.rotation.x = -Math.PI / 2 // 旋转平面，使其水平
        this.scene.add(this.model)
    }
    animate() {
        (this.model as Water)!.material.uniforms['time'].value += 1.0 / 100.0;
    }
}
