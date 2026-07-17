import {THREE} from '@/utils/threeModules'

/**
 * 统一实例数据格式。所有字段可选，调用方只需传入需要变更的字段。
 *
 * 四种模型类型（ModsMethodStandardImpl / InstancedMeshFoundation / BatchedMeshFoundation / AtlasInstancedMeshFoundation）
 * 都接收此格式的数据，字段说明：
 *
 * | 字段        | 适用类型                                 | 说明                                           |
 * |-------------|------------------------------------------|------------------------------------------------|
 * | position    | 全部                                     | 实例位置 {x,y,z}                               |
 * | rotation    | 全部                                     | 实例旋转 {x,y,z}，可选 order                   |
 * | scale       | 全部                                     | 实例缩放 {x,y,z}                               |
 * | visible     | 全部                                     | 可见性，true=显示 false=隐藏                   |
 * | status      | ModsMethodStandardImpl                   | 兼容旧字段，'normal'=可见，'hidden'=隐藏       |
 * | color       | InstancedMeshFoundation / BatchedMesh    | 实例颜色，支持 hex number 或 CSS 字符串        |
 * | tileIndex   | AtlasInstancedMeshFoundation             | 纹理图集索引（0-based），仅 Atlas 使用         |
 * | geometryId  | BatchedMeshFoundation                    | 几何体 ID，仅 BatchedMesh 使用                 |
 */
export interface ModelInstanceData {
    position?: { x: number; y: number; z: number };
    rotation?: { x: number; y: number; z: number; order?: string };
    scale?: { x: number; y: number; z: number };
    visible?: boolean;
    status?: string;
    color?: number | string;
    tileIndex?: number;
    geometryId?: number;
    [key: string]: any;
}

/**
 * 统一模型操作接口。
 *
 * 所有模型类型（clone / InstancedMesh / BatchedMesh）都实现此接口，
 * 上层只需面向它编程，无需区分底层实现细节。
 *
 * 注意：dispose 语义统一为"释放所有资源"，没有逐实例销毁。
 * 逐实例销毁是 clone 模型的私有特性，不由本接口暴露。
 */
export interface ManagedModel {
    /** 添加到场景 */
    addScene(scene: THREE.Scene): this;

    /** 全量更新所有实例 */
    updateAll(dataMap: Map<string, ModelInstanceData>): this;

    /** 设置单个实例的位置 */
    setPosition(name: string, position: THREE.Vector3): this;

    /** 设置单个实例的旋转 */
    setRotation(name: string, rotation: THREE.Euler): this;

    /** 设置单个实例的缩放 */
    setScale(name: string, scale: THREE.Vector3): this;

    /** 设置单个实例的可见性 */
    setVisible(name: string, visible: boolean): this;

    /** 设置单个实例全部材质的颜色 */
    setColor(name: string, color: THREE.Color): this;

    /** 设置单个实例指定材质名称的颜色（多材质模型用） */
    setColor(name: string, material: string, color: THREE.Color): this;

    /** 释放所有实例的资源 */
    disposeAll(): void;

    /**
     * 【可选】返回参与射线检测的 Object3D 列表。
     * 复合模型（如 BatchedGroupModel 内含多个 BatchedMesh）应实现此方法。
     */
    getRaycastTargets?(): THREE.Object3D[];

    /**
     * 【可选】将射线命中结果解析为实例标识与数据。
     * @param intersect Raycaster.intersectObjects 返回的命中条目
     * @returns { key, data } 或 null
     */
    resolveHit?(intersect: THREE.Intersection<THREE.Object3D>): { key: string; data: any } | null;
}
