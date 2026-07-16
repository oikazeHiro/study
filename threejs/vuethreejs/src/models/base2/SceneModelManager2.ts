import {OrbitControls, Stats, THREE} from '@/utils/threeModules'
import ModelStandardLoader from '../base/ModelStandardLoader';
import ModsMethodStandardImpl from '../base/ModsMethodStandardImpl';
import StaticModel from '@/models/base/StaticModel';
import {ManagedModel, ModelInstanceData} from './ManagedModel'
import {ModelRegistry, LoaderModelFactory} from './ModelRegistry'

/**
 * 场景数据接口。
 *
 * 纯数据驱动：modelKey 对应 ManagedModel，instanceKey 对应单个实例。
 * 更新时只传变化部分，格式统一为 {@link ModelInstanceData}。
 */
export interface SceneData {
    [modelKey: string]: {
        [instanceKey: string]: ModelInstanceData;
    }
}

/**
 * SceneModelManager2 — 重构后的 3D 场景总控中心。
 *
 * 相对 SceneModelManager 的改进：
 *
 * 1. 【单容器统一管理】modelMap 容纳所有模型类型，无
 *    modsMethodStandardMap / foundationMap 之分别。
 *
 * 2. 【无 unsafe 转换】ModsMethodStandardImpl 通过结构类型
 *    满足 ManagedModel，没有 as any / as unknown。
 *
 * 3. 【无具体类耦合】模型工厂注册在 ModelRegistry 中，管理器
 *    不 import 任何 SanHuoShipModel / CarModel 等具体类。
 *
 * 4. 【无 stale state】updateModelByData 只转发 data 中出现的
 *    实例，不维护合并快照，避免已删除实例残留。
 *
 * 5. 【单一职责拆分】加载器工厂归 ModelRegistry，基础设施归本类，
 *    动画循环独立，不混为一谈。
 *
 * 6. 【受控初始化】addLoaderSceneByData 先查注册表，若无工厂则
 *    用 ModsMethodStandardImpl 兜底（仍然类型安全）。
 */
export default class SceneModelManager2 {
    // ======================== 基础设施 ========================

    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(
        75, window.innerWidth / window.innerHeight, 0.1, 1000,
    );
    controls: OrbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    stats: Stats = new Stats();

    /** 自定义渲染函数（用于 EffectComposer 等后处理），若设置则替代默认的 renderer.render */
    customRender: (() => void) | null = null;

    // ======================== 模型容器 ========================

    /**
     * 统一模型容器。
     *
     * 同时容纳：
     *   - clone 式：ModsMethodStandardImpl 及其子类
     *   - 实例化式：InstancedMeshFoundation / AtlasInstancedMeshFoundation
     *   - 批量式：BatchedMeshFoundation
     *
     * 所有类型都实现了 {@link ManagedModel}，上层无需区分。
     */
    modelMap: Map<string, ManagedModel> = new Map();

    /**
     * 静态模型容器。
     *
     * 静态模型（天空、海洋等）具有 **逐帧动画** 和 **独特初始化** 的语义，
     * 与数据驱动的 ManagedModel 生命周期不同，因此保持独立容器。
     */
    staticModels: Map<string, StaticModel> = new Map();

    // ======================== 外部依赖（可注入） ========================

    registry: ModelRegistry = new ModelRegistry();
    loader: ModelStandardLoader = new ModelStandardLoader();

    // ======================== 生命周期 ========================

    private animationId: number | null = null;
    onProgressCallback?: (progress: number) => void;

    /**
     * 注册一个加载器模型工厂。
     *
     * 工厂负责：
     *   1. 创建模型实例
     *   2. 调用 init(key, data, primitive)
     *   3. 返回 ManagedModel（类型安全，无需转换）
     *
     * 示例：
     *   manager.registerModel('ship', (key, primitive, data) => {
     *     const model = new SanHuoShipModel()
     *     model.init(key, data, primitive)
     *     return model
     *   })
     */
    registerModel(key: string, factory: LoaderModelFactory): void {
        this.registry.register(key, factory);
    }

    /**
     * 添加一个**已经完成初始化**的模型实例。
     *
     * 适用于 InstancedMeshFoundation / BatchedMeshFoundation 等
     * 外部创建并 init 后直接托管的模型。
     */
    addModel(key: string, model: ManagedModel): void {
        model.addScene(this.scene);
        this.modelMap.set(key, model);
    }

    setOnProgressCallback(callback: (progress: number) => void): void {
        this.onProgressCallback = callback;
    }

    async init(): Promise<void> {
        if (this.onProgressCallback) {
            this.loader.setOnProgressCallback(this.onProgressCallback);
        }
        this.camera.position.set(5, 5, 10);
        this.camera.lookAt(0, 0, 0);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        this.scene.add(new THREE.DirectionalLight(0xffffff, 0.5));
        this.scene.add(new THREE.AxesHelper(10));
        await this.loader.initialize();
        this.startAnimationLoop();
    }

    initStaticModels(...models: StaticModel[]): void {
        for (const m of models) {
            if (this.staticModels.has(m.id)) continue;
            this.staticModels.set(m.id, m);
        }
    }

    private startAnimationLoop(): void {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this.controls.update();
            this.staticModels.forEach(m => m.animate());
            this.stats.update();
            if (this.customRender) {
                this.customRender();
            } else {
                this.renderer.render(this.scene, this.camera);
            }
        };
        animate();
    }

    // ======================== 数据驱动 API ========================

    /**
     * 从数据创建场景中的模型实例。
     *
     * 流程：
     *   1. 从 loader 获取原始 Object3D（primitive）
     *   2. 从 registry 查找工厂（未注册则用 ModsMethodStandardImpl 兜底）
     *   3. 工厂创建 + init 模型
     *   4. addScene 加入场景
     *   5. 存入 modelMap
     *
     * 已存在于 modelMap 中的 key 会跳过（不重复创建）。
     */
    async addLoaderSceneByData(data: SceneData): Promise<void> {
        for (const [key, instances] of Object.entries(data)) {
            if (this.modelMap.has(key)) continue;

            const primitive = this.loader.getModel(key);
            if (!primitive) continue;

            const mapData = new Map<string, ModelInstanceData>(
                Object.entries(instances),
            );

            const factory = this.registry.get(key) ?? this.defaultFactory(key);
            const model = await factory(key, primitive, mapData);
            model.addScene(this.scene);
            this.modelMap.set(key, model);
        }
    }

    /**
     * 批量更新 modelMap 中实例的变换 / 可见性 / 颜色。
     *
     * 只遍历 data 中出现的 key（不维护内部快照），
     * 因此从 data 中移除的 key 不会被触达，但不影响已存在模型的内部状态。
     */
    updateModelByData(data: SceneData): void {
        for (const [key, instances] of Object.entries(data)) {
            const model = this.modelMap.get(key);
            if (model && instances) {
                model.updateAll(
                    new Map<string, ModelInstanceData>(Object.entries(instances)),
                );
            }
        }
    }

    // ======================== 清理 ========================

    /**
     * 按依赖顺序清理：
     *   停止动画 → 释放模型 → 释放加载器 → 释放静态 → 清空场景
     */
    disposeAll(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        this.modelMap.forEach(m => m.disposeAll());
        this.modelMap.clear();
        this.loader.dispose();
        this.staticModels.forEach(m => m.dispose());
        this.staticModels.clear();
        // 渲染器 dispose — — 只有在本类创建时才需要释放，
        // 但为了安全，保留注释：this.renderer.dispose()
        this.scene.remove(...this.scene.children);
    }

    setRendererSize(width: number, height: number): void {
        this.renderer.setSize(width, height);
    }

    // ======================== 内部 ========================

    /**
     * 默认工厂：使用 ModsMethodStandardImpl 作为兜底实现。
     *
     * ModsMethodStandardImpl 实现了 ManagedModel，所以返回类型安全。
     */
    private defaultFactory(key: string): LoaderModelFactory {
        return (k, primitive, data) => {
            const model = new ModsMethodStandardImpl();
            const clips = this.loader.getAnimations(k) ?? [];
            model.setAnimationClips(clips);
            model.init(k, data, primitive);
            return model;
        };
    }
}
