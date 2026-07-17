import {THREE, anyDataToVector3, anyDataToEuler, xyz} from '@/utils/threeModules'
import { ManagedModel, ModelInstanceData } from "@/models/base/ManagedModel";

export interface GeometryConfig {
    geometry: THREE.BufferGeometry
    /** 该几何体预计承载的实例数 */
    reservedCount?: number
}

interface InstanceTransform {
    id: string
    position: xyz
    rotation: xyz
    scale: xyz
    visible: boolean
}

/**
 * 基于 Three.js BatchedMesh 的大量实例渲染基类。
 *
 * 设计约束（经过验证）：
 *   - BatchedMesh 构造函数只接受单个 Material，不接受数组
 *   - 每个 dataMap entry 对应一个 BatchedMesh instance（调用 addInstance 一次）
 *   - 多几何体模型需在子类扩展 dataMap（每个子几何体一个 entry）
 */
export class BatchedMeshFoundation implements ManagedModel {

    dataMap: Map<string, any> = new Map()
    batchedMesh!: THREE.BatchedMesh
    num = 0
    maxInstanceCount = 0
    maxVertexCount = 0
    maxIndexCount = 0
    geometryMap: Map<number, GeometryConfig> = new Map()
    keyToInstanceId: Map<string, number> = new Map()
    instanceIdToKey: Map<number, string> = new Map()
    protected instanceGeometryMap: Map<number, number> = new Map()
    protected instanceTransforms: Map<string, InstanceTransform> = new Map()
    protected _dummy = new THREE.Object3D()
    type = ''

    /** 初始化。material 支持单个或数组（BatchedMesh 继承自 Mesh，运行时支持数组） */
    init(
        maxInstanceCount: number,
        maxVertexCount: number,
        maxIndexCount: number,
        material: THREE.Material | THREE.Material[],
        geometries: GeometryConfig[],
        dataMap: Map<string, any>,
        type: string,
    ): this {
        if (geometries.length === 0) throw new Error('BatchedMeshFoundation.init: geometries 不能为空')

        this.type = type
        this.maxInstanceCount = maxInstanceCount
        this.maxVertexCount = maxVertexCount
        this.maxIndexCount = maxIndexCount
        this.dataMap = dataMap
        this.num = 0

        this.batchedMesh = new THREE.BatchedMesh(
            maxInstanceCount, maxVertexCount, maxIndexCount,
            material as unknown as THREE.Material, // @types/three 声明只接受 Material，但运行时支持数组
        )
        this.batchedMesh.name = type

        this.geometryMap.clear()
        for (const cfg of geometries) {
            const vc = cfg.geometry.getAttribute('position').count
            const ic = cfg.geometry.index ? cfg.geometry.index.count : 0
            const slots = cfg.reservedCount ?? Math.ceil(maxInstanceCount / geometries.length)
            const gid = this.batchedMesh.addGeometry(cfg.geometry, vc * slots, ic * slots)
            this.geometryMap.set(gid, cfg)
        }

        this.keyToInstanceId.clear()
        this.instanceIdToKey.clear()
        this.instanceGeometryMap.clear()
        this.instanceTransforms.clear()
        this.initAllInstances(dataMap)

        this.batchedMesh.computeBoundingBox()
        this.batchedMesh.computeBoundingSphere()
        this.batchedMesh.frustumCulled = false

        return this
    }

    // ======================== 实例创建 ========================

    protected initAllInstances(dataMap: Map<string, any>): void {
        dataMap.forEach((value, key) => {
            const gid = value.geometryId !== undefined ? Number(value.geometryId) : this.geometryMap.keys().next().value
            if (gid === undefined || !this.geometryMap.has(gid)) return

            const iid = this.batchedMesh.addInstance(gid)
            if (iid === -1) { console.warn(`BatchedMeshFoundation: 容量满, key=${key}`); return }

            this.keyToInstanceId.set(key, iid)
            this.instanceIdToKey.set(iid, key)
            this.instanceGeometryMap.set(iid, gid)

            const pos = value.position ? anyDataToVector3(value.position) : new THREE.Vector3()
            const rot = value.rotation ? anyDataToEuler(value.rotation) : new THREE.Euler()
            const scl = value.scale ? anyDataToVector3(value.scale) : new THREE.Vector3(1, 1, 1)
            const vis = value.visible !== undefined ? !!value.visible : true

            this.instanceTransforms.set(key, { id: key, position: new xyz(pos.x, pos.y, pos.z), rotation: new xyz(rot.x, rot.y, rot.z), scale: new xyz(scl.x, scl.y, scl.z), visible: vis })

            this._dummy.position.copy(pos)
            this._dummy.rotation.copy(rot)
            this._dummy.scale.copy(scl)
            this._dummy.updateMatrix()
            this.batchedMesh.setMatrixAt(iid, this._dummy.matrix)
            this.batchedMesh.setVisibleAt(iid, vis)
            if (value.color !== undefined) this.batchedMesh.setColorAt(iid, new THREE.Color(value.color))
            this.num++
        })
    }

    protected registerInstance(key: string, iid: number, gid: number): void {
        this.keyToInstanceId.set(key, iid); this.instanceIdToKey.set(iid, key); this.instanceGeometryMap.set(iid, gid)
    }
    protected unregisterInstance(iid: number): void {
        const k = this.instanceIdToKey.get(iid); if (k) this.keyToInstanceId.delete(k)
        this.instanceIdToKey.delete(iid); this.instanceGeometryMap.delete(iid)
    }

    // ======================== 变换 ========================

    protected composeMatrix(key: string): void {
        const iid = this.keyToInstanceId.get(key)
        const t = this.instanceTransforms.get(key)
        if (iid === undefined || !t) return
        this._dummy.position.copy(anyDataToVector3(t.position))
        this._dummy.rotation.copy(anyDataToEuler(t.rotation))
        this._dummy.scale.copy(anyDataToVector3(t.scale))
        this._dummy.updateMatrix()
        this.batchedMesh.setMatrixAt(iid, this._dummy.matrix)
        this.batchedMesh.setVisibleAt(iid, t.visible)
    }

    private getOrCreateTransform(key: string): InstanceTransform {
        let t = this.instanceTransforms.get(key)
        if (!t) { t = { id: key, position: new xyz(), rotation: new xyz(), scale: new xyz(1, 1, 1), visible: true }; this.instanceTransforms.set(key, t) }
        return t
    }

    // ======================== 单实例更新 ========================

    updateOnePosition(data: any): this {
        if (!data?.id || !data?.position || !this.keyToInstanceId.has(data.id)) return this
        this.getOrCreateTransform(data.id).position.copy(anyDataToVector3(data.position)); this.composeMatrix(data.id); return this
    }
    updateOneRotation(data: any): this {
        if (!data?.id || !data?.rotation || !this.keyToInstanceId.has(data.id)) return this
        this.getOrCreateTransform(data.id).rotation.copy(anyDataToEuler(data.rotation)); this.composeMatrix(data.id); return this
    }
    updateOneScale(data: any): this {
        if (!data?.id || !data?.scale || !this.keyToInstanceId.has(data.id)) return this
        this.getOrCreateTransform(data.id).scale.copy(anyDataToVector3(data.scale)); this.composeMatrix(data.id); return this
    }
    updateOneVisible(data: any): this {
        if (!data?.id || data.visible === undefined) return this
        const iid = this.keyToInstanceId.get(data.id); if (iid === undefined) return this
        this.getOrCreateTransform(data.id).visible = !!data.visible; this.composeMatrix(data.id); return this
    }
    updateOneColor(data: any): this {
        if (!data?.id || data.color === undefined) return this
        const iid = this.keyToInstanceId.get(data.id); if (iid === undefined) return this
        this.batchedMesh.setColorAt(iid, new THREE.Color(data.color)); return this
    }

    // ======================== 整体变换 ========================

    updateSize(v: THREE.Vector3): this { this.batchedMesh.scale.copy(v); return this }
    updatePosition(v: THREE.Vector3): this { this.batchedMesh.position.copy(v); return this }
    updateRotation(e: THREE.Euler): this { this.batchedMesh.rotation.copy(e); return this }

    // ======================== ManagedModel 接口 ========================

    setPosition(n: string, p: THREE.Vector3): this { return this.updateOnePosition({ id: n, position: p }) }
    setRotation(n: string, r: THREE.Euler): this { return this.updateOneRotation({ id: n, rotation: r }) }
    setScale(n: string, s: THREE.Vector3): this { return this.updateOneScale({ id: n, scale: s }) }
    setVisible(n: string, v: boolean): this { return this.updateOneVisible({ id: n, visible: v }) }
    setColor(n: string, c: THREE.Color): this;
    setColor(n: string, _material: string, c: THREE.Color): this;
    setColor(n: string, _moc: string | THREE.Color, c?: THREE.Color): this {
        return this.updateOneColor({ id: n, color: c ?? (_moc as THREE.Color) })
    }

    // ======================== 增删 ========================

    addOne(key: string, data: any): this {
        if (this.keyToInstanceId.has(key)) { console.warn(`addOne: key "${key}" 已存在`); return this }
        const gid = data.geometryId !== undefined ? Number(data.geometryId) : this.geometryMap.keys().next().value
        if (gid === undefined || !this.geometryMap.has(gid)) return this
        const iid = this.batchedMesh.addInstance(gid)
        if (iid === -1) { console.warn(`addOne: 容量满, key=${key}`); return this }
        this.registerInstance(key, iid, gid); this.dataMap.set(key, data); this.num++

        const pos = data.position ? anyDataToVector3(data.position) : new THREE.Vector3()
        const rot = data.rotation ? anyDataToEuler(data.rotation) : new THREE.Euler()
        const scl = data.scale ? anyDataToVector3(data.scale) : new THREE.Vector3(1, 1, 1)
        const vis = data.visible !== undefined ? !!data.visible : true
        this.instanceTransforms.set(key, { id: key, position: new xyz(pos.x, pos.y, pos.z), rotation: new xyz(rot.x, rot.y, rot.z), scale: new xyz(scl.x, scl.y, scl.z), visible: vis })
        this._dummy.position.copy(pos); this._dummy.rotation.copy(rot); this._dummy.scale.copy(scl); this._dummy.updateMatrix()
        this.batchedMesh.setMatrixAt(iid, this._dummy.matrix); this.batchedMesh.setVisibleAt(iid, vis)
        if (data.color !== undefined) this.batchedMesh.setColorAt(iid, new THREE.Color(data.color))
        return this
    }

    removeOne(key: string): this {
        const iid = this.keyToInstanceId.get(key); if (iid === undefined) return this
        this.batchedMesh.deleteInstance(iid); this.unregisterInstance(iid)
        this.dataMap.delete(key); this.instanceTransforms.delete(key)
        this.num = Math.max(0, this.num - 1); return this
    }

    // ======================== 批量 ========================

    updateAll(dataMap: Map<string, ModelInstanceData>): this {
        const nk = new Set(dataMap.keys()), ok = new Set(this.dataMap.keys())
        for (const k of ok) { if (!nk.has(k)) this.removeOne(k) }
        for (const k of nk) { if (!ok.has(k)) this.addOne(k, dataMap.get(k)) }
        for (const k of nk) {
            if (ok.has(k)) {
                const ex = this.dataMap.get(k) || {}, inc = dataMap.get(k) || {}
                this.dataMap.set(k, { ...ex, ...inc }); this.updateExistingInstance(k, inc)
            }
        }
        return this
    }

    protected updateExistingInstance(key: string, value: any): void {
        const iid = this.keyToInstanceId.get(key); if (iid === undefined) return
        const t = this.getOrCreateTransform(key)
        if (value.position) t.position.copy(anyDataToVector3(value.position))
        if (value.rotation) t.rotation.copy(anyDataToEuler(value.rotation))
        if (value.scale) t.scale.copy(anyDataToVector3(value.scale))
        if (value.visible !== undefined) t.visible = !!value.visible
        this.composeMatrix(key)
        if (value.color !== undefined) this.batchedMesh.setColorAt(iid, new THREE.Color(value.color))
    }

    update(): this { this.dataMap.forEach((_, k) => this.composeMatrix(k)); return this }

    // ======================== 场景 & 生命周期 ========================

    addScene(scene: THREE.Scene): this { scene.add(this.batchedMesh); return this }
    removeScene(scene: THREE.Scene): this { scene.remove(this.batchedMesh); return this }
    disposeAll(): void { this.dispose() }

    dispose(): void {
        if (this.batchedMesh) {
            if (this.batchedMesh.parent) this.batchedMesh.parent.remove(this.batchedMesh)
            this.batchedMesh.dispose()
        }
        this.geometryMap.clear(); this.keyToInstanceId.clear(); this.instanceIdToKey.clear()
        this.instanceGeometryMap.clear(); this.dataMap.clear(); this.instanceTransforms.clear()
    }

    getInstanceCount(): number { return this.num }
}