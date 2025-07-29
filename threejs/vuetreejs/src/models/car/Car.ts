import {Vector3,THREE,Color} from '@/utils/three-modules'

export class Car {
    id: string;
    tireNames: Array<string>;
    shellNames: Array<string>;
    shell: Shell;
    glassNames: Array<string>;
    glass: Glass;
    headlightNames: Array<string>;
    headLight: Light;
    rearLightNames: Array<string>;
    rearLight: Light;
    whetherToMove: boolean;
    position: Vector3;

    constructor() {
        this.id =  crypto.randomUUID();
        this.tireNames = [];
        this.shellNames = [];
        this.glassNames = [];
        this.headlightNames = [];
        this.rearLightNames = [];
        this.whetherToMove = false;
        this.position = new THREE.Vector3(0, 0, 0);
        this.shell = new Shell();
        this.glass = new Glass();
        this.headLight = new Light();
        this.rearLight = new Light();
    }
    addTireName(name: string) {
        this.tireNames.push(name);
    }
    addShellName(name: string) {
        this.shellNames.push(name);
    }
    addGlassName(name: string) {
        this.glassNames.push(name);
    }
    addHeadlightName(name: string) {
        this.headlightNames.push(name);
    }
    addRearLightName(name: string) {
        this.rearLightNames.push(name);
    }
    setShell(shell: Shell) {
        this.shell = shell;
    }
    setGlass(glass: Glass) {
        this.glass = glass;
    }
    setHeadLight(light: Light) {
        this.headLight = light;
    }
    setRearLight(light: Light) {
        this.rearLight = light;
    }
}

export class Shell{
    metallicity: number;
    roughness: number;
    color: Color;
    constructor() {
    }
}

export class Glass{
    transparency: number;
    opacity: number;
    transmission: number;
    constructor() {
    }
}

export class Light{
    metallicity: number;
    roughness: number;
    constructor() {
    }
}
