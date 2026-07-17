import {THREE, anyDataToVector3, anyDataToEuler, xyz} from '@/utils/threeModules'
import {BatchedMeshFoundation, GeometryConfig} from './BatchedMeshFoundation'
import type {ManagedModel, ModelInstanceData} from './ManagedModel'

/**
 * 一个业务实例在某个子模型中的映射。
 * 多材质 GLB 的每个材质对应一个子 BatchedMesh，
 * 一个实例（如一辆车）可能跨多个子模型各占一个 instanceId。
 */
export interface SubInstanceRef {
    subIndex: number
    instanceIds: number[]
}

/**
 * 多材质 / 多几何体 GLB 模型的 BatchedMesh 分组基类。
 *
 * **适用场景：**
 * 一个 GLB 模型有多个材质（如车身、车窗、轮胎），
 * 需要大量实例化渲染（几十～几万）。
 *
 * **原理：**
 * 每个唯一材质创建一个 {@link BatchedMeshFoundation} 子模型，
 * 一个业务实例（如一辆车）跨多个子模型各拥有一个 instanceId，
 * 变换同步写入所有子模型。
 *
 * **用法：**
 * ```ts
 * class MyCarModel extends BatchedGroupModel {
 *   key = 'myCar'
 * }
 *
 * // 注册（与 SanHuoShipModel 一致的 init 签名）
 * manager.registerModel('myCar', (key, primitive, data) => {
 *   const model = new MyCarModel()
 *   model.init(key, data, primitive)
 *   return model
 * })
 * ```
 */
export class BatchedGroupModel implements ManagedModel {

    key = 'batchedGroup'
    type = ''
    dataMap: Map<string, any> = new Map()
    num = 0

    /** 每材质一个子 BatchedMeshFoundation（外部可通过此属性做射线检测等） */
    subs: BatchedMeshFoundation[] = []
    /** 业务 key → 跨子模型的 instanceId 映射 */
    instanceMap: Map<string, SubInstanceRef[]> = new Map()
    /**
     * 子模型索引 + 实例 ID → 业务 key 的反向查找表。
     * 格式：`"${subIndex}_${instanceId}"` → 业务 key。
     * 用于射线检测时快速定位命中的实例。
     */
    instanceIdToKey: Map<string, string> = new Map()
    /** 所有子 BatchedMesh 的容器 Group，方便 DevTools 观察 */
    group: THREE.Group = new THREE.Group()
    /** 变换缓存 */
    protected transforms: Map<string, { position: xyz; rotation: xyz; scale: xyz; visible: boolean }> = new Map()
    protected _dummy = new THREE.Object3D()
    protected autoScale = 1

    // ======================== 初始化 ========================

    /**
     * 从 GLB primitive 初始化 BatchedMesh 分组。
     * 签名与 SanHuoShipModel.init 一致，方便统一注册。
     *
     * @param key       模型标识
     * @param dataMap   实例数据
     * @param primitive GLTF 加载后的 scene
     */
    init(key: string, dataMap: Map<string, any>, primitive: THREE.Object3D): this {
        this.type = key
        this.key = key
        this.dataMap = dataMap
        this.num = dataMap.size
        this.autoScale = this.calcAutoScale(primitive)

        const groups = this.extractGroups(primitive)
        console.log(
            `BatchedGroupModel[${key}]: instances=${dataMap.size}, ` +
            `groups=${groups.length}, autoScale=${this.autoScale.toFixed(4)}`,
        )

        this.subs = []
        this.instanceMap.clear()
        this.instanceIdToKey.clear()
        this.transforms.clear()
        this.group.name = this.key

        for (let si = 0; si < groups.length; si++) {
            const g = groups[si]
            const geoCount = g.geometries.length

            this.normalizeAttributes(g.geometries)

            const sub = new BatchedMeshFoundation()
            sub.init(
                geoCount * dataMap.size,
                g.totalVerts * dataMap.size,
                g.totalIdx * dataMap.size,
                g.material,
                g.geometries,
                this.buildExpandedMap(dataMap, geoCount),
                `${key}_m${si}`,
            )
            this.subs.push(sub)
            this.buildRefMap(dataMap, si, sub, geoCount)
        }

        this.buildTransformCache(dataMap)
        return this
    }

    // ---- 子类可重写的钩子 ----

    /** 计算自动缩放比例 */
    protected calcAutoScale(scene: THREE.Object3D): number {
        const box = new THREE.Box3().setFromObject(scene)
        const size = new THREE.Vector3(); box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        return (maxDim > 10 || maxDim < 0.1) ? 4 / maxDim : 1
    }

    // ---- 内部流程（子类可重写以自定义） ----

    /** 按材质分组提取几何体 */
    protected extractGroups(scene: THREE.Object3D): GroupDef[] {
        const matToGroup = new Map<THREE.Material, GeometryConfig[]>()
        const matOrder: THREE.Material[] = []

        scene.updateWorldMatrix(true, true)
        scene.traverse((child) => {
            if (!(child instanceof THREE.Mesh) || !child.geometry) return
            const mesh = child as THREE.Mesh
            const mat = (Array.isArray(mesh.material) ? mesh.material : [mesh.material])[0]
            if (!mat) return

            if (!matToGroup.has(mat)) {
                matToGroup.set(mat, [])
                matOrder.push(mat)
            }

            const geo = mesh.geometry.clone()
            geo.applyMatrix4(mesh.matrixWorld)
            if (!geo.groups || geo.groups.length === 0) {
                const pos = geo.getAttribute('position')
                const idx = geo.index
                geo.clearGroups()
                geo.addGroup(0, idx ? idx.count : pos.count, 0)
            }
            for (const g of geo.groups) g.materialIndex = 0

            matToGroup.get(mat)!.push({geometry: geo})
        })

        return matOrder.map(m => {
            const geos = matToGroup.get(m)!
            return {
                material: this.normalizeMaterial(m),
                geometries: geos,
                totalVerts: geos.reduce((s, c) => s + c.geometry.getAttribute('position').count, 0),
                totalIdx: geos.reduce((s, c) => s + (c.geometry.index ? c.geometry.index.count : 0), 0),
            }
        })
    }

    /** 确保材质是 MeshStandardMaterial */
    protected normalizeMaterial(mat: THREE.Material): THREE.Material {
        if (mat instanceof THREE.MeshStandardMaterial) return mat
        if (mat instanceof THREE.MeshPhongMaterial || mat instanceof THREE.MeshBasicMaterial || mat instanceof THREE.MeshLambertMaterial) {
            const std = new THREE.MeshStandardMaterial({
                color: (mat as any).color?.clone() || 0x888888,
                map: (mat as any).map || null,
                roughness: mat instanceof THREE.MeshPhongMaterial ? 0.6 : 0.5,
                metalness: 0.1,
            })
            std.name = mat.name
            return std
        }
        const std = new THREE.MeshStandardMaterial({color: 0x888888, roughness: 0.6, metalness: 0.1})
        if ('color' in mat && (mat as any).color) std.color.copy((mat as any).color)
        if ('map' in mat && (mat as any).map) std.map = (mat as any).map
        std.name = mat.name
        return std
    }

    /** 展开 dataMap：每个业务 key × 子几何体数 */
    protected buildExpandedMap(dataMap: Map<string, any>, geoCount: number): Map<string, any> {
        const expanded = new Map<string, any>()
        dataMap.forEach((val, key) => {
            const us = val.scale ? anyDataToVector3(val.scale) : new THREE.Vector3(1, 1, 1)
            const s = us.clone().multiplyScalar(this.autoScale)
            for (let gi = 0; gi < geoCount; gi++) {
                expanded.set(`${key}__g${gi}`, {
                    geometryId: gi,
                    position: val.position || {x: 0, y: 0, z: 0},
                    rotation: val.rotation || {x: 0, y: 0, z: 0},
                    scale: {x: s.x, y: s.y, z: s.z},
                    visible: val.visible !== undefined ? !!val.visible : true,
                    color: val.color,
                })
            }
        })
        return expanded
    }

    /** 记录业务 key → 各子模型的 instanceId 映射，同时填充 instanceIdToKey 反向表 */
    protected buildRefMap(dataMap: Map<string, any>, si: number, sub: BatchedMeshFoundation, geoCount: number): void {
        dataMap.forEach((_, key) => {
            const entry = this.instanceMap.get(key) || []
            const ids: number[] = []
            for (let gi = 0; gi < geoCount; gi++) {
                const iid = sub.keyToInstanceId.get(`${key}__g${gi}`)
                if (iid !== undefined) ids.push(iid)
                // 填充反向查找表：subIndex_instanceId → 业务 key
                if (iid !== undefined) this.instanceIdToKey.set(`${si}_${iid}`, key)
            }
            entry.push({subIndex: si, instanceIds: ids})
            this.instanceMap.set(key, entry)
        })
    }

    /** 构建变换缓存 */
    protected buildTransformCache(dataMap: Map<string, any>): void {
        dataMap.forEach((val, key) => {
            const pos = val.position ? anyDataToVector3(val.position) : new THREE.Vector3()
            const rot = val.rotation ? anyDataToEuler(val.rotation) : new THREE.Euler()
            const us = val.scale ? anyDataToVector3(val.scale) : new THREE.Vector3(1, 1, 1)
            this.transforms.set(key, {
                position: new xyz(pos.x, pos.y, pos.z),
                rotation: new xyz(rot.x, rot.y, rot.z),
                scale: new xyz(us.x * this.autoScale, us.y * this.autoScale, us.z * this.autoScale),
                visible: val.visible !== undefined ? !!val.visible : true,
            })
        })
    }

    /** 对齐几何体顶点属性（BatchedMesh 要求一致） */
    protected normalizeAttributes(geos: GeometryConfig[]): void {
        if (geos.length < 2) return
        const ref = geos[0].geometry
        const refAttrs = new Set(Object.keys(ref.attributes))
        for (let i = 1; i < geos.length; i++) {
            const geo = geos[i].geometry
            for (const name of refAttrs) {
                if (!geo.getAttribute(name)) {
                    const refAttr = ref.getAttribute(name)
                    const count = geo.getAttribute('position').count
                    const arr = new Float32Array(count * refAttr.itemSize)
                    geo.setAttribute(name, new THREE.BufferAttribute(arr, refAttr.itemSize))
                }
            }
        }
    }

    // ======================== 变换 ========================

    /** 将变换写入所有子模型的 GPU 缓冲区 */
    protected syncTransform(key: string): void {
        const t = this.transforms.get(key)
        if (!t) return
        const refs = this.instanceMap.get(key)
        if (!refs || refs.length === 0) return

        this._dummy.position.copy(anyDataToVector3(t.position))
        this._dummy.rotation.copy(anyDataToEuler(t.rotation))
        this._dummy.scale.copy(anyDataToVector3(t.scale))
        this._dummy.updateMatrix()

        for (const ref of refs) {
            const sub = this.subs[ref.subIndex]
            for (const iid of ref.instanceIds) {
                sub.batchedMesh.setMatrixAt(iid, this._dummy.matrix)
                sub.batchedMesh.setVisibleAt(iid, t.visible)
            }
        }
    }

    // ======================== ManagedModel ========================

    addScene(scene: THREE.Scene): this {
        // 先将所有子 BatchedMesh 加到 group（DevTools 中可折叠观察）
        for (const s of this.subs) {
            if (s.batchedMesh.parent !== this.group) {
                this.group.add(s.batchedMesh)
            }
        }
        if (this.group.parent !== scene) {
            scene.add(this.group)
        }
        return this
    }

    removeScene(scene: THREE.Scene): this {
        if (this.group.parent === scene) {
            scene.remove(this.group)
        }
        return this
    }

    setPosition(n: string, p: THREE.Vector3): this {
        const t = this.transforms.get(n)
        if (t) { t.position.copy(p as any); this.syncTransform(n) }
        return this
    }

    setRotation(n: string, r: THREE.Euler): this {
        const t = this.transforms.get(n)
        if (t) { t.rotation.copy(r as any); this.syncTransform(n) }
        return this
    }

    setScale(n: string, s: THREE.Vector3): this {
        const t = this.transforms.get(n)
        if (t) { t.scale.copy(s as any); this.syncTransform(n) }
        return this
    }

    setVisible(n: string, v: boolean): this {
        const t = this.transforms.get(n)
        if (t) { t.visible = v; this.syncTransform(n) }
        return this
    }

    setColor(n: string, c: THREE.Color): this;
    setColor(n: string, material: string, c: THREE.Color): this;
    setColor(n: string, moc: string | THREE.Color, c?: THREE.Color): this {
        const refs = this.instanceMap.get(n)
        if (!refs) return this
        if (c !== undefined) {
            // 三参数：(name, material, color) — 只设置匹配材质名称的子模型
            const matName = moc as string
            for (const ref of refs) {
                const sub = this.subs[ref.subIndex]
                if (matName === this.getSubMaterialName(sub)) {
                    for (const iid of ref.instanceIds) sub.batchedMesh.setColorAt(iid, c)
                    return this
                }
            }
        } else {
            // 两参数：(name, color) — 设置所有子模型
            const color = moc as THREE.Color
            for (const ref of refs) {
                const sub = this.subs[ref.subIndex]
                for (const iid of ref.instanceIds) sub.batchedMesh.setColorAt(iid, color)
            }
        }
        return this
    }

    /** 获取子模型的材质名称（用于 setColor(name, material, color) 的 material 匹配） */
    private getSubMaterialName(sub: BatchedMeshFoundation): string {
        const mat = sub.batchedMesh.material
        if (Array.isArray(mat)) {
            return mat[0]?.name || ''
        }
        return mat?.name || ''
    }

    getInstanceCount(): number { return this.num }
    updateAll(_dataMap: Map<string, ModelInstanceData>): this { return this }
    update(): this { return this }

    disposeAll(): void { this.dispose() }

    dispose(): void {
        for (const s of this.subs) s.dispose()
        this.subs = []
        this.instanceMap.clear()
        this.instanceIdToKey.clear()
        this.transforms.clear()
        this.dataMap.clear()
        if (this.group.parent) this.group.parent.remove(this.group)
    }
}

// ======================== 内部类型 ========================

export interface GroupDef {
    material: THREE.Material
    geometries: GeometryConfig[]
    totalVerts: number
    totalIdx: number
}
