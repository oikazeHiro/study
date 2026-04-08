import { THREE } from "@/utils/threeModules";
import ModsMethodStandardImpl from "../base/ModsMethodStandardImpl";

export default class AnQiaoModql extends ModsMethodStandardImpl {

    key: string = 'anQiao';

    constructor(){
        super();
    }

    init(key: string = this.key, dataMap: Map<string, any>, primitiveModel: THREE.Object3D): this {
        super.init(key, dataMap, primitiveModel);
        return this;
    }

}