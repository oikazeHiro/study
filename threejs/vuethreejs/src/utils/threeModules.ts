// 扩展后的版本示例
import * as THREE from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import { Water } from 'three/addons/objects/Water.js';
import { Sky } from 'three/addons/objects/Sky.js';
import Ammo from "ammo.js";
import Stats from 'three/addons/libs/stats.module.js'
import { pass, uniform, time, oscSine } from 'three/tsl';
import { outline } from 'three/addons/tsl/display/OutlineNode.js';
import * as CANNON from 'cannon';
import type {Vec3} from 'cannon';
import { Earcut } from 'three/src/extras/Earcut';
// 其他需要的模块...

export {
    THREE,
    dat,
    OrbitControls,
    GLTFLoader,
    FBXLoader,
    EffectComposer,
    Stats,
    CANNON,
    // 其他导出的模块...
    Water,
    Sky,
    Ammo,
    pass,
    uniform,
    time,
    oscSine,
    outline,
    Earcut,
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
    Vector2,
    Group,
    WebGLRenderTarget,
    AnimationClip,
    AnimationMixer,
    Material,
    BufferGeometry,
    BufferAttribute,
    SphereGeometry,
    MeshStandardMaterial,
    Texture,
    TextureLoader,
} from 'three';

export type {
    Vec3
}

export type {
    GUI,
    GUIController
} from 'dat.gui';

// 将 THREE.Vector3 转换为 CANNON.Vec3
export const vector3ToVec3 = (v: THREE.Vector3): Vec3 => {
    return new CANNON.Vec3(v.x, v.y, v.z);
}

// 将 CANNON.Vec3 转换为 THREE.Vector3
export const vec3ToVector3 = (v: Vec3): THREE.Vector3 => {
    return new THREE.Vector3(v.x, v.y, v.z);
}

// 获取相机的世界方向向量
export const cameraDirection = (camera: THREE.PerspectiveCamera): THREE.Vector3 => {
    const direction = new THREE.Vector3();
    camera.getWorldDirection(direction);
    return direction;
}

// 手动计算 origin 指向 coordinate 的单位方向向量
export const cameraDirectionManual = (origin: THREE.Vector3, coordinate: THREE.Vector3): THREE.Vector3 => {
    const sub = origin.clone().sub(coordinate);
    const x_pow = Math.pow(sub.x, 2);
    const y_pow = Math.pow(sub.y, 2);
    const z_pow = Math.pow(sub.z, 2);
    const sum = Math.sqrt(x_pow + y_pow + z_pow);
    return new THREE.Vector3(
        sub.x / sum,
        sub.y / sum,
        sub.z / sum
    );
}

export class UpdateParams{
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
    visible: boolean;
    animationName: string;
    constructor(position: THREE.Vector3, rotation: THREE.Euler, scale: THREE.Vector3, visible: boolean, animationName: string) {
        this.position = position;
        this.rotation = rotation;
        this.scale = scale;
        this.visible = visible;
        this.animationName = animationName;
    }
}

