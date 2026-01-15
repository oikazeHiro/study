
import {FBXLoader, GLTFLoader,OBJLoader , THREE,} from "@/utils/threeModules";
import HdMod from "@/models/base/HdMod";

/**
 * 模型加载器类 - 负责加载和管理3D模型资源
 * 主要功能包括：
 * 1. 加载各种格式的3D模型文件（GLTF/GLB/FBX/OBJ）
 * 2. 管理模型配置和数据
 * 3. 创建场景中的模型实例`
 * 4. 设置模型动画
 * 5. 提供加载进度跟踪
 */
class ModelLoader {
    /** Three.js场景对象，用于添加和管理3D模型 */
    scene: THREE.Scene;

    /** Three.js渲染器，用于渲染场景 */
    renderer: THREE.WebGLRenderer;

    /** Three.js时钟，用于动画和时间相关计算 */
    clock: THREE.Clock;

    /** 模型配置数组，包含所有需要加载的模型配置信息 */
    modelConfigs: any[] = [];

    /** 配置映射表，通过key快速查找模型配置 */
    configMap: Map<string, any> = new Map();

    /** 模型实例数据数组，包含场景中每个模型实例的具体数据 */
    modelInstancesData: any[] = [];

    /** 已加载的模型对象映射表，key为模型配置key，value为Three.js对象 */
    loadedModels: Map<string, THREE.Object3D> = new Map();

    /** 已加载的动画剪辑映射表，key为模型配置key，value为动画剪辑数组 */
    loadedAnimations: Map<string, Array<THREE.AnimationClip>> = new Map();

    /** 当前加载进度，范围0-100，表示加载完成的百分比 */
    loadingProgress: number = 0;

    /** 场景中的模型实例映射表，key为模型实例ID，value为HdMod对象 */
    sceneModels: Map<string, HdMod> = new Map();

    /** 进度回调函数，当加载进度更新时会被调用 */
    onProgressCallback?: (progress: number) => void;

    /**
     * 构造函数 - 初始化模型加载器
     * @param scene Three.js场景对象
     * @param renderer Three.js渲染器
     * @param clock Three.js时钟
     * @param configs 模型配置数组
     * @param datas 模型实例数据数组
     * @param loadingProgress 初始加载进度，默认为0
     * @param onProgress 进度回调函数，可选
     */
    constructor(
        scene: THREE.Scene,
        renderer: THREE.WebGLRenderer,
        clock: THREE.Clock,
        configs: any[],
        datas: any[],
        loadingProgress: number = 0,
        onProgress?: (progress: number) => void
    ) {
        this.scene = scene;
        this.renderer = renderer;
        this.clock = clock;
        this.modelConfigs = configs;
        this.modelInstancesData = datas;
        this.loadingProgress = loadingProgress;
        this.onProgressCallback = onProgress;

        // 异步初始化，完成后打印日志
        // this.initialize().then(() => {
        //     console.log("模型加载和初始化完成");
        // });
    }

    /**
     * 初始化方法 - 主初始化流程
     * 1. 创建配置映射表
     * 2. 加载所有模型
     * 3. 创建场景模型实例
     */
    async initialize(): Promise<void> {
        // 创建配置映射表，便于通过key快速查找配置
        this.configMap = this.modelConfigs.reduce((map, config) => {
            map.set(config.key, config);
            return map;
        }, new Map<string, any>());

        // 加载所有需要外部加载的模型
        await this.loadAllModels();

        // 根据加载的模型和配置创建场景中的模型实例
        this.createSceneModels(this.modelInstancesData);

        // 加载完成，设置进度为100%
        this.updateProgress(100);
    }

    /**
     * 加载所有需要加载的模型
     * 遍历所有配置，筛选出需要加载的模型并按类型加载
     */
    async loadAllModels(): Promise<void> {
        // 筛选出需要加载的模型配置
        const needLoadConfigs = this.modelConfigs.filter(config => config.isNeedLoaded);
        const totalModels = needLoadConfigs.length;

        // 如果没有需要加载的模型，直接设置进度为100%
        if (totalModels === 0) {
            this.updateProgress(100);
            return;
        }

        // 遍历所有需要加载的模型配置
        for (let i = 0; i < needLoadConfigs.length; i++) {
            const config = needLoadConfigs[i];

            // 根据文件类型加载模型
            await this.loadModelByType(config);

            // 更新进度：已完成的模型数量 / 总模型数量 * 100
            const progress = Math.round((i + 1) / totalModels * 100);
            this.updateProgress(progress);
        }
    }

    /**
     * 更新加载进度并触发回调
     * @param progress 新的进度值（0-100）
     */
    private updateProgress(progress: number): void {
        this.loadingProgress = progress;

        // 如果设置了进度回调，调用回调函数
        if (this.onProgressCallback) {
            this.onProgressCallback(progress);
        }
    }

    /**
     * 根据文件类型加载模型
     * @param config 模型配置对象
     */
    private async loadModelByType(config: any): Promise<void> {
        // 获取文件后缀名（扩展名）
        const fileExtension = config.getFileSuffix();

        // 根据文件类型调用相应的加载方法
        switch (fileExtension) {
            case 'gltf':
            case 'glb':
                await this.loadGLTFModel(config);
                break;
            case 'fbx':
                await this.loadFBXModel(config);
                break;
            case 'obj':
                await this.loadOBJModel(config);
                break;
            default:
                console.warn(`不支持的文件类型: ${fileExtension}`);
                break;
        }
    }

    /**
     * 加载GLTF/GLB格式模型
     * @param config 模型配置对象
     */
    private async loadGLTFModel(config: any): Promise<void> {
        return new Promise((resolve) => {
            const loader = new GLTFLoader();

            // 使用Three.js的GLTFLoader加载模型
            loader.load(
                // 模型文件路径
                config.path,

                // 加载成功回调
                (gltf) => {
                    // 将加载的模型和动画存储到映射表中
                    this.loadedModels.set(config.key, gltf.scene);
                    this.loadedAnimations.set(config.key, gltf.animations);
                    console.log(`模型 ${config.key} 的初始前方方向:`, gltf.scene.getWorldDirection(new THREE.Vector3()));
                    resolve();
                },

                // 加载进度回调
                (xhr) => {
                    // 计算单个文件的加载进度百分比
                    const percent = xhr.loaded / xhr.total * 100;
                },

                // 加载失败回调
                (error) => {
                    console.error(`加载模型失败: ${config.key}`, error);
                    resolve(); // 即使失败也继续，保证Promise能够resolve
                }
            );
        });
    }

    /**
     * 加载FBX格式模型
     * @param config 模型配置对象
     */
    private async loadFBXModel(config: any): Promise<void> {
        return new Promise((resolve) => {
            const loader = new FBXLoader();

            loader.load(
                config.path,
                (fbx) => {
                    this.loadedModels.set(config.key, fbx);
                    this.loadedAnimations.set(config.key, fbx.animations);
                    resolve();
                },
                (xhr) => {
                    const percent = xhr.loaded / xhr.total * 100;
                },
                (error) => {
                    console.error(`加载模型失败: ${config.key}`, error);
                    resolve();
                }
            );
        });
    }

    /**
     * 加载OBJ格式模型
     * @param config 模型配置对象
     */
    private async loadOBJModel(config: any): Promise<void> {
        return new Promise((resolve) => {
            const loader = new OBJLoader();

            loader.load(
                config.path,
                (obj) => {
                    // OBJ格式通常不包含动画，所以动画数组为空
                    this.loadedModels.set(config.key, obj);
                    this.loadedAnimations.set(config.key, []);
                    resolve();
                },
                (xhr) => {
                    const percent = xhr.loaded / xhr.total * 100;
                },
                (error) => {
                    console.error(`加载模型失败: ${config.key}`, error);
                    resolve();
                }
            );
        });
    }

    /**
     * 创建场景中的模型实例
     * 根据模型实例数据创建对应的模型对象并添加到场景中
     */
    private createSceneModels(list: any[]): void {
        // 遍历所有模型实例数据
        for (let modelData of list) {
            // 判断模型是否已经存在于场景中
            if (this.sceneModels.has(modelData.id)) {
                console.warn(`模型已存在: ${modelData.id}`);
                continue;
            }

            // 根据modKey查找对应的配置
            const config = this.configMap.get(modelData.modKey);

            if (!config) {
                console.warn(`找不到配置: ${modelData.modKey}`);
                continue;
            }

            // 根据是否需要加载选择创建内置模型或加载的模型
            if (!config.isNeedLoaded) {
                this.createBuiltInModel(modelData);
            } else {
                this.createLoadedModel(modelData);
            }
        }
    }

    /**
     * 创建内置模型（不需要外部加载的模型）
     * @param data 模型实例数据
     */
    private createBuiltInModel(data: any): void {
        const textureLoader = new THREE.TextureLoader();
        // 根据模型类型创建相应的内置模型对象
        switch (data.modKey) {
            case "sky":
                // 创建天空模型

                break;
            case "sea":
                // 创建海洋模型

                break;
            case "berth":


                break;
            case "yard":

                break;
            case "ground":

                break;
            case "irregularShape":

                break;
            case "planeHeight":

                break;
            case "planeHeightFromCSV":

                break;
            case "radialHeightPlane":

                break;
            default:
                console.warn(`未知的内置模型类型: ${data.modKey}`);
                break;
        }
    }

    /**
     * 创建已加载的模型实例
     * @param data 模型实例数据
     */
    private createLoadedModel(data: any): void {
        // 从已加载的模型中获取对应的模型对象
        const model = this.loadedModels.get(data.modKey);
        if (!model) {
            console.warn(`模型未加载: ${data.modKey}`);
            return;
        }
        // 根据模型类型创建相应的模型实例
        switch (data.modKey) {
            case 'bollard':

            case 'zzj':

                break;
            case 'sanHuoShip':
                // 创建ZZJ模型（根据实际含义命名）

                break;
            case 'lamp':
                // 创建灯模型

                break;
            case 'truck':

                break;
            case 'cargo':
            case 'cargo2':
            case 'cargo2.001':
                // 创建货物模型

                break;
            case 'ground2':
                // 创建灯模型

                break;
            case 'mzsqzj':

                break;
            default:
                console.warn(`未知的加载模型类型: ${data.modKey}`);
                break;
        }
    }

    /**
     * 设置模型动画
     * @param hdMod HdMod模型对象
     * @param modKey 模型key，用于查找对应的动画剪辑
     */
    private setupAnimations(hdMod: HdMod, modKey: string): void {
        // 获取该模型对应的动画剪辑
        const clips = this.loadedAnimations.get(modKey);
        // 如果有动画剪辑，创建动画混合器和动作
        if (clips && clips.length > 0) {
            hdMod.setAnimationActions(clips);
        }
    }

    // ========== 公共方法 ==========

    /**
     * 根据ID获取模型实例
     * @param id 模型实例ID
     * @returns 对应的HdMod对象或undefined
     */
    getModelById(id: string): HdMod | undefined {
        return this.sceneModels.get(id);
    }

    /**
     * 获取场景中所有模型实例
     * @returns HdMod对象数组
     */
    getAllModels(): HdMod[] {
        return Array.from(this.sceneModels.values());
    }

    /**
     * 获取当前加载进度
     * @returns 加载进度百分比（0-100）
     */
    getLoadingProgress(): number {
        return this.loadingProgress;
    }

    /**
     * 设置进度回调函数
     * @param callback 进度回调函数，接收进度百分比参数
     */
    setProgressCallback(callback: (progress: number) => void): void {
        this.onProgressCallback = callback;
    }

    /**
     * 添加模型实例数据
     * @param data 模型实例数据
     */
    addMod(data: any[]) {
        if (data && data.length > 0) {
            this.createSceneModels(data)
        }
    }

    // 删除模型
    removeMod(id: string): void {
        const model = this.sceneModels.get(id);
        if (model) {
            model.dispose();
            this.sceneModels.delete(id);
        } else {
            console.warn(`模型不存在: ${id}`);
        }
    }

    // 删除多个模型
    removeMods(ids: string[]): void {
        ids.forEach(id => this.removeMod(id));
    }
}

export default ModelLoader;
