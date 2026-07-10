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
            }
        ];
    }
}
