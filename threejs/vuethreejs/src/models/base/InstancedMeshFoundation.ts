import {THREE, anyDataToVector3, anyDataToEuler, ModelBasisData, xyz} from '@/utils/threeModules'
import { ManagedModel, ModelInstanceData } from "@/models/base/ManagedModel";

/**
 * 单个实例的完整变换缓存
 * 继承 ModelBasisData 的元数据字段，但变换属性在缓存中始终存在（不可为空）
 */
interface InstanceTransform extends ModelBasisData {
    position: xyz;
    rotation: xyz;
    scale: xyz;
    visible: boolean;
}

/**
 * 数量巨大 且模型和材质 比较单一的模型实例缓存，用于提升性能
 */
export class InstancedMeshFoundation implements ManagedModel {
    /** 实例数据映射，value 结构参见 ModelBasisData */
    dataMap: Map<string, any>;
    /** 当前活跃实例数（等于 dataMap.size） */
    num: number;
    /** GPU 预分配容量（=2^k ≥ num），避免频繁重建 InstancedMesh */
    maxCount: number;
    instancedMesh!: THREE.InstancedMesh;
    geometry!: THREE.BufferGeometry;
    /** data key → instancedMesh 中的索引（首次分配后稳定不变，除非扩容） */
    keyMap: Map<string, number>;
    /** 每个实例的完整变换缓存，key 同 dataMap */
    private instanceTransforms: Map<string, InstanceTransform>;

    type: string;

    constructor() {
        this.dataMap = new Map();
        this.num = 0;
        this.maxCount = 0;
        this.keyMap = new Map();
        this.instanceTransforms = new Map();
    }

    /**
     * 初始化 InstancedMesh 并设置所有实例的初始矩阵
     * @param geometry 共享几何体
     * @param material 共享材质（需支持 instancing）
     * @param dataMap 实例数据，每项可含 position/rotation/scale/visible/color
     * @param type 类型
     * @param maxCount GPU 预分配容量（不传则自动向上取 2 的幂）
     */
    init(geometry: THREE.BufferGeometry, material: THREE.Material, dataMap: Map<string, any>, type: string, maxCount?: number): this {
        this.type = type;
        this.geometry = geometry;
        this.dataMap = dataMap;
        this.num = dataMap.size;
        this.maxCount = maxCount ?? this.nextPowerOfTwo(this.num || 1);
        this.instancedMesh = new THREE.InstancedMesh(geometry, material, this.maxCount);
        this.instancedMesh.count = this.num;
        this.instancedMesh.name = type
        this.refreshKeyMap(dataMap);
        this.instanceTransforms.clear();
        this.initAllMatrices(dataMap);
        return this;
    }

    // ======================== 内部工具 ========================

    /**
     * 根据 dataMap 重建 key→index 映射（索引从 0 连续编号）
     */
    private refreshKeyMap(dataMap: Map<string, any>): void {
        this.keyMap.clear();
        let i = 0;
        dataMap.forEach((_value, key) => {
            this.keyMap.set(key, i);
            i++;
        });
    }

    /**
     * 遍历 dataMap 写入所有实例的初始矩阵与颜色
     */
    private initAllMatrices(dataMap: Map<string, any>): void {
        const dummy = new THREE.Object3D();
        dataMap.forEach((value, key) => {
            const index = this.keyMap.get(key);
            if (index === undefined) return;

            const position = value.position ? anyDataToVector3(value.position) : new THREE.Vector3();
            const rotation = value.rotation ? anyDataToEuler(value.rotation) : new THREE.Euler();
            const scale = value.scale ? anyDataToVector3(value.scale) : new THREE.Vector3(1, 1, 1);
            const visible = value.visible !== undefined ? !!value.visible : true;

            // 缓存完整变换，避免后续单属性更新时丢失其他属性
            this.instanceTransforms.set(key, {
                id: key,
                name: value.name,
                status: value.status,
                type: value.type,
                description: value.description,
                position: new xyz(),
                rotation: new xyz(),
                scale: new xyz(1,1,1),
                visible,
            });

            // 不可见实例通过 zero-scale 隐藏
            dummy.position.copy(position);
            dummy.rotation.copy(rotation);
            dummy.scale.copy(visible ? scale : new THREE.Vector3(0, 0, 0));
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(index, dummy.matrix);

            // 颜色（如果提供了 color 字段）
            if (value.color !== undefined) {
                this.instancedMesh.setColorAt(index, new THREE.Color(value.color));
            }
        });
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
    }

    /**
     * 从缓存组合指定实例的完整变换矩阵并写回 GPU
     */
    private composeMatrix(key: string): void {
        const index = this.keyMap.get(key);
        const t = this.instanceTransforms.get(key);
        if (index === undefined || !t) return;

        const dummy = new THREE.Object3D();
        dummy.position.copy(anyDataToVector3(t.position));
        dummy.rotation.copy(anyDataToEuler(t.rotation));
        // 不可见 → zero-scale
        dummy.scale.copy(t.visible ? anyDataToVector3(t.scale) : new THREE.Vector3(0, 0, 0));
        dummy.updateMatrix();
        this.instancedMesh.setMatrixAt(index, dummy.matrix);
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    /**
     * 获取或创建某个 key 的变换缓存
     * 新建时填充合理的默认值，确保所有 ModelBasisData 字段都有值
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
                scale: new xyz(1,1,1),
                visible: true,
            };
            this.instanceTransforms.set(key, t);
        }
        return t;
    }

    // ======================== 单实例更新 ========================

    /**
     * 更新某个实例的位置
     * @param data { id, position }
     */
    updateOnePosition(data: any): this {
        if (!data?.id || !data?.position) return this;
        if (!this.keyMap.has(data.id)) return this;

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
        if (!this.keyMap.has(data.id)) return this;

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
        if (!this.keyMap.has(data.id)) return this;

        const t = this.getOrCreateTransform(data.id);
        t.scale.copy(anyDataToVector3(data.scale));
        this.composeMatrix(data.id);
        return this;
    }

    /**
     * 更新某个实例的可见性
     * InstancedMesh 不支持逐实例 visible，通过 zero-scale 模拟隐藏
     * @param data { id, visible }
     */
    updateOneVisible(data: any): this {
        if (!data?.id || data.visible === undefined) return this;
        if (!this.keyMap.has(data.id)) return this;

        const t = this.getOrCreateTransform(data.id);
        t.visible = !!data.visible;
        this.composeMatrix(data.id);
        return this;
    }

    /**
     * 更新某个实例的颜色
     * @param data { id, color } — color 可以是 THREE.Color、hex 数值或 css 字符串
     */
    updateOneColor(data: any): this {
        if (!data?.id || data.color === undefined) return this;
        const index = this.keyMap.get(data.id);
        if (index === undefined) return this;

        this.instancedMesh.setColorAt(index, new THREE.Color(data.color));
        if (this.instancedMesh.instanceColor) {
            this.instancedMesh.instanceColor.needsUpdate = true;
        }
        return this;
    }

    // ======================== 整体变换 ========================

    /**
     * 更新整个 InstancedMesh 的大小（不同于逐实例 scale）
     */
    updateSize(vector3: THREE.Vector3): this {
        this.instancedMesh.scale.copy(vector3);
        return this;
    }

    /**
     * 更新整个 InstancedMesh 的位置
     */
    updatePosition(vector3: THREE.Vector3): this {
        this.instancedMesh.position.copy(vector3);
        return this;
    }

    /**
     * 更新整个 InstancedMesh 的旋转
     */
    updateRotation(euler: THREE.Euler): this {
        this.instancedMesh.rotation.copy(euler);
        return this;
    }

    // ======================== ManagedModel 统一接口 ========================

    setPosition(name: string, position: THREE.Vector3): this {
        return this.updateOnePosition({ id: name, position });
    }

    setRotation(name: string, rotation: THREE.Euler): this {
        return this.updateOneRotation({ id: name, rotation });
    }

    setScale(name: string, scale: THREE.Vector3): this {
        return this.updateOneScale({ id: name, scale });
    }

    setVisible(name: string, visible: boolean): this {
        return this.updateOneVisible({ id: name, visible });
    }

    setColor(name: string, color: THREE.Color): this {
        return this.updateOneColor({ id: name, color });
    }

    // ======================== 批量更新 ========================

    /**
     * 更新所有实例数据。
     *
     * - 新数量 ≤ maxCount：直接复用 GPU 缓冲区，仅调整 instancedMesh.count 并重写矩阵
     * - 新数量 > maxCount：扩容（按 2 的幂增长），重建 InstancedMesh
     *
     * keyMap 中的索引在非扩容场景下保持稳定，不漂移。
     */
    updateAll(dataMap: Map<string, ModelInstanceData>): this {
        const newCount = dataMap.size;

        // 超出预分配容量 → 扩容重建
        if (newCount > this.maxCount) {
            this.maxCount = this.nextPowerOfTwo(newCount);
            this.rebuildInstancedMesh();
        }

        this.num = newCount;
        this.instancedMesh.count = this.num;
        this.refreshKeyMap(dataMap);
        this.instanceTransforms.clear();
        this.initAllMatrices(dataMap);
        return this;
    }

    /**
     * 基于当前缓存刷新所有实例的矩阵
     */
    update(): this {
        this.dataMap.forEach((_value, key) => {
            this.composeMatrix(key);
        });
        this.instancedMesh.instanceMatrix.needsUpdate = true;
        return this;
    }

    // ======================== 场景管理 ========================

    /**
     * 添加到场景中
     */
    addScene(scene: THREE.Scene): this {
        scene.add(this.instancedMesh);
        return this;
    }

    /**
     * 从场景中移除
     */
    removeScene(scene: THREE.Scene): this {
        scene.remove(this.instancedMesh);
        return this;
    }

    // ======================== 生命周期 ========================

    /**
     * 释放所有 GPU 资源（几何体、材质）并清理映射
     */
    dispose(): void {
        if (this.instancedMesh) {
            // 从父级移除
            if (this.instancedMesh.parent) {
                this.instancedMesh.parent.remove(this.instancedMesh);
            }
            // 释放几何体
            this.instancedMesh.geometry?.dispose();
            // 释放材质
            const mat = this.instancedMesh.material;
            if (Array.isArray(mat)) {
                mat.forEach(m => m.dispose());
            } else {
                mat?.dispose();
            }
        }
        this.keyMap.clear();
        this.dataMap.clear();
        this.instanceTransforms.clear();
    }

    disposeAll(): void {
        this.dispose();
    }

    // ======================== 内部 ========================

    /**
     * 重建底层 InstancedMesh（扩容时调用），保留整体变换与场景关系
     */
    private rebuildInstancedMesh(): void {
        const oldMesh = this.instancedMesh;
        const material = Array.isArray(oldMesh.material) ? oldMesh.material[0] : oldMesh.material;

        this.instancedMesh = new THREE.InstancedMesh(this.geometry, material, this.maxCount);
        this.instancedMesh.position.copy(oldMesh.position);
        this.instancedMesh.rotation.copy(oldMesh.rotation);
        this.instancedMesh.scale.copy(oldMesh.scale);
        this.instancedMesh.count = this.num;

        // 有父级则替换引用
        if (oldMesh.parent) {
            oldMesh.parent.add(this.instancedMesh);
            oldMesh.parent.remove(oldMesh);
        }
        oldMesh.dispose();
    }

    /**
     * 计算大于等于 n 的最小 2 的幂
     */
    protected nextPowerOfTwo(n: number): number {
        let p = 1;
        while (p < n) p *= 2;
        return p;
    }
}
