import { THREE } from "@/utils/threeModules";
import ModsMethodStandardImpl from "../base/ModsMethodStandardImpl";
import {AtlasInstancedMeshFoundation} from "@/models/base/AtlasInstancedMeshFoundation";

export default class ContainerModel extends AtlasInstancedMeshFoundation {

    key: string = 'container';

    constructor(){
        super();
    }

}
