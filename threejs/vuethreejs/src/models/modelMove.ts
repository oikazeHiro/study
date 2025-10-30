import {BaseModel} from "@/models/BaseModel";
import {THREE} from "@/utils/threeModules";

class ModelMove extends BaseModel{
    position: THREE.Vector3;
    time: number;

    constructor(data?: Partial<ModelMove>) {
        super();
        if (data) {
            Object.assign(this, data);
        }
    }
}
export default ModelMove;