import {BatchedGroupModel} from '@/models/base/BatchedGroupModel'

import {THREE,Scene} from '@/utils/threeModules'
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

    constructor() {
        super();
    }

    addScene(scene: Scene): this {
        super.addScene(scene)
        this.updateCarsColor()
        return this;
    }

    updateCarsColor(){
        const colors:string[] = [
            '#ffffff',
            '#ef0707',
            '#1f1f1f',
            "#400394",
            '#1705be',
        ]
        this.dataMap.forEach((val,key)=>{
            this.setColor(key,'Body',new THREE.Color(colors[val.colorCode]))
        })
    }
}
