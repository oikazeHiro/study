import type { SceneData } from '../base/SceneModelManager';

export const testSceneData: SceneData = {
    sanHuoShip: {
        ship_01: {
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            status: 'normal'
        },
        ship_02: {
            position: { x: 8, y: 0, z: 4 },
            rotation: { x: 0, y: Math.PI / 4, z: 0 },
            scale: { x: 0.8, y: 0.8, z: 0.8 },
            status: 'normal'
        },
        ship_03: {
            position: { x: -8, y: 0, z: -4 },
            rotation: { x: 0, y: -Math.PI / 3, z: 0 },
            scale: { x: 1.2, y: 1.2, z: 1.2 },
            status: 'normal'
        },
        ship_04: {
            position: { x: 4, y: 0, z: -8 },
            rotation: { x: 0, y: Math.PI / 2, z: 0 },
            scale: { x: 0.6, y: 0.6, z: 0.6 },
            status: 'hidden'
        }
    },
    zhuangZaiJi: {
        zzj_01: {
            position: { x: 3, y: 0, z: 3 },
            rotation: { x: 0, y: 0, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            status: 'normal'
        },
        zzj_02: {
            position: { x: -5, y: 0, z: 5 },
            rotation: { x: 0, y: Math.PI, z: 0 },
            scale: { x: 1, y: 1, z: 1 },
            status: 'normal'
        }
    }
};
