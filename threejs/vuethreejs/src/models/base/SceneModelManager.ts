import { THREE } from '@/utils/threeModules'
import HdMod from './HdMod';
import ModelStandardLoader from './ModelStandardLoader';
import SanHuoShipModel from '../loaderModel/SanHuoShipModel';
import ModsMethodStandardImpl from './ModsMethodStandardImpl';
import ModsMethodStandard from './ModsMethodStandard';

export default class SceneModelManager {

    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer();
    camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

    hdModelMap: Map<string, HdMod> = new Map();
    modsMethodStandardMap: Map<string, ModsMethodStandard> = new Map();
    modelStandardLoader: ModelStandardLoader = new ModelStandardLoader();

    data: any = {};

    onProgressCallback?: (progress: number) => void;

    constructor() {
    }

    init() {
        if (this.onProgressCallback) {
            this.modelStandardLoader.setOnProgressCallback(this.onProgressCallback);
        }
        this.modelStandardLoader.initialize().then(() => {
            this.loaderModsMethodStandard();
        })
    }

    loaderModsMethodStandard() {
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            this.addModsMethodStandardByKey(key);
        })
    }


    /**
     * 设置加载进度回调函数
     * @param callback 加载进度回调加载进度百分比
     */
    setOnProgressCallback(callback: (progress: number) => void): void {
        this.onProgressCallback = callback;
    }


    addModsMethodStandardByKey(key: string): void {
        switch (key) {
            case 'sanHuoShip':
                let sanHuoShipModel = new SanHuoShipModel();
                sanHuoShipModel.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
                this.modsMethodStandardMap.set(key, sanHuoShipModel);
                break;
            default:
                let modsMethodStandard = new ModsMethodStandardImpl();
                modsMethodStandard.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
                this.modsMethodStandardMap.set(key, modsMethodStandard);
                break;
        }
    }

    addLoaderSceneByData(data: any): void {
        this.data = {
            ...this.data,
            ...data
        };
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const model = this.modelStandardLoader.getModel(key);
            if (model) {
                this.modsMethodStandardMap.get(key)?.init(key, data[key] as Map<string, any>, model)
                    .addScene(this.scene);
            }
        })
    }


    // 销毁全部
    disposeAll(): void {
        this.modsMethodStandardMap.forEach((value) => {
            value.disposeAll();
        })
        this.modelStandardLoader.dispose();
        this.scene.remove(...this.scene.children);
        this.hdModelMap.forEach((value) => {
            value.dispose();
        })
        this.modsMethodStandardMap.clear();
        this.hdModelMap.clear();
    }

}
