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

export interface SceneData {
    [modelKey: string]: {
        [instanceKey: string]: {
            position?: { x: number; y: number; z: number };
            rotation?: { x: number; y: number; z: number; order?: string };
            scale?: { x: number; y: number; z: number };
            status?: string;
        }
    }
}

export default class SceneModelManager {

    scene: THREE.Scene = new THREE.Scene();
    renderer: THREE.WebGLRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    camera: THREE.PerspectiveCamera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    controls: OrbitControls = new OrbitControls(this.camera, this.renderer.domElement);
    staticModels: Map<string, StaticModel> = new Map();
    modsMethodStandardMap: Map<string, ModsMethodStandard> = new Map();
    modelStandardLoader: ModelStandardLoader = new ModelStandardLoader();
    stats: Stats = new Stats()

    data: SceneData = {};

    private static modelFactories: Map<string, new () => ModsMethodStandard> = new Map();

    private animationId: number | null = null;

    onProgressCallback?: (progress: number) => void;

    static registerModel(key: string, ctor: new () => ModsMethodStandard): void {
        SceneModelManager.modelFactories.set(key, ctor);
    }

    constructor() {
        this.registerDefaultModels();
    }

    private registerDefaultModels(): void {
        if (SceneModelManager.modelFactories.size === 0) {
            SceneModelManager.registerModel('sanHuoShip', SanHuoShipModel);
            SceneModelManager.registerModel('car', CarModel);
            SceneModelManager.registerModel('groud', GroundModel);
            SceneModelManager.registerModel('container', ContainerModel);
        }
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

    loaderModsMethodStandard() {
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            this.addModsMethodStandardByKey(key);
        })
    }

    setOnProgressCallback(callback: (progress: number) => void): void {
        this.onProgressCallback = callback;
    }


    addModsMethodStandardByKey(key: string): void {
        const Ctor = SceneModelManager.modelFactories.get(key);
        let model: ModsMethodStandard;
        if (Ctor) {
            model = new Ctor();
        } else {
            model = new ModsMethodStandardImpl();
        }
        model.setAnimationClips(this.modelStandardLoader.getAnimations(key) ?? []);
        this.modsMethodStandardMap.set(key, model);
    }

    addLoaderSceneByData(data: SceneData): void {
        merge(this.data, data)
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const model = this.modelStandardLoader.getModel(key);
            const modelData = data[key];
            if (model && modelData) {
                const mapData = new Map<string, any>(Object.entries(modelData));
                this.modsMethodStandardMap.get(key)?.init(key, mapData, model)
                    .addScene(this.scene);
            }
        })
    }

    updateLoaderSceneByData(data: SceneData): void {
        merge(this.data, data)
        let modelKeys = this.modelStandardLoader.getLoadedModelKeys();
        modelKeys.forEach((key) => {
            const modelData = data[key];
            if (modelData) {
                const mapData = new Map<string, any>(Object.entries(modelData));
                this.modsMethodStandardMap.get(key)?.updateAll(mapData);
            }
        })
    }


    disposeAll(): void {
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
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
