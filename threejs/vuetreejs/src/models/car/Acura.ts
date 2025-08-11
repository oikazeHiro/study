import {Car, Shell} from './Car'
import {Color, GLTFLoader, Group, Object3D, THREE} from '@/utils/threeModules'

export class Acura_01 extends Car {

    modGroup: Group

    constructor() {
        super();
        this.modGroup = new THREE.Group();
        this.modGroup.name = "Acura_01" + this.id;
        this.tireNames = [
            "tire_1_tire_0", "tire_2_tire_0", "tire_3_tire_0", "tire_4_tire_0",
            "rimmatte_rim_1_rim_matte_0", "rimmatte_rim_2_rim_matte_0", "rimmatte_rim_3_rim_matte_0", "rimmatte_rim_4_rim_matte_0",
            "rimmatte_axis_1_rim_matte_0", "rimmatte_axis_2_rim_matte_0", "rimmatte_axis_3_rim_matte_0", "rimmatte_axis_4_rim_matte_0",
        ]
        this.initModGroup();
    }

    initModGroup() {
        const gltfLoader = new GLTFLoader();
        const href = new URL('@/blender/car/acura_01.glb', import.meta.url).href;

        console.log(`加载模型: ${href}`);
        gltfLoader.load(href, (gltf) => {
                this.modGroup.add(gltf.scene);
            },
            (xhr) => {

                console.log((xhr.loaded / xhr.total * 100) + '% loaded');

            },
            (error) => {
                console.log(error)
            }
        )
        console.log(this.modGroup)
    }

    setShellMetallicity(value: number) {
        this.shell.metallicity = value;
        return this;
    }

    setShellRoughness(value: number) {
        this.shell.roughness = value;
        return this;
    }

    setShellColor(color: Color) {
        this.shell.color = color;
        return this;
    }

    setShell(shell: Shell) {
        super.setShell(shell);
        this.setShellMetallicity(shell.metallicity)
        this.setShellRoughness(shell.roughness);
        this.setShellColor(shell.color);
    }

    setPosition(position: THREE.Vector3) {
        this.position = position;
        this.modGroup.position.copy(position);
        return this;
    }

    getModGroup() {
        return this.modGroup;
    }

    stowage(scene: Object3D) {
        scene.add(this.modGroup);
    }

    setWhetherToMove(whetherToMove: boolean) {
        this.whetherToMove = whetherToMove;
        return this;
    }

    scale(num: number) {
        this.modGroup.scale.set(num, num, num);
    }

    action() {
        if (!this.whetherToMove) return;

    }
}
