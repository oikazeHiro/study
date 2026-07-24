import { anyDataToEuler, anyDataToVector3, THREE } from '@/utils/threeModules'
import ModelMove from "@/models/utils/modelMove";
import ModsMethodStandard from "@/models/base/ModsMethodStandard";
import { ManagedModel, ModelInstanceData } from "@/models/base/ManagedModel";

/**
 * ModsMethodStandardImpl — 标准模型操作实现类。
 *
 * ## 职责
 *
 * 实现了 ModsMethodStandard 和 ManagedModel 接口，是数据驱动模型管理的默认实现。
 * 核心模式：传入一个「模板模型」（primitiveModel），根据 dataMap 中的每条数据
 * 克隆一份并设置位置/旋转/缩放/可见性，所有克隆体放在一个 group 中统一管理。
 *
 * ## 适用场景
 *
 * - 实例数量不多（< 500），且每个实例需要独立操控的场景
 * - 模型来自 GLB/GLTF 文件，数据驱动创建/更新
 * - 需要按 name 查找特定子节点修改材质或颜色的操作
 *
 * ## 与 InstancedMeshFoundation / BatchedMeshFoundation 的区别
 *
 * | 类 | 渲染方式 | 实例数上限 | 单独操作能力 |
 * |---|---|---|---|
 * | ModsMethodStandardImpl | 每个实例独立 Group | 中小规模 | 最强（按 name 操作） |
 * | InstancedMeshFoundation | GPU Instancing | 大规模 | 弱（只能按 index） |
 * | BatchedMeshFoundation | GPU Batch 合并 | 超大规模 | 弱（按 batchId） |
 *
 * ## 模式
 *
 * 链式调用：所有 setXxx 方法均返回 this。
 */
export default class ModsMethodStandardImpl implements ModsMethodStandard, ManagedModel {
    // ======================== 公开属性 ========================

    /** 动画 Action 列表（每实例拥有独立的 AnimationAction） */
    AnimationActions: Array<THREE.AnimationAction>;
    /**
     * 实例数据 Map。
     * - key: 实例标识（如 "ship_01"）
     * - value: 当前最新数据（包含 position/rotation/scale/visible/status 等）
     */
    dataMap: Map<string, any>;
    /** 原始模板模型，作为克隆的基准副本 */
    primitiveModel: THREE.Object3D;
    /**
     * 场景分组，所有克隆实例都挂在此 group 下。
     * 将此 group 加入场景即可显示所有实例。
     */
    group: THREE.Group;
    /** 模型类型的标识 key（如 "sanHuoShip"） */
    key: string;
    /** 模型正面朝向（用于 modelMove 路径动画时的自动面朝方向） */
    front: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
    /** 从 GLB 加载的 AnimationClip 列表（所有实例共享同一套 clip 定义） */
    animationClips: Array<THREE.AnimationClip> = [];

    /**
     * 每个实例的 AnimationMixer。
     * key = 实例名称（addModel 时传入的 key），value = 该实例专属的 mixer。
     * 在 addModel 时创建，dispose(name) 时移除。
     */
    private _mixers: Map<string, THREE.AnimationMixer> = new Map();

    constructor() {
        this.AnimationActions = [];
        this.dataMap = new Map();
        this.primitiveModel = new THREE.Object3D();
        this.group = new THREE.Group();
        this.key = '';
    }

    // ======================== 初始化 ========================

    /**
     * 初始化模型：用 dataMap 中的每条数据克隆 primitiveModel。
     *
     * @param key             模型类型标识
     * @param dataMap         实例数据：key=实例名，value=含 position/rotation/scale/visible 等
     * @param primitiveModel  模板模型（GLB 加载后的 scene/group），每次克隆它来生成实例
     */
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

    // ======================== 实例创建（私有） ========================

    /**
     * 根据单条数据克隆一个实例并加到 group 中。
     *
     * 处理流程：
     *   1. deep clone 模板模型
     *   2. 解析 position/rotation/scale 并赋值
     *   3. 根据 visible 或 status 设置可见性（visible 优先级更高）
     *   4. 设置 name 和 uuid 为实例 key，便于后续查找
     *
     * @param primitiveModel  模板模型
     * @param value           单条实例数据
     * @param key             实例标识
     */
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
        // visible 优先于 status：如果传了 visible 字段则用它，
        // 否则回退到 status==='normal' 才可见
        if (value.visible !== undefined) {
            model.visible = !!value.visible;
        } else {
            model.visible = value?.status === 'normal';
        }
        // 用实例 key 作为 name/uuid，方便 setVisible / setPosition / setColor 等按名查找
        model.uuid = key;
        model.name = model.uuid;
        this.group.add(model);

        // 如果有动画 clip，为每个实例创建独立的 AnimationMixer
        // 注意：mixer 必须在 clone 加入 group 之后再操作，
        // 因为 AnimationMixer 会遍历目标对象的子树绑定骨骼/变形目标
        if (this.animationClips.length > 0) {
            this._mixers.set(key, new THREE.AnimationMixer(model));
        }

        return model;
    }

    // ======================== 场景管理 ========================

    /**
     * 将 group 加入场景。
     * 不自动调用，需外部显式添加。
     */
    addScene(scene: THREE.Scene): this {
        scene.add(this.group);
        return this;
    }

    // ======================== 动画 ========================

    /** 设置动画剪辑列表（由 loader 加载后传入） */
    setAnimationClips(animationClips: Array<THREE.AnimationClip>): this {
        this.animationClips = animationClips;
        return this;
    }

    /** 获取当前所有 AnimationAction */
    getAnimationActions(): Array<THREE.AnimationAction> {
        return this.AnimationActions;
    }

    // ======================== 数据更新 ========================

    /**
     * updateAll 的别名，兼容 ManagedModel 接口。
     * SceneModelManager2 在 updateModelByData 时会调用此方法。
     */
    updateAll(dataMap: Map<string, ModelInstanceData>): this {
        this.updateData(dataMap);
        return this;
    }

    /**
     * 核心更新方法：根据新 dataMap 增/改实例。
     *
     * - 如果实例 key 不存在 → 调用 addModel 创建新实例
     * - 如果已存在 → 合并数据并逐一更新 position/rotation/scale/visible
     *
     * 注意：此方法不处理「删除」—— 已存在的实例若不出现在新 dataMap 中，
     * 不会被移除。删除需调用 dispose(name)。
     */
    updateData(dataMap: Map<string, any>): this {
        dataMap.forEach((value, key) => {
            if (!this.dataMap.has(key)) {
                // 新增实例
                this.addModel(this.primitiveModel, value, key);
            } else {
                // 更新已有实例
                const existing = this.dataMap.get(key);
                this.dataMap.set(key, {
                    ...existing,
                    ...value
                });
                if (value.position) this.setPosition(key, anyDataToVector3(value.position));
                if (value.rotation) this.setRotation(key, anyDataToEuler(value.rotation));
                if (value.scale) this.setScale(key, anyDataToVector3(value.scale));
                // visible 优先于 status
                if (value.visible !== undefined) {
                    console.log("updateData visible",key,value.visible)
                    this.setVisible(key, !!value.visible);
                } else if (value.status !== undefined) {
                    this.setVisible(key, value.status === 'normal');
                }
            }

        })
        return this;
    }

    // ======================== 实例变换 ========================

    /** 按实例名移动位置 */
    setPosition(name: string, position: THREE.Vector3): this {
        this.group.getObjectByName(name)?.position.copy(position);
        return this;
    }

    /** 按实例名设置旋转 */
    setRotation(name: string, rotation: THREE.Euler): this {
        this.group.getObjectByName(name)?.rotation.copy(rotation);
        return this;
    }

    /** 按实例名设置缩放 */
    setScale(name: string, scale: THREE.Vector3): this {
        this.group.getObjectByName(name)?.scale.copy(scale);
        return this;
    }

    /** 按实例名设置可见性 */
    setVisible(name: string, visible: boolean): this {
        const objectByName = this.group.getObjectByName(name);
        console.log("要隐藏的模型",objectByName)
        if (objectByName) {
            objectByName.visible = visible;
        }
        return this;
    }

    // ======================== 颜色修改 ========================

    /**
     * 设置指定实例的颜色，支持两种调用方式：
     *
     * 1. setColor(name, color)          — 整个实例所有子节点统一颜色
     * 2. setColor(name, material, color) — 指定子节点（material）的颜色
     *
     * 通过 traverse 遍历 Mesh 节点，递归设置所有材质的 color 属性。
     * 支持单材质和多材质数组。
     */
    setColor(name: string, color: THREE.Color): this;
    setColor(name: string, material: string, color: THREE.Color): this;
    setColor(name: string, materialOrColor: string | THREE.Color, color?: THREE.Color): this {
        if (color !== undefined) {
            // 三参数：(name, material, color) — 只设置指定子节点
            const model = this.group.getObjectByName(name);
            if (model) {
                const child = model.getObjectByName(materialOrColor as string);
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
                    if (Array.isArray(mat)) {
                        mat.forEach(m => m.color.copy(color!));
                    } else {
                        mat.color.copy(color!);
                    }
                } else {
                    // 容错：没找到指定子节点，回退到全部设置
                    model.traverse((child) => {
                        if ((child as THREE.Mesh).isMesh) {
                            const mesh = child as THREE.Mesh;
                            const mats = Array.isArray(mesh.material) ? mesh.material as THREE.MeshStandardMaterial[] : [mesh.material as THREE.MeshStandardMaterial];
                            mats.forEach(m => m.color.copy(color!));
                        }
                    });
                }
            }
        } else {
            // 两参数：(name, color) — 设置所有子节点
            const model = this.group.getObjectByName(name);
            if (model) {
                model.traverse((child) => {
                    if ((child as THREE.Mesh).isMesh) {
                        const mesh = child as THREE.Mesh;
                        const mat = mesh.material as THREE.MeshStandardMaterial | THREE.MeshStandardMaterial[];
                        const c = materialOrColor as THREE.Color;
                        if (Array.isArray(mat)) {
                            mat.forEach(m => m.color.copy(c));
                        } else {
                            mat.color.copy(c);
                        }
                    }
                });
            }
        }
        return this;
    }

    // ======================== 动画控制 ========================

    /**
     * 获取指定实例的 AnimationMixer（不存在则创建）。
     */
    private _getOrCreateMixer(name: string): THREE.AnimationMixer | undefined {
        const existing = this._mixers.get(name);
        if (existing) return existing;
        const model = this.group.getObjectByName(name);
        if (!model) return undefined;
        const mixer = new THREE.AnimationMixer(model);
        this._mixers.set(name, mixer);
        return mixer;
    }

    /**
     * 对指定实例播放动画。
     *
     * 通过 AnimationMixer + AnimationClip 实现：
     *   - 查找 name 对应的实例模型
     *   - 获取或创建其 AnimationMixer
     *   - 查找 animationClips 中与 animationName 匹配的 clip
     *   - 停止该实例当前正在播放的 action（如果有）
     *   - 创建新 action，配置循环模式，立即播放
     *
     * @param name          实例名称（addModel 时传入的 key）
     * @param animationName 动画名称（GLB 中的 animation clip 名）
     * @param loop          true=循环播放，false=播放一次后停在最后一帧
     */
    setAnimation(name: string, animationName: string, loop: boolean): this {
        if (this.animationClips.length === 0) return this;

        const mixer = this._getOrCreateMixer(name);
        if (!mixer) return this;

        // 停止该实例当前正在播放的 action
        mixer.stopAllAction();

        // 查找指定名称的 clip
        const clip = this.animationClips.find(c => c.name === animationName);
        if (!clip) {
            console.warn(`[ModsMethodStandardImpl] clip "${animationName}" not found in`, this.key);
            return this;
        }

        // 创建并配置 action
        const action = mixer.clipAction(clip);
        if (loop) {
            // THREE.LoopRepeat 会从头重复播放，times=Infinity 表示无限循环
            action.setLoop(THREE.LoopRepeat, Infinity);
        } else {
            // THREE.LoopOnce 只播放一次，clampWhenFinished 让模型停在最后一帧
            action.setLoop(THREE.LoopOnce, 1);
            action.clampWhenFinished = true;
        }
        action.play();

        return this;
    }

    /**
     * 停止指定实例的动画。
     *
     * @param name 实例名称。不传则停止所有实例的动画。
     */
    stopAnimation(name?: string): this {
        if (name) {
            this._mixers.get(name)?.stopAllAction();
        } else {
            for (const mixer of this._mixers.values()) {
                mixer.stopAllAction();
            }
        }
        return this;
    }

    /**
     * 每帧更新所有 AnimationMixer。
     *
     * 由 SceneModelManager2 的动画循环驱动。
     * 必须每帧调用，否则动画不会推进。
     *
     * @param delta 距上一帧的秒数（THREE.Clock.getDelta()）
     */
    update(delta: number): void {
        for (const mixer of this._mixers.values()) {
            mixer.update(delta);
        }
    }

    // ======================== 路径动画 ========================

    /**
     * 路径移动动画（占位）。
     *
     * 完整的实现在 HdModImpl 中（使用 TWEEN 库），
     * 这里只打印警告，提醒调用方当前类不支持该功能。
     */
    modelMove(name: string, modelMove: ModelMove[]): this {
        console.warn('modelMove not implemented in ModsMethodStandardImpl');
        return this;
    }

    // ======================== 材质/网格查询 ========================

    /**
     * 获取指定实例子节点的材质列表。
     *
     * 用于外部修改材质属性（如 emissive、roughness、metalness 等）。
     *
     * @param modelName    实例名称
     * @param materialName 子节点名称
     * @returns 材质数组（始终返回数组，即使只找到单个材质）
     */
    getMaterial(modelName: string, materialName: string): THREE.Material[] {
        const model = this.group.getObjectByName(modelName);
        if (model) {
            const object = model.getObjectByName(materialName);
            if (object && (object as THREE.Mesh).isMesh) {
                const mesh = object as THREE.Mesh;
                if (Array.isArray(mesh.material)) {
                    return mesh.material;
                } else {
                    return [mesh.material];
                }
            }
        }
        return [];
    }

    /**
     * 获取指定实例的子网格节点。
     *
     * @param modelName  实例名称
     * @param meshName   子节点名称
     * @returns 找到则返回 Object3D，否则返回 null（而不是 undefined，便于调用方判空）
     */
    getMesh(modelName: string, meshName: string): THREE.Object3D | null {
        const model = this.group.getObjectByName(modelName);
        const mesh = model?.getObjectByName(meshName);
        return mesh || null;
    }

    // ======================== 资源清理 ========================

    /**
     * 销毁指定实例。
     *
     * 递归遍历实例的所有子节点，释放 geometry 和 material 的 GPU 资源，
     * 然后从 group 中移除该实例。同时销毁对应的 AnimationMixer。
     * 调用后实例不再可见，不可恢复。
     *
     * @param name 实例名称
     */
    dispose(name: string): void {
        const model = this.group.getObjectByName(name);
        if (model) {
            model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    const mesh = child as THREE.Mesh;
                    mesh.geometry.dispose();
                    if (Array.isArray(mesh.material)) {
                        mesh.material.forEach(material => material.dispose());
                    } else {
                        mesh.material.dispose();
                    }
                }
            });
            this.group.remove(model);
        }
        // 清理 mixer
        this._mixers.get(name)?.stopAllAction();
        this._mixers.delete(name);
    }

    /**
     * 销毁所有实例，清空数据。
     *
     * 遍历 group 中所有子节点，释放 geometry/material 的 GPU 显存，
     * 停止并清理所有 AnimationMixer，然后清空 dataMap。
     * 在 Vue 组件 onUnmounted 或切换场景时调用。
     */
    disposeAll(): void {
        // 停止并清理所有 mixer
        for (const mixer of this._mixers.values()) {
            mixer.stopAllAction();
        }
        this._mixers.clear();

        this.dataMap.clear();
        this.group.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
                const mesh = child as THREE.Mesh;
                mesh.geometry.dispose();
                if (Array.isArray(mesh.material)) {
                    mesh.material.forEach(material => material.dispose());
                } else {
                    mesh.material.dispose();
                }
            }
        });
        console.log(this.key + ": 资源已清理")
    }

    // ======================== CSS2D 标签（占位） ========================

    /**
     * 返回 CSS2DObject 的 HTML 内容。
     * 当前为占位实现，返回空字符串表示不显示任何标签。
     * 子类可覆盖此方法实现自定义 HTML 标签。
     */
    getCss2dHtml(): string {
        return "";
    }

    /** CSS2DObject 的样式（占位） */
    getCss2dHtmlCss(): string {
        return "";
    }

    /**
     * 返回 CSS2DLabel 的文本内容。
     * 不同于 getCss2dHtml 的 HTML 标签，这个是纯文本 label。
     */
    getCss2dLabel(): string {
        return "";
    }

    /** CSS2DLabel 的样式（占位） */
    getCss2dLabelCss(): string {
        return "";
    }

    /** 设置 HTML 标签的点击回调（占位） */
    setCss2dHtmlClickBack(callback: Function): void {
    }

    /** 设置 Label 标签的点击回调（占位） */
    setCss2dLabelClickBack(callback: Function): void {
    }

}
