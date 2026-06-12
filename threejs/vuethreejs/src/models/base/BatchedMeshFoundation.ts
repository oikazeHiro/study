import {THREE, anyDataToVector3, anyDataToEuler, ModelBasisData, xyz} from '@/utils/threeModules'

/**
 * 几何体配置
 *
 * BatchedMesh 的"材质多样"体现在：
 *   - mesh-level 的 material 数组（batchedMesh.material = [matA, matB, ...]）
 *   - 每个 geometry 的 group 通过 materialIndex 引用上述数组中的材质
 *   - 不同实例使用不同 geometry → 自然拥有不同的材质组合
 *   - 再加 setColorAt() 为每个实例叠加颜色
 */
interface GeometryConfig {
    /** 几何体 */
    geometry: THREE.BufferGeometry;
    /** 预留给该几何体的最大实例数（可选） */
    reservedCount?: number;
}

/**
 * 实例变换缓存
 */
interface InstanceTransform extends ModelBasisData {
    position: xyz;
    rotation: xyz;
    scale: xyz;
    visible: boolean;
}

/**
 * 数量大但模型复制且材质多的模型
 */
export class BatchedMeshFoundation {
    /** 实例数据映射，key → data */
    dataMap: Map<string, any>;
    /** BatchedMesh 实例 */
    batchedMesh!: THREE.BatchedMesh;
    /** geometryId → GeometryConfig */
    geometryMap: Map<number, GeometryConfig>;
    /** data key → instanceId */
    keyToInstanceId: Map<string, number>;
    /** instanceId → data key */
    instanceIdToKey: Map<number, string>;
    /** instanceId → geometryId（BatchedMesh 无公开 getter，自己维护） */
    private instanceGeometryMap: Map<number, number>;
    /** 每个实例的变换缓存，key 同 dataMap */
    private instanceTransforms: Map<string, InstanceTransform>;

    type: string;

    constructor() {
        this.dataMap = new Map();
        this.geometryMap = new Map();
        this.keyToInstanceId = new Map();
        this.instanceIdToKey = new Map();
        this.instanceGeometryMap = new Map();
        this.instanceTransforms = new Map();
    }

    /**
     * 初始化 BatchedMesh
     *
     * BatchedMesh 需要预估 GPU 容量（不可动态扩容），
     * 因此调用方需指定 maxInstanceCount / maxVertexCount / maxIndexCount。
     *
     * 材质多样性通过 mesh-level 的 material 数组实现：
     *   batchedMesh.material = [matA, matB, ...]
     *   每个 geometry 的 group 按其 materialIndex 自动引用对应材质。
     *   不同实例使用不同 geometry → 自然对应不同的材质组合。
     *
     * @param maxInstanceCount 最大实例数
     * @param maxVertexCount  最大顶点总数
     * @param maxIndexCount   最大索引总数
     * @param material        mesh-level 材质（单个或数组），各 geometry group 的 materialIndex 引用此数组
     * @param geometries      几何体配置数组（至少一个）
     * @param dataMap         实例数据，每项可含：
     *                          - geometryId  指定使用哪个几何体（不填则用第一个）
     *                          - position / rotation / scale / visible / color （同 InstancedMeshFoundation）
     * @param type 类型
     */
    init(
        maxInstanceCount: number,
        maxVertexCount: number,
        maxIndexCount: number,
        material: THREE.Material | THREE.Material[],
        geometries: GeometryConfig[],
        dataMap: Map<string, any>,
        type: string,
    ): this {
        this.type = type;
        if (geometries.length === 0) {
            throw new Error('BatchedMeshFoundation.init: geometries 不能为空');
        }
        this.dataMap = dataMap;
        // @types/three 声明只接受 Material，但运行时 BatchedMesh extends Mesh 实际支持 Material | Material[]
        this.batchedMesh = new THREE.BatchedMesh(
            maxInstanceCount, maxVertexCount, maxIndexCount, material as THREE.Material
        );


        // 注册所有几何体
        this.geometryMap.clear();
        for (const config of geometries) {
            const geometryId = this.batchedMesh.addGeometry(
                config.geometry,
                config.reservedCount ?? Math.ceil(maxInstanceCount / geometries.length),
            );
            this.geometryMap.set(geometryId, config);
        }

        // 添加所有实例并设置初始状态
        this.keyToInstanceId.clear();
        this.instanceIdToKey.clear();
        this.instanceGeometryMap.clear();
        this.instanceTransforms.clear();
        this.initAllInstances(dataMap);

        return this;
    }

    // ======================== 内部工具 ========================

    /**
     * 遍历 dataMap 写入所有实例的初始矩阵、颜色与可见性
     */
    private initAllInstances(dataMap: Map<string, any>): void {
        const dummy = new THREE.Object3D();
        dataMap.forEach((value, key) => {
            const geometryId = this.resolveGeometryId(value, key);
            if (geometryId === undefined) return;

            const instanceId = this.batchedMesh.addInstance(geometryId);
            this.registerInstance(key, instanceId, geometryId);

            const position = value.position ? anyDataToVector3(value.position) : new THREE.Vector3();
            const rotation = value.rotation ? anyDataToEuler(value.rotation) : new THREE.Euler();
            const scale = value.scale ? anyDataToVector3(value.scale) : new THREE.Vector3(1, 1, 1);
            const visible = value.visible !== undefined ? !!value.visible : true;

            this.instanceTransforms.set(key, {
                id: key,
                name: value.name,
                status: value.status,
                type: value.type,
                description: value.description,
                position: new xyz(position.x, position.y, position.z),
                rotation: new xyz(rotation.x, rotation.y, rotation.z),
                scale: new xyz(scale.x, scale.y, scale.z),
                visible,
            });

            // 写入矩阵与可见性
            dummy.position.copy(position);
            dummy.rotation.copy(rotation);
            dummy.scale.copy(visible ? scale : new THREE.Vector3(0, 0, 0));
            dummy.updateMatrix();
            this.batchedMesh.setMatrixAt(instanceId, dummy.matrix);
            this.batchedMesh.setVisibleAt(instanceId, visible);

            // 颜色
            if (value.color !== undefined) {
                this.batchedMesh.setColorAt(instanceId, new THREE.Color(value.color));
            }
        });
    }

    /**
     * 注册 key ↔ instanceId ↔ geometryId 的映射关系
     */
    private registerInstance(key: string, instanceId: number, geometryId: number): void {
        this.keyToInstanceId.set(key, instanceId);
        this.instanceIdToKey.set(instanceId, key);
        this.instanceGeometryMap.set(instanceId, geometryId);
    }

    /**
     * 注销映射
     */
    private unregisterInstance(instanceId: number): void {
        const key = this.instanceIdToKey.get(instanceId);
        if (key) this.keyToInstanceId.delete(key);
        this.instanceIdToKey.delete(instanceId);
        this.instanceGeometryMap.delete(instanceId);
    }

    /**
     * 从 data 解析 geometryId，未指定则 fallback 到第一个注册的几何体
     */
    private resolveGeometryId(value: any, key: string): number | undefined {
        if (value.geometryId !== undefined) {
            const gid = Number(value.geometryId);
            if (this.geometryMap.has(gid)) return gid;
            console.warn(`BatchedMeshFoundation: geometryId ${gid} 未注册，key=${key}`);
            return undefined;
        }
        const first = this.geometryMap.keys().next();
        return first.done ? undefined : first.value;
    }

    /**
     * 从缓存组合指定实例的完整变换矩阵并写回 GPU
     */
    private composeMatrix(key: string): void {
        const instanceId = this.keyToInstanceId.get(key);
        const t = this.instanceTransforms.get(key);
        if (instanceId === undefined || !t) return;

        const dummy = new THREE.Object3D();
        dummy.position.copy(anyDataToVector3(t.position));
        dummy.rotation.copy(anyDataToEuler(t.rotation));
        dummy.scale.copy(t.visible ? anyDataToVector3(t.scale) : new THREE.Vector3(0, 0, 0));
        dummy.updateMatrix();
        this.batchedMesh.setMatrixAt(instanceId, dummy.matrix);
        this.batchedMesh.setVisibleAt(instanceId, t.visible);
    }

    /**
     * 获取或创建某个 key 的变换缓存
     */
    private getOrCreateTransform(key: string): InstanceTransform {
        let t = this.instanceTransforms.get(key);
        if (!t) {
            t = {
                id: key,
                name: undefined,
                status: undefined,
                type: undefined,
                description: undefined,
                position: new xyz(),
                rotation: new xyz(),
                scale: new xyz(1, 1, 1),
                visible: true,
            };
            this.instanceTransforms.set(key, t);
        }
        return t;
    }

    // ======================== 查询 ========================

    /**
     * 获取某个实例使用的 geometryId
     */
    getGeometryId(key: string): number | undefined {
        const instanceId = this.keyToInstanceId.get(key);
        if (instanceId === undefined) return undefined;
        return this.instanceGeometryMap.get(instanceId);
    }

    /**
     * 获取某个实例对应的 GeometryConfig
     */
    getGeometryConfig(key: string): GeometryConfig | undefined {
        const geometryId = this.getGeometryId(key);
        if (geometryId === undefined) return undefined;
        return this.geometryMap.get(geometryId);
    }

    /**
     * 获取 BatchedMesh 的 mesh-level 材质（单个或数组）
     */
    getMaterial(): THREE.Material | THREE.Material[] {
        return this.batchedMesh.material;
    }

    /**
     * 获取当前实例数
     */
    getInstanceCount(): number {
        return this.batchedMesh.instanceCount;
    }

    // ======================== 单实例更新 ========================

    /**
     * 更新某个实例的位置
     * @param data { id, position }
     */
    updateOnePosition(data: any): this {
        if (!data?.id || !data?.position) return this;
        if (!this.keyToInstanceId.has(data.id)) return this;

        const t = this.getOrCreateTransform(data.id);
        t.position.copy(anyDataToVector3(data.position));
        this.composeMatrix(data.id);
        return this;
    }

    /**
     * 更新某个实例的旋转
     * @param data { id, rotation }
     */
    updateOneRotation(data: any): this {
        if (!data?.id || !data?.rotation) return this;
        if (!this.keyToInstanceId.has(data.id)) return this;

        const t = this.getOrCreateTransform(data.id);
        t.rotation.copy(anyDataToEuler(data.rotation));
        this.composeMatrix(data.id);
        return this;
    }

    /**
     * 更新某个实例的缩放
     * @param data { id, scale }
     */
    updateOneScale(data: any): this {
        if (!data?.id || !data?.scale) return this;
        if (!this.keyToInstanceId.has(data.id)) return this;

        const t = this.getOrCreateTransform(data.id);
        t.scale.copy(anyDataToVector3(data.scale));
        this.composeMatrix(data.id);
        return this;
    }

    /**
     * 更新某个实例的可见性
     * BatchedMesh 原生 setVisibleAt，无需 zero-scale hack
     * @param data { id, visible }
     */
    updateOneVisible(data: any): this {
        if (!data?.id || data.visible === undefined) return this;
        const instanceId = this.keyToInstanceId.get(data.id);
        if (instanceId === undefined) return this;

        const t = this.getOrCreateTransform(data.id);
        t.visible = !!data.visible;
        this.composeMatrix(data.id);
        return this;
    }

    /**
     * 更新某个实例的颜色
     * @param data { id, color }
     */
    updateOneColor(data: any): this {
        if (!data?.id || data.color === undefined) return this;
        const instanceId = this.keyToInstanceId.get(data.id);
        if (instanceId === undefined) return this;

        this.batchedMesh.setColorAt(instanceId, new THREE.Color(data.color));
        return this;
    }

    // ======================== 整体变换 ========================

    updateSize(vector3: THREE.Vector3): this {
        this.batchedMesh.scale.copy(vector3);
        return this;
    }

    updatePosition(vector3: THREE.Vector3): this {
        this.batchedMesh.position.copy(vector3);
        return this;
    }

    updateRotation(euler: THREE.Euler): this {
        this.batchedMesh.rotation.copy(euler);
        return this;
    }

    // ======================== 动态增删实例 ========================

    /**
     * 动态添加一个实例（O(1)，无需重建）
     * @param key  实例标识
     * @param data 实例数据，可含 geometryId / position / rotation / scale / visible / color
     */
    addOne(key: string, data: any): this {
        if (this.keyToInstanceId.has(key)) {
            console.warn(`BatchedMeshFoundation.addOne: key "${key}" 已存在`);
            return this;
        }

        const geometryId = this.resolveGeometryId(data, key);
        if (geometryId === undefined) return this;

        const instanceId = this.batchedMesh.addInstance(geometryId);
        this.registerInstance(key, instanceId, geometryId);
        this.dataMap.set(key, data);

        const position = data.position ? anyDataToVector3(data.position) : new THREE.Vector3();
        const rotation = data.rotation ? anyDataToEuler(data.rotation) : new THREE.Euler();
        const scale = data.scale ? anyDataToVector3(data.scale) : new THREE.Vector3(1, 1, 1);
        const visible = data.visible !== undefined ? !!data.visible : true;

        this.instanceTransforms.set(key, {
            id: key,
            name: data.name,
            status: data.status,
            type: data.type,
            description: data.description,
            position: new xyz(position.x, position.y, position.z),
            rotation: new xyz(rotation.x, rotation.y, rotation.z),
            scale: new xyz(scale.x, scale.y, scale.z),
            visible,
        });

        const dummy = new THREE.Object3D();
        dummy.position.copy(position);
        dummy.rotation.copy(rotation);
        dummy.scale.copy(visible ? scale : new THREE.Vector3(0, 0, 0));
        dummy.updateMatrix();
        this.batchedMesh.setMatrixAt(instanceId, dummy.matrix);
        this.batchedMesh.setVisibleAt(instanceId, visible);

        if (data.color !== undefined) {
            this.batchedMesh.setColorAt(instanceId, new THREE.Color(data.color));
        }

        return this;
    }

    /**
     * 动态移除一个实例（O(1)，无需重建）
     * @param key 实例标识
     */
    removeOne(key: string): this {
        const instanceId = this.keyToInstanceId.get(key);
        if (instanceId === undefined) return this;

        this.batchedMesh.deleteInstance(instanceId);
        this.unregisterInstance(instanceId);
        this.dataMap.delete(key);
        this.instanceTransforms.delete(key);
        return this;
    }

    // ======================== 批量更新 ========================

    /**
     * 全量更新：diff 新旧 dataMap，增量增删 + 更新已有实例
     * 比 InstancedMeshFoundation.updateAll 高效——无需重建
     */
    updateAll(dataMap: Map<string, any>): this {
        const newKeys = new Set(dataMap.keys());
        const oldKeys = new Set(this.dataMap.keys());

        // 1. 删除
        for (const key of oldKeys) {
            if (!newKeys.has(key)) this.removeOne(key);
        }

        // 2. 新增
        for (const key of newKeys) {
            if (!oldKeys.has(key)) this.addOne(key, dataMap.get(key));
        }

        // 3. 更新已有
        for (const key of newKeys) {
            if (oldKeys.has(key)) {
                this.dataMap.set(key, dataMap.get(key));
                this.updateExistingInstance(key, dataMap.get(key));
            }
        }

        return this;
    }

    /**
     * 更新一个已存在的实例
     */
    private updateExistingInstance(key: string, value: any): void {
        const instanceId = this.keyToInstanceId.get(key);
        if (instanceId === undefined) return;

        const t = this.getOrCreateTransform(key);
        if (value.position) t.position.copy(anyDataToVector3(value.position));
        if (value.rotation) t.rotation.copy(anyDataToEuler(value.rotation));
        if (value.scale) t.scale.copy(anyDataToVector3(value.scale));
        if (value.visible !== undefined) t.visible = !!value.visible;

        this.composeMatrix(key);

        if (value.color !== undefined) {
            this.batchedMesh.setColorAt(instanceId, new THREE.Color(value.color));
        }
    }

    /**
     * 基于当前缓存刷新所有实例的矩阵
     */
    update(): this {
        this.dataMap.forEach((_value, key) => {
            this.composeMatrix(key);
        });
        return this;
    }

    // ======================== 场景管理 ========================

    addScene(scene: THREE.Scene): this {
        scene.add(this.batchedMesh);
        return this;
    }

    removeScene(scene: THREE.Scene): this {
        scene.remove(this.batchedMesh);
        return this;
    }

    // ======================== 生命周期 ========================

    /**
     * 释放所有 GPU 资源并清理映射
     */
    dispose(): void {
        if (this.batchedMesh) {
            if (this.batchedMesh.parent) {
                this.batchedMesh.parent.remove(this.batchedMesh);
            }
            // BatchedMesh.dispose() 一并释放内部托管的 geometry 与 material
            this.batchedMesh.dispose();
        }

        this.geometryMap.clear();
        this.keyToInstanceId.clear();
        this.instanceIdToKey.clear();
        this.instanceGeometryMap.clear();
        this.dataMap.clear();
        this.instanceTransforms.clear();
    }
}
