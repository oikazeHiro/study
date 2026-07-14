import { THREE, anyDataToVector3, anyDataToEuler, xyz } from '@/utils/threeModules'
import { BatchedMeshFoundation, GeometryConfig } from '@/models/base/BatchedMeshFoundation'
import type { ManagedModel, ModelInstanceData } from '@/models/base/ManagedModel'

/** 一辆车在一个子模型中的所有 instanceId */
interface CarSubInstances {
    subIndex: number
    instances: number[]
}

/**
 * 多零件/多材质 GLB 模型的 BatchedMesh 适配器。
 *
 * 策略：每个唯一材质创建一个 BatchedMeshFoundation 子模型，
 * 每个子模型使用单一原始材质（纹理完好）。
 * BatchedMesh 0.184 不支持材质数组但单一材质+纹理工作正常。
 */
export default class BatchedCarModel implements ManagedModel {

    key = 'batchedCar'
    type = ''
    dataMap: Map<string, any> = new Map()
    num = 0

    private subs: BatchedMeshFoundation[] = []
    /** carKey → CarSubInstances[]（每个子模型一个 entry） */
    private carMap: Map<string, CarSubInstances[]> = new Map()
    private transforms: Map<string, { position: xyz; rotation: xyz; scale: xyz; visible: boolean }> = new Map()
    private _dummy = new THREE.Object3D()

    // ======================== 初始化 ========================

    initFromScene(
        scene: THREE.Object3D,
        dataMap: Map<string, any>,
        type: string,
        totalInstances: number,
        targetSize = 0,
    ): this {
        this.type = type
        this.dataMap = dataMap
        this.num = dataMap.size

        const box = new THREE.Box3().setFromObject(scene)
        const size = new THREE.Vector3(); box.getSize(size)
        const maxDim = Math.max(size.x, size.y, size.z)
        const effTarget = targetSize > 0 ? targetSize : 4
        const autoScale = (maxDim > 10 || maxDim < 0.1) ? effTarget / maxDim : 1

        const rawGroups = extractByMaterial(scene)
        // 将非标准材质转为 MeshStandardMaterial，保证 BatchedMesh 兼容
        const groups = rawGroups.map(g => ({
            material: ensureStandardMaterial(g.material),
            geometries: g.geometries,
        }))
        console.log(
            `BatchedCarModel[${type}]: ${size.x.toFixed(1)}×${size.y.toFixed(1)}×${size.z.toFixed(1)}, ` +
            `autoScale=${autoScale.toFixed(4)}, materialGroups=${groups.length}`,
        )

        this.subs = []
        this.carMap.clear()
        this.transforms.clear()

        // 为每个材质组创建子 BatchedMesh
        for (let si = 0; si < groups.length; si++) {
            const g = groups[si]
            const geoCount = g.geometries.length
            const totalVerts = g.geometries.reduce((s, c) => s + c.geometry.getAttribute('position').count, 0)
            const totalIdx = g.geometries.reduce((s, c) => s + (c.geometry.index ? c.geometry.index.count : 0), 0)
            const maxInst = geoCount * totalInstances
            const maxVert = totalVerts * totalInstances
            const maxIdx = totalIdx * totalInstances

            const expanded = new Map<string, any>()
            dataMap.forEach((val, carKey) => {
                const us = val.scale ? anyDataToVector3(val.scale) : new THREE.Vector3(1, 1, 1)
                const s = us.clone().multiplyScalar(autoScale)
                for (let gi = 0; gi < geoCount; gi++) {
                    expanded.set(`${carKey}__g${gi}`, {
                        geometryId: gi,
                        position: val.position || { x: 0, y: 0, z: 0 },
                        rotation: val.rotation || { x: 0, y: 0, z: 0 },
                        scale: { x: s.x, y: s.y, z: s.z },
                        visible: val.visible !== undefined ? !!val.visible : true,
                        color: val.color,
                    })
                }
            })

            // 对齐所有几何体的顶点属性（BatchedMesh 要求属性一致）
            normalizeAttributes(g.geometries)

            const sub = new BatchedMeshFoundation()
            sub.init(maxInst, maxVert, maxIdx, g.material, g.geometries, expanded, `${type}_m${si}`)
            this.subs.push(sub)

            // 记录 car → (subIndex, instanceIds) 映射
            dataMap.forEach((_, carKey) => {
                const entry = this.carMap.get(carKey) || []
                const ids: number[] = []
                for (let gi = 0; gi < geoCount; gi++) {
                    const iid = sub.keyToInstanceId.get(`${carKey}__g${gi}`)
                    if (iid !== undefined) ids.push(iid)
                }
                entry.push({ subIndex: si, instances: ids })
                this.carMap.set(carKey, entry)
            })
        }

        // 变换缓存
        dataMap.forEach((val, carKey) => {
            const pos = val.position ? anyDataToVector3(val.position) : new THREE.Vector3()
            const rot = val.rotation ? anyDataToEuler(val.rotation) : new THREE.Euler()
            const us = val.scale ? anyDataToVector3(val.scale) : new THREE.Vector3(1, 1, 1)
            this.transforms.set(carKey, {
                position: new xyz(pos.x, pos.y, pos.z),
                rotation: new xyz(rot.x, rot.y, rot.z),
                scale: new xyz(us.x * autoScale, us.y * autoScale, us.z * autoScale),
                visible: val.visible !== undefined ? !!val.visible : true,
            })
        })

        return this
    }

    // ======================== 变换同步 ========================

    private syncTransform(carKey: string): void {
        const t = this.transforms.get(carKey); if (!t) return
        const entries = this.carMap.get(carKey); if (!entries || entries.length === 0) return
        this._dummy.position.copy(anyDataToVector3(t.position))
        this._dummy.rotation.copy(anyDataToEuler(t.rotation))
        this._dummy.scale.copy(anyDataToVector3(t.scale))
        this._dummy.updateMatrix()
        for (const e of entries) {
            const sub = this.subs[e.subIndex]
            for (const iid of e.instances) {
                sub.batchedMesh.setMatrixAt(iid, this._dummy.matrix)
                sub.batchedMesh.setVisibleAt(iid, t.visible)
            }
        }
    }

    // ======================== ManagedModel ========================

    addScene(scene: THREE.Scene): this { for (const s of this.subs) s.addScene(scene); return this }
    removeScene(scene: THREE.Scene): this { for (const s of this.subs) s.removeScene(scene); return this }

    setPosition(n: string, p: THREE.Vector3): this {
        const t = this.transforms.get(n); if (t) { t.position.copy(p as any); this.syncTransform(n) }; return this
    }
    setRotation(n: string, r: THREE.Euler): this {
        const t = this.transforms.get(n); if (t) { t.rotation.copy(r as any); this.syncTransform(n) }; return this
    }
    setScale(n: string, s: THREE.Vector3): this {
        const t = this.transforms.get(n); if (t) { t.scale.copy(s as any); this.syncTransform(n) }; return this
    }
    setVisible(n: string, v: boolean): this {
        const t = this.transforms.get(n); if (t) { t.visible = v; this.syncTransform(n) }; return this
    }
    setColor(n: string, c: THREE.Color): this {
        const entries = this.carMap.get(n); if (!entries) return this
        for (const e of entries) {
            const sub = this.subs[e.subIndex]
            for (const iid of e.instances) sub.batchedMesh.setColorAt(iid, c)
        }
        return this
    }

    getInstanceCount(): number { return this.num }
    updateAll(_dataMap: Map<string, ModelInstanceData>): this { return this }
    update(): this { return this }

    disposeAll(): void { this.dispose() }
    dispose(): void {
        for (const s of this.subs) s.dispose()
        this.subs = []; this.carMap.clear(); this.transforms.clear(); this.dataMap.clear()
    }
}

// ======================== 内部 ========================

interface MaterialGroup {
    material: THREE.Material
    geometries: GeometryConfig[]
}

function extractByMaterial(scene: THREE.Object3D): MaterialGroup[] {
    const matToGroup = new Map<THREE.Material, GeometryConfig[]>()
    const matOrder: THREE.Material[] = []

    scene.updateWorldMatrix(true, true)
    scene.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return
        if (!child.geometry) return
        const mesh = child as THREE.Mesh
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        if (mats.length === 0) return

        const mat = mats[0] // 按第一个材质归类
        if (!matToGroup.has(mat)) { matToGroup.set(mat, []); matOrder.push(mat) }

        const geo = mesh.geometry.clone()
        geo.applyMatrix4(mesh.matrixWorld)
        if (!geo.groups || geo.groups.length === 0) {
            const pos = geo.getAttribute('position')
            const idx = geo.index
            geo.clearGroups()
            geo.addGroup(0, idx ? idx.count : pos.count, 0)
        }
        for (const g of geo.groups) g.materialIndex = 0

        matToGroup.get(mat)!.push({ geometry: geo })
    })

    return matOrder.map(m => ({ material: m, geometries: matToGroup.get(m)! }))
}

/** 将材质转为 MeshStandardMaterial，保留 color + map，确保 BatchedMesh 兼容 */
function ensureStandardMaterial(mat: THREE.Material): THREE.Material {
    if (mat instanceof THREE.MeshStandardMaterial) return mat // 已经是标准材质，直接返回
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
    // 其他未知材质类型：创建带相同 color/map 的标准材质
    const std = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.6, metalness: 0.1 })
    if ('color' in mat && (mat as any).color) std.color.copy((mat as any).color)
    if ('map' in mat && (mat as any).map) std.map = (mat as any).map
    std.name = mat.name
    return std
}

/**
 * 对齐一组几何体的顶点属性，确保所有几何体具有相同的属性集合。
 * BatchedMesh 要求所有 addGeometry 的几何体属性一致，否则会报错。
 *
 * 以第一个几何体为准，缺失的属性用 0 填充补齐。
 */
function normalizeAttributes(geos: GeometryConfig[]): void {
    if (geos.length < 2) return
    const ref = geos[0].geometry
    const refAttrs = new Set<string>()
    for (const attr of Object.keys(ref.attributes)) refAttrs.add(attr)

    for (let i = 1; i < geos.length; i++) {
        const geo = geos[i].geometry
        for (const name of refAttrs) {
            if (!geo.getAttribute(name)) {
                const refAttr = ref.getAttribute(name)
                const count = geo.getAttribute('position').count
                const size = refAttr.itemSize
                const arr = new Float32Array(count * size)
                geo.setAttribute(name, new THREE.BufferAttribute(arr, size))
            }
        }
    }
}