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


export default class SceneModelManager {

    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true // 透明背景
    });
    camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls: OrbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    // 静态模型 地形之类的不会改变的模型
    staticModels: Map<string, StaticModel> = new Map();
    modsMethodStandardMap: Map<string, ModsMethodStandard> = new Map();
    modelStandardLoader: ModelStandardLoader = new ModelStandardLoader();
    stats: Stats = new Stats()

    data: any = {};

    private animationId: number | null = null;

    onProgressCallback?: (progress: number) => void;

    constructor() {
    }

    init(): Promise<void> {
        if (this.onProgressCallback) {
            this.modelStandardLoader.setOnProgressCallback(this.onProgressCallback);
        }
        this.camera.position.set(5, 5, 10)
        this.camera.lookAt(0, 0, 0)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
        directionalLight.position.set(50, 100, 70);
        this.scene.add(directionalLight);
        // 辅助工具
        this.scene.add(new THREE.AxesHelper(10));
        // 返回 Promise，让调用方可以等待
        return this.modelStandardLoader.initialize().then(() => {
            this.loaderModsMethodStandard();
            this.startAnimationLoop();
            this.initStaticeModels();
        });
    }


    initStaticeModels() {
        const mySky = new MySky(this.scene, this.renderer);
        this.staticModels.set('sky', mySky);
        const mySea = new MySea(this.scene, this.renderer);
        this.staticModels.set('sea', mySea);
    }

    startAnimationLoop(): void {
        const animate = () => {
            this.animationId = requestAnimationFrame(animate);
            // 更新控制器
            this.controls.update();
            this.staticModels.forEach((value) => {
                value.animate();
            })
            this.stats.update()
            // 渲染场景
            this.renderer.render(this.scene, this.camera);
        };
        animate();
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
            case 'car':
                let carModel = new CarModel();
                carModel.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
                this.modsMethodStandardMap.set(key, carModel);
                break;
            case 'groud':
                let groudModel = new GroundModel();
                groudModel.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
                this.modsMethodStandardMap.set(key, groudModel);
                break;
            case 'container':
                let containerModel = new ContainerModel();
                containerModel.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
                this.modsMethodStandardMap.set(key, containerModel);
                break;
            default:
                let modsMethodStandard = new ModsMethodStandardImpl();
                modsMethodStandard.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
                this.modsMethodStandardMap.set(key, modsMethodStandard);
                break;
        }
    }

    addLoaderSceneByData(data: any): void {
        merge(this.data, data)
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const model = this.modelStandardLoader.getModel(key);
            const newLocal = data[key];
            if (model && newLocal) {
                const mapData = new Map<string, any>(Object.entries(newLocal));
                this.modsMethodStandardMap.get(key)?.init(key, mapData, model)
                    .addScene(this.scene);
            }
        })
    }

    updateLoaderSceneByData(data: any): void {
        merge(this.data, data)
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const newLocal = data[key];
            if (newLocal) {
                const mapData = new Map<string, any>(Object.entries(newLocal));
                this.modsMethodStandardMap.get(key)?.updateAll(mapData);
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
        this.staticModels.forEach((value) => {
            value.dispose();
        })
        this.modsMethodStandardMap.clear();
    }

    setRendererSize(width: number, height: number): void {
        this.renderer.setSize(width, height);
    }
}
