import {OrbitControls, Stats, THREE} from '@/utils/threeModules'
import merge from 'lodash/merge';
import ModelStandardLoader from './ModelStandardLoader';
import SanHuoShipModel from '../loaderModel/SanHuoShipModel';
import ModsMethodStandardImpl from './ModsMethodStandardImpl';
import ModsMethodStandard from './ModsMethodStandard';
import StaticModel from "@/models/base/StaticModel";
import MySky from "@/models/codeModel/MySky";
import MySea from "@/models/codeModel/MySea";
import CarModel from "@/models/loaderModel/CarModel";
import GroundModel from "@/models/loaderModel/GroundModel";
import ContainerModel from "@/models/loaderModel/ContainerModel";
import { ManagedModel, ModelInstanceData } from './ManagedModel';

/**
 * 场景数据接口
 * 描述从 API 或测试数据传入的场景结构：
 * {
 *   sanHuoShip: {
 *     ship_01: { position: {x,y,z}, rotation: {x,y,z}, scale: {x,y,z}, visible: true },
 *     ship_02: { ... }
 *   },
 *   zhuangZaiJi: { ... }
 * }
 *
 * 每个 modelKey 对应一个已注册的模型类型，instanceKey 是该类型的单个实例标识。
 * 数据格式统一为 {@link ModelInstanceData}，兼容旧字段 status。
 */
export interface SceneData {
    [modelKey: string]: {
        [instanceKey: string]: ModelInstanceData;
    }
}

/**
 * SceneModelManager — 3D 场景的总控中心
 *
 * 职责：
 * 1. 管理 THREE.Scene / WebGLRenderer / PerspectiveCamera / OrbitControls 等基础设施
 * 2. 管理静态场景元素（天空、海洋等继承 StaticModel 的对象）
 * 3. 管理动态加载的 3D 模型（通过 ModelStandardLoader 加载文件，通过 ManagedModel 操作实例）
 * 4. 驱动动画循环（requestAnimationFrame）
 * 5. 提供数据驱动 API（addLoaderSceneByData / updateModelByData），
 *    将外部数据（API / 测试数据）映射到场景中的模型实例，无需区分底层是 clone 还是 instanced
 *
 * 使用方式：
 *   const manager = new SceneModelManager()
 *   manager.modelStandardLoader = new MyModelLoader()  // 可选，替换默认加载器
 *   await manager.init()
 *   manager.addLoaderSceneByData(mySceneData)          // 传入实例数据
 *   // ... 运行时更新
 *   manager.updateModelByData(updatedData)
 *   // ... 清理
 *   manager.disposeAll()
 */
export default class SceneModelManager {

    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls: OrbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    // 静态模型（天空、海洋等），每帧调用 animate()
    staticModels: Map<string, StaticModel> = new Map();

    /**
     * 统一模型容器。
     *
     * 同时容纳：
     *   - clone 式模型（ModsMethodStandardImpl）：从文件加载一个 Object3D，为每个实例 clone
     *   - 实例化模型（InstancedMeshFoundation / AtlasInstancedMeshFoundation）：InstancedMesh 单次 draw call
     *   - 批量模型（BatchedMeshFoundation）：BatchedMesh 支持多材质
     *
     * 上层代码只需面向 {@link ManagedModel} 编程，无需区分底层实现。
     */
    modelMap: Map<string, ManagedModel> = new Map();

    // 文件加载器，负责加载 GLTF/FBX/OBJ 等外部模型文件
    modelStandardLoader: ModelStandardLoader = new ModelStandardLoader();
    stats: Stats = new Stats()

    // 合并后的全量场景数据快照
    data: SceneData = {};

    // 模型构造器注册表：key -> 构造函数，替代硬编码 switch
    private static modelFactories: Map<string, new () => ModsMethodStandard> = new Map();

    private animationId: number | null = null;

    onProgressCallback?: (progress: number) => void;

    /**
     * 注册一个模型类型到工厂
     * @param key 模型标识（需与 ModelStandardLoader 配置中的 key 一致）
     * @param ctor 模型类构造函数（需继承 ModsMethodStandardImpl）
     */
    static registerModel(key: string, ctor: new () => ModsMethodStandard): void {
        SceneModelManager.modelFactories.set(key, ctor);
    }

    constructor() {
        this.registerDefaultModels();
    }

    // 注册内置的模型类型，仅在首次实例化时执行一次
    private registerDefaultModels(): void {
        if (SceneModelManager.modelFactories.size === 0) {
            SceneModelManager.registerModel('sanHuoShip', SanHuoShipModel);
            SceneModelManager.registerModel('car', CarModel);
            SceneModelManager.registerModel('groud', GroundModel);
        }
    }

    /**
     * 初始化场景：设置相机、灯光、启动加载器、启动动画循环、初始化静态模型
     */
    init(): Promise<void> {
        if (this.onProgressCallback) {
            this.modelStandardLoader.setOnProgressCallback(this.onProgressCallback);
        }
        this.camera.position.set(5, 5, 10)
        this.camera.lookAt(0, 0, 0)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(50, 100, 70);
        this.scene.add(directionalLight);
        this.scene.add(new THREE.AxesHelper(10));
        return this.modelStandardLoader.initialize().then(() => {
            this.loaderModsMethodStandard();
            this.startAnimationLoop();
            this.initStaticModels();
        });
    }


    initStaticModels() {
        const mySky = new MySky(this.scene, this.renderer);
        this.staticModels.set('sky', mySky);
        const mySea = new MySea(this.scene, this.renderer);
        this.staticModels.set('sea', mySea);
    }

    // 启动 requestAnimationFrame 驱动渲染循环
    startAnimationLoop(): void {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            this.controls.update();
            this.staticModels.forEach((value) => {
                value.animate();
            })
            this.stats.update()
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    // 为每个已加载的模型 key 创建对应的 ModsMethodStandard 实例
    loaderModsMethodStandard() {
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            this.addModsMethodStandardByKey(key);
        })
    }

    setOnProgressCallback(callback: (progress: number) => void): void {
        this.onProgressCallback = callback;
    }


    // 根据 key 从工厂获取模型类，实例化并注册到 modelMap
    addModsMethodStandardByKey(key: string): void {
        const Ctor = SceneModelManager.modelFactories.get(key);
        let model: ModsMethodStandard;
        if (Ctor) {
            model = new Ctor();
        } else {
            model = new ModsMethodStandardImpl();
        }
        model.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
        this.modelMap.set(key, model as unknown as ManagedModel);
    }

    /**
     * 将一个已初始化的模型实例纳入管理器统一管理。
     *
     * 适用于：
     *   - InstancedMeshFoundation / AtlasInstancedMeshFoundation（外部 init 后注册）
     *   - BatchedMeshFoundation（外部 init 后注册）
     *   - ModsMethodStandardImpl（外部手动创建后注册）
     *
     * @param key   标识（用于后续查找、更新、dispose）
     * @param model 已调用过 init() 的模型实例
     */
    addModel(key: string, model: ManagedModel): void {
        model.addScene(this.scene);
        this.modelMap.set(key, model);
    }

    /**
     * 批量更新 modelMap 中实例的数据。
     *
     * 遍历 data，将 data[key] 下的实例数据转发给对应 key 的 ManagedModel.updateAll()。
     * 此方法对 clone 式和 instanced 模型均生效，调用方无需区分。
     *
     * @param data SceneData 格式，key 与 modelMap 匹配
     */
    updateModelByData(data: SceneData): void {
        merge(this.data, data);
        for (const [key, modelData] of Object.entries(data)) {
            const model = this.modelMap.get(key);
            if (model && modelData) {
                const mapData = new Map<string, ModelInstanceData>(Object.entries(modelData));
                model.updateAll(mapData);
            }
        }
    }

    /**
     * 将场景数据添加到场景中
     * 遍历已加载的模型 key，将 data[key] 中的实例数据克隆为 3D 对象并添加到场景
     * @param data SceneData 格式的实例数据
     */
    addLoaderSceneByData(data: SceneData): void {
        merge(this.data, data)
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const primitiveModel = this.modelStandardLoader.getModel(key);
            const modelData = data[key];
            if (primitiveModel && modelData) {
                const mapData = new Map<string, ModelInstanceData>(Object.entries(modelData));
                const m = this.modelMap.get(key);
                if (m) {
                    // ModsMethodStandardImpl.init() 接收 Map<string, any>
                    // 此处通过 as any 兼容，因为 ModelInstanceData 包含额外索引签名
                    (m as any).init(key, mapData, primitiveModel);
                    m.addScene(this.scene);
                }
            }
        })
    }

    /**
     * 更新场景中已有实例的位置/旋转/缩放/可见性
     * @param data 包含要更新的字段的 SceneData（仅传变更部分即可）
     */
    updateLoaderSceneByData(data: SceneData): void {
        merge(this.data, data)
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const modelData = data[key];
            if (modelData) {
                const mapData = new Map<string, ModelInstanceData>(Object.entries(modelData));
                this.modelMap.get(key)?.updateAll(mapData);
            }
        })
    }


    /**
     * 清理所有资源：停止动画循环、释放所有模型 / 静态模型、
     * 清理加载器、清空场景。
     *
     * 按依赖顺序执行：
     *   1. 停止 requestAnimationFrame
     *   2. 释放 modelMap（所有 ManagedModel 实例）
     *   3. 释放静态模型（天空、海洋）
     *   4. 释放加载器
     *   5. 清空场景
     */
    disposeAll(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        // 释放所有模型（clone 式 + InstancedMesh + BatchedMesh）
        this.modelMap.forEach((value) => {
            value.disposeAll();
        })
        this.modelMap.clear();
        this.modelStandardLoader.dispose();
        // 释放静态模型
        this.staticModels.forEach((value) => {
            value.dispose();
        })
        this.staticModels.clear();
        this.scene.remove(...this.scene.children);
    }

    setRendererSize(width: number, height: number): void {
        this.renderer.setSize(width, height);
    }
}
