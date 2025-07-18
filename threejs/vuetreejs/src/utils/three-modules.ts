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
    Stats
    // 其他导出的模块...
};

export type {
    Scene,
    PerspectiveCamera,
    WebGLRenderer,
    Mesh,
    BoxGeometry,
    MeshBasicMaterial,
    AxesHelper
} from 'three';

export type {
    GUI,
    GUIController
} from 'dat.gui';

export class MyAxis{
    x: number;
    y: number;
    z: number;
    zStep: number;
    yStep: number;
    ZStep: number;
    constructor() {
        this.x = 0;
        this.y = 0
        this.z = 0;
        this.zStep = 0.1;
        this.yStep = 0.1;
        this.ZStep = 0.1;
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
}
