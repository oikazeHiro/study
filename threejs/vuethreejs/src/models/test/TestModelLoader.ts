import ModelStandardLoader from '../base/ModelStandardLoader';

export default class TestModelLoader extends ModelStandardLoader {
    constructor() {
        super();
        this.modelConfigs = [
            {
                isNeedLoaded: true,
                lowModelPath: '/models/ship/sanHuoShip.glb',
                mediumModelPath: '/models/ship/sanHuoShip.glb',
                highModelPath: '/models/ship/sanHuoShip.glb',
                path: '/models/ship/sanHuoShip.glb',
                key: 'sanHuoShip',
                name: '三货船'
            },
            {
                isNeedLoaded: true,
                lowModelPath: '/models/ship/zhuangZaiJi.glb',
                mediumModelPath: '/models/ship/zhuangZaiJi.glb',
                highModelPath: '/models/ship/zhuangZaiJi.glb',
                path: '/models/ship/zhuangZaiJi.glb',
                key: 'zhuangZaiJi',
                name: '装载机'
            },
            {
                isNeedLoaded: true,
                lowModelPath: '/models/car/86年雪佛兰M1009汽车.glb',
                mediumModelPath: '/models/car/86年雪佛兰M1009汽车.glb',
                highModelPath: '/models/car/86年雪佛兰M1009汽车.glb',
                path: '/models/car/86年雪佛兰M1009汽车.glb',
                key: 'chevrolet_m1009',
                name: '86年雪佛兰M1009'
            },
            {
                isNeedLoaded: true,
                lowModelPath: '/models/car/GT_001.004_Vehicle.glb',
                mediumModelPath: '/models/car/GT_001.004_Vehicle.glb',
                highModelPath: '/models/car/GT_001.004_Vehicle.glb',
                path: '/models/car/GT_001.004_Vehicle.glb',
                key: 'gt_001_vehicle',
                name: 'GT 001 Vehicle'
            },
            {
                isNeedLoaded: true,
                lowModelPath: '/models/car/未命名.glb',
                mediumModelPath: '/models/car/未命名.glb',
                highModelPath: '/models/car/未命名.glb',
                path: '/models/car/未命名.glb',
                key: 'test',
                name: 'test'
            },
        ];
    }
}
