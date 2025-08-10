// 扩展后的版本示例
import * as THREE from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import Stats from 'three/addons/libs/stats.module.js'
import  * as CANNON from 'cannon';
import type {Vec3} from 'cannon';
// 其他需要的模块...

export {
    THREE,
    dat,
    OrbitControls,
    GLTFLoader,
    EffectComposer,
    Stats,
    CANNON,
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
    Vec3
}

export type {
    GUI,
    GUIController
} from 'dat.gui';

export const vector3ToVec3 = (v: THREE.Vector3): Vec3 => {
   return new CANNON.Vec3(v.x, v.y, v.z);
}
