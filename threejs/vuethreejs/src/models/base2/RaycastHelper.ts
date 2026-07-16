import {THREE} from '@/utils/threeModules'
import {ManagedModel} from './ManagedModel'
import {InstancedMeshFoundation} from '../base/InstancedMeshFoundation'
import {AtlasInstancedMeshFoundation} from '../base/AtlasInstancedMeshFoundation'
import {BatchedMeshFoundation} from '../base/BatchedMeshFoundation'
import {BatchedGroupModel} from '../base/BatchedGroupModel'
import ModsMethodStandardImpl from '../base/ModsMethodStandardImpl'

/**
 * 射线相交结果，携带实例标识和原始数据。
 */
export interface InstanceHit {
    /** 实例 key（对应 dataMap 中的 key） */
    key: string;
    /** 对应 dataMap 中存储的原始数据（若无则为 null） */
    data: any;
}

/**
 * 对 modelMap 中的所有模型执行射线检测，返回命中的实例信息。
 *
 * @param models   modelMap 中所有条目（manager.modelMap）
 * @param raycaster 已通过 setFromCamera 配置好的 Raycaster
 * @returns 按 distance 排序的命中结果（最近的在最前）
 */
export function raycastModels(
    models: Map<string, ManagedModel>,
    raycaster: THREE.Raycaster,
): InstanceHit[] {
    const results: InstanceHit[] = []

    models.forEach((model) => {
        const hit = raycastOne(model, raycaster)
        if (hit) results.push(hit)
    })

    return results.sort((a, b) => (a as any).distance - (b as any).distance)
}

/**
 * 对单个 ManagedModel 执行射线检测。
 *
 * 内部通过 instanceof 区分底层实现：
 *   - InstancedMeshFoundation / AtlasInstancedMeshFoundation → 检测 instancedMesh
 *   - BatchedMeshFoundation                                    → 检测 batchedMesh
 *   - ModsMethodStandardImpl                                   → 检测 group 下的 children
 *
 * @returns 命中结果 + distance（用于排序），未命中返回 null
 */
export function raycastOne(
    model: ManagedModel,
    raycaster: THREE.Raycaster,
): (InstanceHit & { distance: number }) | null {

    // ---------- InstancedMeshFoundation ----------
    if (model instanceof InstancedMeshFoundation) {
        const mesh = (model as InstancedMeshFoundation).instancedMesh
        if (!mesh) return null
        const hits = raycaster.intersectObject(mesh)
        if (hits.length === 0) return null

        const hit = hits[0]
        if (hit.instanceId === undefined) return null

        const key = findKeyByIndex(model.keyMap, hit.instanceId)
        if (!key) return null

        return {
            key,
            data: model.dataMap.get(key) ?? null,
            distance: hit.distance,
        }
    }

    // ---------- BatchedMeshFoundation ----------
    if (model instanceof BatchedMeshFoundation) {
        const mesh = (model as BatchedMeshFoundation).batchedMesh
        if (!mesh) return null
        const hits = raycaster.intersectObject(mesh)
        if (hits.length === 0) return null

        const hit = hits[0]
        // BatchedMesh.raycast 用 batchId 标识实例（不是 instanceId）
        if (hit.batchId === undefined) return null

        const key = (model as BatchedMeshFoundation).instanceIdToKey.get(hit.batchId)
        if (!key) return null

        return {
            key,
            data: model.dataMap.get(key) ?? null,
            distance: hit.distance,
        }
    }

    // ---------- BatchedGroupModel（多材质分组） ----------
    const isBatchedGroup = model instanceof BatchedGroupModel ||
        // duck-typing 回退（避免模块加载边界 case 下 instanceof 失效）
        ((model as any).instanceIdToKey instanceof Map && (model as any).subs instanceof Array)
    if (isBatchedGroup) {
        const group = model as unknown as BatchedGroupModel
        for (let si = 0; si < group.subs.length; si++) {
            const sub = group.subs[si]
            const mesh = sub.batchedMesh
            if (!mesh) continue
            const hits = raycaster.intersectObject(mesh)
            if (hits.length === 0) continue

            const hit = hits[0]
            // BatchedMesh.raycast 用 batchId 标识实例
            if (hit.batchId === undefined) continue

            const key = group.instanceIdToKey.get(`${si}_${hit.batchId}`)
            if (!key) continue

            return {
                key,
                data: group.dataMap.get(key) ?? null,
                distance: hit.distance,
            }
        }
        return null
    }

    // ---------- ModsMethodStandardImpl ----------
    if (model instanceof ModsMethodStandardImpl) {
        const impl = model as ModsMethodStandardImpl
        const hits = raycaster.intersectObjects(impl.group.children, true)
        if (hits.length === 0) return null

        const hit = hits[0]
        // 每个 clone 实例的 name 格式: "${key}_${instanceKey}"
        const objName = hit.object.name
        const prefix = impl.key + '_'
        if (!objName || !objName.startsWith(prefix)) return null

        const instanceKey = objName.slice(prefix.length)
        return {
            key: instanceKey,
            data: impl.dataMap.get(instanceKey) ?? null,
            distance: hit.distance,
        }
    }

    return null
}

/**
 * 根据 value 反向查找 Map 中的 key（InstancedMeshFoundation.keyMap 用）。
 */
function findKeyByIndex(map: Map<string, number>, target: number): string | undefined {
    for (const [key, idx] of map) {
        if (idx === target) return key
    }
    return undefined
}
