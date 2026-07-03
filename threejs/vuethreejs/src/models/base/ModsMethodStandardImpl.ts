import { anyDataToEuler, anyDataToVector3, THREE } from '@/utils/threeModules'
import ModelMove from "@/models/utils/modelMove";
import ModsMethodStandard from "@/models/base/ModsMethodStandard";

export default class ModsMethodStandardImpl implements ModsMethodStandard {
    AnimationActions: Array<THREE.AnimationAction>;
    dataMap: Map<string, any>;
    primitiveModel: THREE.Object3D;
    group: THREE.Group;
    key: string;
    front: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
    animationClips: Array<THREE.AnimationClip> = [];

    constructor() {
        this.AnimationActions = [];
        this.dataMap = new Map();
        this.primitiveModel = new THREE.Object3D();
        this.group = new THREE.Group();
        this.key = '';
    }

    init(key: string, dataMap: Map<string, any>, primitiveModel: THREE.Object3D): this {
        this.key = key;
        this.dataMap = dataMap;
        this.primitiveModel = primitiveModel;

        for (const [key, value] of dataMap) {
            this.addModel(primitiveModel, value, key);
        }
        this.group.name = this.key;
        return this;
    }

    private addModel(primitiveModel: THREE.Object3D, value: any, key: string): THREE.Object3D {
        const model = primitiveModel.clone(true);
        if (value.position) {
            model.position.copy(anyDataToVector3(value.position));
        }
        if (value.rotation) {
            model.rotation.copy(anyDataToEuler(value.rotation));
        }
        if (value.scale) {
            const newLocal = anyDataToVector3(value.scale);
            console.log("scale",key, value.scale, newLocal);
            model.scale.copy(newLocal);
        }
        model.visible = value?.status === 'normal';
        model.uuid = this.key+ "_" + key;
        model.name = model.uuid;
        this.group.add(model);
        return model;
    }

    addScene(scene: THREE.Scene): this {
        scene.add(this.group);
        return this;
    }

    setAnimationClips(animationClips: Array<THREE.AnimationClip>): this {
        this.animationClips = animationClips;
        return this;
    }

    getAnimationActions(): Array<THREE.AnimationAction> {
        return this.AnimationActions;
    }

    updateAll(dataMap: Map<string, any>): this {
        this.updateData(dataMap);
        return this;
    }

    updateData(dataMap: Map<string, any>): this {
        dataMap.forEach((value, key) => {
            if (!this.dataMap.has(key)) {
                this.addModel(this.primitiveModel, value, key);
            } else {
                const existing = this.dataMap.get(key);
                this.dataMap.set(key, {
                    ...existing,
                    ...value
                });
                this.setPosition(key, anyDataToVector3(value.position));
                this.setRotation(key, anyDataToEuler(value.rotation));
                this.setScale(key, anyDataToVector3(value.scale));
                this.setVisible(key, value?.status === 'normal');
            }

        })
        return this;
    }

    setPosition(name: string, position: THREE.Vector3): this {
        this.group.getObjectByName(name)?.position.copy(position);
        return this;
    }

    setRotation(name: string, rotation: THREE.Euler): this {
        this.group.getObjectByName(name)?.rotation.copy(rotation);
        return this;
    }

    setScale(name: string, scale: THREE.Vector3): this {
        this.group.getObjectByName(name)?.scale.copy(scale);
        return this;
    }

    setVisible(name: string, visible: boolean): this {
        const objectByName = this.group.getObjectByName(name);
        if (objectByName) {
            objectByName.visible = visible;
        }
        return this;
    }

    setAnimation(name: string, animationName: string, loop: boolean): this {
        if (this.animationClips.length === 0) return this;
        return this;
    }

    modelMove(name: string, modelMove: ModelMove[]): any {
        console.warn('modelMove not implemented in ModsMethodStandardImpl');
    }

    getMaterial(modelName: string, materialName: string): THREE.Material[] {
        const model = this.group.getObjectByName(modelName);
        if (model) {
            const object = model.getObjectByName(materialName);
            // 检查对象是否为网格对象
            if (object instanceof THREE.Mesh) {
                // 检查material是数组还是单个材质
                if (Array.isArray(object.material)) {
                    // 如果是数组，直接返回
                    return object.material;
                } else {
                    // 如果是单个材质，将其放入数组中返回
                    return [object.material];
                }
            }
        }
        return [];
    }

    getMesh(modelName: string, meshName: string): THREE.Object3D | null {
        const model = this.group.getObjectByName(modelName);
        const mesh = model?.getObjectByName(meshName);
        return mesh || null;  // 明确返回 null 而不是 undefined
    }

    dispose(name: string): void {
        const model = this.group.getObjectByName(name);
        if (model) {
            model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(material => material.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
            this.group.remove(model);
        }
    }

    disposeAll(): void {
        this.dataMap.clear();
        this.group.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.geometry.dispose();
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        });
        console.log(this.key + ": 资源已清理")
    }

    getCss2dHtml(): string {
        return "";
    }

    getCss2dHtmlCss(): string {
        return "";
    }

    getCss2dLabel(): string {
        return "";
    }

    getCss2dLabelCss(): string {
        return "";
    }

    setCss2dHtmlClickBack(callback: Function): void {
    }

    setCss2dLabelClickBack(callback: Function): void {
    }

}
