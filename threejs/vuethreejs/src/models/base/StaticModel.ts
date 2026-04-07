import {THREE} from "@/utils/threeModules";

export default class StaticModel {
    id: string
    name: string
    model: THREE.Object3D
    scene: THREE.Scene
    renderer: THREE.WebGLRenderer

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
        this.scene = scene;
        this.renderer = renderer;
    }

    init() {
    }

    animate() {
    }

    dispose(){
        if (this.model) {
            // 递归遍历模型中的所有对象，调用dispose方法
            this.model.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    // 检查材质是否为数组
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            // 从父对象中移除模型
            if (this.model.parent) {
                this.model.parent.remove(this.model);
            }
        }
    }
}
