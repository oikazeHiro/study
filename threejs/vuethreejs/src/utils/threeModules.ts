// 扩展后的版本示例
import * as THREE from 'three';
import * as dat from 'dat.gui';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {FBXLoader} from 'three/addons/loaders/FBXLoader.js';
import {OBJLoader} from "three/addons/loaders/OBJLoader.js";
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {OutlinePass} from 'three/addons/postprocessing/OutlinePass.js';
import {Water} from 'three/addons/objects/Water.js';
import {Sky} from 'three/addons/objects/Sky.js';
import {CSS2DObject, CSS2DRenderer} from 'three/addons/renderers/CSS2DRenderer.js';
import Ammo from "ammo.js";
import Stats from 'three/addons/libs/stats.module.js'
import {oscSine, pass, time, uniform} from 'three/tsl';
import {outline} from 'three/addons/tsl/display/OutlineNode.js';
import type {Vec3} from 'cannon';
import * as CANNON from 'cannon';
// examples/jsm/libs/tween.module.js"
import * as TWEEN from "three/examples/jsm/libs/tween.module.js";
import {Earcut} from 'three/src/extras/Earcut';

// 其他需要的模块...

export {
    THREE,
    TWEEN,
    dat,
    OrbitControls,
    GLTFLoader,
    FBXLoader,
    OBJLoader,
    EffectComposer,
    RenderPass,
    UnrealBloomPass,
    OutlinePass,
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
    CSS2DRenderer,
    CSS2DObject,
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

export class UpdateParams {
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

/**
 * 统一修正模型的前方方向
 * @param model 要修正的 Object3D
 * @param from  模型当前的“前方方向”（比如 -X 就写 new THREE.Vector3(-1,0,0)）
 * @param to    想要统一的“目标前方方向”（默认是 +Z）
 */
export function alignModelForward(
    model: THREE.Object3D,
    from: THREE.Vector3 = new THREE.Vector3(-1, 0, 0),
    to: THREE.Vector3 = new THREE.Vector3(0, 0, 1)
) {
    const q = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
    model.quaternion.premultiply(q);
    // 更新模型矩阵
    model.updateMatrix();
    // 如果模型有子对象，可能也需要更新它们的矩阵
    model.updateMatrixWorld(true);
}

export interface Node {
    position: { x: number; y: number; z: number } | THREE.Vector3;
    radius?: number; // 截面半径（切面大小）
}

export interface CurvedBarParams {
    nodes?: Node[]; // 控制点（节点）
    closed?: boolean;
    tubularSegments?: number; // 曲线上采样段数（越大越平滑）
    radialSegments?: number; // 截面环上顶点数
    color?: number;
    roughness?: number;
    metalness?: number;
    colorMapUrl?: string;
    normalMapUrl?: string;
    textureRepeat?: [number, number];
    castShadow?: boolean;
    receiveShadow?: boolean;
}

/**
 *
 * @param data
 */
export const modDataToCurvedBarParams = (data: any): CurvedBarParams => {
    const nodes = new Array<Node>()
    if (data.nodes) {
        for (let node of data.nodes) {
            nodes.push({
                position: new THREE.Vector3(node.position.x, node.position.y, node.position.z),
                radius: node.radius
            })
        }
    }
    const textureRepeat: [number, number] = [1, 1]
    if (data.textureRepeat && data.textureRepeat.length > 1) {
        textureRepeat[0] = data.textureRepeat[0]
        textureRepeat[1] = data.textureRepeat[1]
    }
    return {
        nodes: nodes,
        closed: data.closed,
        tubularSegments: data.tubularSegments,
        radialSegments: data.radialSegments,
        color: data.color,
        roughness: data.roughness,
        metalness: data.metalness,
        colorMapUrl: data.colorMapUrl,
        normalMapUrl: data.normalMapUrl,
        textureRepeat: textureRepeat,
        castShadow: data.castShadow,
        receiveShadow: data.receiveShadow,
    }
}
/**
 * 将任意数据转为 THREE.Vector3
 * @param data
 */
export const anyDataToVector3 = (data: any): THREE.Vector3 => {
    if (data instanceof THREE.Vector3) {
        return data
    } else {
        return new THREE.Vector3(data.x, data.y, data.z)
    }
}
/**
 * 将任意数据转为 THREE.Euler
 * @param data
 */
export const anyDataToEuler = (data: any): THREE.Euler => {
    if (data instanceof THREE.Euler) {
        return data
    } else {
        return new THREE.Euler(data.x, data.y, data.z, data.order)
    }
}

/**
 * 模型基础数据接口
 * 用于描述从 API 传入的单个模型实例的完整数据结构
 */
export interface ModelBasisData {
    /** 实例唯一标识 */
    id?: string;
    /** 实例名称 */
    name?: string;
    /** 状态（如 'normal' 表示可见） */
    status?: string;
    /** 类型标识 */
    type?: string;
    /** 描述文本 */
    description?: string;
    /** 位置（支持 {x,y,z} 对象 / THREE.Vector3） */
    position?: xyz;
    /** 旋转（支持 {x,y,z,order?} 对象 / THREE.Euler） */
    rotation?: xyz;
    /** 缩放（支持 {x,y,z} 对象 / THREE.Vector3） */
    scale?: xyz;
    /** 可见性 */
    visible?: boolean;
    /** 颜色（支持 hex 数值 / css 字符串 / THREE.Color） */
    color?: number | string;
}

/**
 * 三维坐标值对象
 * 与 THREE.Vector3 / THREE.Euler 结构兼容，可直接互相赋值
 */
export class xyz {
    x: number;
    y: number;
    z: number;

    constructor(x: number = 0, y: number = 0, z: number = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    /**
     * 从任意具有 x/y/z 属性的对象复制值
     * @returns this 支持链式调用
     */
    copy(val: THREE.Vector3 | THREE.Euler | xyz | { x: number; y: number; z: number }): this {
        this.x = val.x;
        this.y = val.y;
        this.z = val.z;
        return this;
    }

    /**
     * 直接设置三个分量
     * @returns this 支持链式调用
     */
    set(x: number, y: number, z: number): this {
        this.x = x;
        this.y = y;
        this.z = z;
        return this;
    }

    /**
     * 深拷贝
     */
    clone(): xyz {
        return new xyz(this.x, this.y, this.z);
    }

    /**
     * 转为 THREE.Vector3
     */
    toVector3(): THREE.Vector3 {
        return new THREE.Vector3(this.x, this.y, this.z);
    }

    /**
     * 转为 THREE.Euler（默认 order 为 'YXZ'）
     */
    toEuler(order: string = 'YXZ'): THREE.Euler {
        return new THREE.Euler(this.x, this.y, this.z, order);
    }
}


