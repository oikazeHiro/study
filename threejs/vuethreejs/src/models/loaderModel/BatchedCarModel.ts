import {BatchedGroupModel} from '@/models/base/BatchedGroupModel'

/**
 * 汽车模型的 BatchedMesh 适配器。
 *
 * 继承 {@link BatchedGroupModel}，直接使用其通用多材质 BatchedMesh 能力。
 *
 * ```ts
 * manager.registerModel('chevrolet', (key, primitive, data) => {
 *   const model = new BatchedCarModel()
 *   model.init(key, data, primitive)
 *   return model
 * })
 * ```
 */
export default class BatchedCarModel extends BatchedGroupModel {
    key = 'batchedCar'
}