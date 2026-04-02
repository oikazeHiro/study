import { THREE } from "@/utils/threeModules";
import ModsMethodStandardImpl from "../base/ModsMethodStandardImpl";

export default class SanHuoShipModel extends ModsMethodStandardImpl {

    key: string = 'sanHuoShip';

    constructor(){
        super();
    }

    init(key: string = this.key, dataMap: Map<string, any>, primitiveModel: THREE.Object3D): this {
        super.init(key, dataMap, primitiveModel);
        return this;
    }
  
}