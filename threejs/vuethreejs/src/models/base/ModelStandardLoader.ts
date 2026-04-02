import {FBXLoader, GLTFLoader, OBJLoader, THREE,} from "@/utils/threeModules";
import {getStaticUrl} from "@/utils/util";

/**
 * 模型配置接口
 */
interface ModelConfig {
    isNeedLoaded: boolean;  // 是否需要加载
    lowModelPath: string;
    mediumModelPath: string;
    highModelPath: string;
    path: string;           // 模型文件路径
    key: string;            // 模型唯一标识
    name: string;           // 模型显示名称
}

/**
 * 模型加载器标准类
 * 负责管理3D模型的加载、存储和进度跟踪
 */
export default class ModsMethodStandard {
    // 存储已加载的模型对象，key为模型标识，value为THREE.Object3D对象
    loadedModels: Map<string, THREE.Object3D> = new Map();
    // 存储已加载的动画剪辑，key为模型标识，value为动画剪辑数组
    loadedAnimations: Map<string, Array<THREE.AnimationClip>> = new Map();
    // 存储模型配置的映射表，便于快速查找
    configMap: Map<string, ModelConfig> = new Map();
    // 当前加载进度（0-100）
    loadingProgress: number = 0;

    // 进度更新回调函数
    onProgressCallback?: (progress: number) => void;

    /**
     * 模型配置数组
     * 定义需要加载的模型信息
     */
    modelConfigs: Array<ModelConfig> = [
        {
            isNeedLoaded: true,
            lowModelPath: "/models/ship/sanHuoShip.glb",
            mediumModelPath: "/models/ship/sanHuoShip.glb",
            highModelPath: "/models/ship/sanHuoShip.glb",
            path: '',
            key: "sanHuoShip",
            name: "散货船",
        },
    ];

    constructor() {
        // 构造函数，暂无初始化逻辑
    }

    /**
     * 初始化模型加载器
     * 创建配置映射表并加载所有需要加载的模型
     * @returns Promise<void>
     */
    async initialize(): Promise<void> {
        let modelAccuracy = window.localStorage.getItem("MODEL_ACCURACY");
        if(!modelAccuracy) {
            modelAccuracy = "medium";
            window.localStorage.setItem("MODEL_ACCURACY", "medium");
        }
        this.modelConfigs.map((config)=>{
            config.path = modelAccuracy == "low" ? config.lowModelPath : modelAccuracy == "medium" ? config.mediumModelPath : config.highModelPath;
        })
        // 创建配置映射表，便于通过key快速查找配置
        this.configMap = this.modelConfigs.reduce((map, config) => {
            map.set(config.key, config);
            return map;
        }, new Map<string, ModelConfig>());

        // 加载所有需要外部加载的模型
        await this.loadAllModels();

        // 加载完成，设置进度为100%
        this.updateProgress(100);
    }

    /**
     * 加载所有需要加载的模型
     * 遍历模型配置，逐个加载模型并更新进度
     * @returns Promise<void>
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
     * 更新加载进度
     * @param progress 当前进度（0-100）
     */
    private updateProgress(progress: number): void {
        this.loadingProgress = progress;

        // 如果设置了进度回调，调用回调函数
        if (this.onProgressCallback) {
            this.onProgressCallback(progress);
        }
    }

    /**
     * 获取文件扩展名
     * @param path 文件路径
     * @returns 文件扩展名（小写）
     */
    private getFileExtension(path: string): string {
        return path.split('.').pop()?.toLowerCase() || '';
    }

    /**
     * 根据文件类型加载模型
     * @param config 模型配置对象
     * @returns Promise<void>
     */
    private async loadModelByType(config: ModelConfig): Promise<void> {
        // 获取文件后缀名（扩展名）
        const fileExtension = this.getFileExtension(config.path);

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
                console.warn(`不支持的文件类型: ${fileExtension}，模型: ${config.key}`);
                break;
        }
    }

    /**
     * 加载GLTF/GLB格式模型
     * @param config 模型配置对象
     * @returns Promise<void>
     */
    private async loadGLTFModel(config: ModelConfig): Promise<void> {
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
                    console.log(`模型 ${config.key} 加载成功，初始前方方向:`,
                        gltf.scene.getWorldDirection(new THREE.Vector3()));
                    resolve();
                },

                // 加载进度回调
                (xhr) => {
                    // 计算单个文件的加载进度百分比
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    this.updateFileProgress(config, percent);
                },

                // 加载失败回调
                (error) => {
                    console.error(`加载GLTF模型失败: ${config.key}`, error);
                    resolve(); // 即使失败也继续，保证Promise能够resolve
                }
            );
        });
    }

    /**
     * 加载FBX格式模型
     * @param config 模型配置对象
     * @returns Promise<void>
     */
    private async loadFBXModel(config: ModelConfig): Promise<void> {
        return new Promise((resolve) => {
            const loader = new FBXLoader();

            loader.load(
                config.path,
                (fbx) => {
                    // 存储加载的FBX模型和动画
                    this.loadedModels.set(config.key, fbx);
                    this.loadedAnimations.set(config.key, fbx.animations);
                    console.log(`模型 ${config.key} 加载成功`);
                    resolve();
                },
                (xhr) => {
                    // 加载进度回调
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    this.updateFileProgress(config, percent);
                },
                (error) => {
                    console.error(`加载FBX模型失败: ${config.key}`, error);
                    resolve(); // 即使失败也继续，保证Promise能够resolve
                }
            );
        });
    }

    /**
     * 加载OBJ格式模型
     * 注意：OBJ格式通常不包含动画信息
     * @param config 模型配置对象
     * @returns Promise<void>
     */
    private async loadOBJModel(config: ModelConfig): Promise<void> {
        return new Promise((resolve) => {
            const loader = new OBJLoader();

            loader.load(
                config.path,
                (obj) => {
                    // OBJ格式通常不包含动画，所以动画数组为空
                    this.loadedModels.set(config.key, obj);
                    this.loadedAnimations.set(config.key, []);
                    console.log(`模型 ${config.key} 加载成功`);
                    resolve();
                },
                (xhr) => {
                    // 加载进度回调
                    const percent = Math.round((xhr.loaded / xhr.total) * 100);
                    this.updateFileProgress(config, percent);
                },
                (error) => {
                    console.error(`加载OBJ模型失败: ${config.key}`, error);
                    resolve(); // 即使失败也继续，保证Promise能够resolve
                }
            );
        });
    }

    /**
     * 更新单个文件加载进度（可选功能）
     * @param config 模型配置对象
     * @param percent 加载进度百分比
     */
    private updateFileProgress(config: ModelConfig, percent: number): void {
        // 可扩展为更细粒度的进度更新
        // 例如：触发一个更详细的进度回调
        if (percent === 100) {
            console.log(`模型 ${config.key} 文件加载完成`);
        }
    }

    /**
     * 获取已加载的模型
     * @param key 模型标识
     * @returns 模型对象或undefined
     */
    public getModel(key: string): THREE.Object3D | undefined {
        return this.loadedModels.get(key);
    }

    /**
     * 获取模型动画
     * @param key 模型标识
     * @returns 动画数组或undefined
     */
    public getAnimations(key: string): Array<THREE.AnimationClip> | undefined {
        return this.loadedAnimations.get(key);
    }

    /**
     * 检查模型是否已加载
     * @param key 模型标识
     * @returns 是否已加载
     */
    public isModelLoaded(key: string): boolean {
        return this.loadedModels.has(key);
    }

    /**
     * 获取所有已加载模型的key列表
     * @returns 模型key数组
     */
    public getLoadedModelKeys(): string[] {
        return Array.from(this.loadedModels.keys());
    }

    /**
     * 清理所有已加载的资源
     * 注意：需要根据实际场景决定是否调用此方法
     */
    public dispose(): void {
        // 清理模型资源
        this.loadedModels.forEach((model) => {
            if (model && model.isObject3D) {
                // 递归清理几何体和材质
                model.traverse((child: any) => {
                    if (child.isMesh) {
                        if (child.geometry) {
                            child.geometry.dispose();
                        }
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach((material: THREE.Material)  => material.dispose());
                            } else {
                                child.material.dispose();
                            }
                        }
                    }
                });
            }
        });

        // 清空所有Map
        this.loadedModels.clear();
        this.loadedAnimations.clear();
        this.configMap.clear();

        // 重置进度
        this.loadingProgress = 0;

        console.log('模型加载器资源已清理');
    }

    /**
     * 设置加载进度回调函数
     * @param callback 加载进度回调加载进度百分比
     */
    setOnProgressCallback(callback: (progress: number) => void): void {
        this.onProgressCallback = callback;
    }
}
