// 扩展后的版本示例
import * as THREE from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import Stats from 'three/addons/libs/stats.module.js'
// 其他需要的模块...

export {
    THREE,
    dat,
    OrbitControls,
    GLTFLoader,
    EffectComposer,
    Stats,
    // 其他导出的模块...
};

export type {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Mesh,
    BoxGeometry,
    MeshBasicMaterial,
    AxesHelper,
    Color,
    ColorRepresentation,
    Object3D,
    Vector3,
    Group,
} from 'three';

export type {
    GUI,
    GUIController
} from 'dat.gui';

// 定义 MyAxis 类
// 这个类可以用于物体的旋转和步进和位置
export class MyAxis{
    x: number;
    y: number;
    z: number;
    xStep: number;
    yStep: number;
    zStep: number;
    isXRotary: boolean = false;
    isYRotary: boolean = false;
    isZRotary: boolean = false;
    constructor() {
        this.x = 0;
        this.y = 0
        this.z = 0;
        this.xStep = 0.01;
        this.yStep = 0.01;
        this.zStep = 0.01;
    }
    setX(x:number){
        this.x = x;
        return this;
    }
    setY(y:number){
        this.y = y;
        return this;
    }
    setZ(z:number){
        this.z = z;
        return this;
    }
    setXStep(xStep:number){
        this.xStep = xStep;
        return this;
    }
    setYStep(yStep:number){
        this.yStep = yStep;
        return this;
    }
    setZStep(zStep:number){
        this.zStep = zStep;
        return this;
    }
    setXRotary(isXRotary:boolean){
        this.isXRotary = isXRotary;
        return this;
    }
    setYRotary(isYRotary:boolean){
        this.isYRotary = isYRotary;
        return this;
    }
    setZRotary(isZRotary:boolean){
        this.isZRotary = isZRotary;
        return this;
    }
}
