import {getStaticUrl} from '~/utils/util'

const routerData = [
    {
        path: 'first', // 子路由 path 不加斜杠
        component: () => import('@/components/example/First.vue'),
        name: '第一个实例',
    },
    {
        path: 'second',
        component: () => import('@/components/example/Second.vue'),
        name: '第二个实例',
    },
    {
        path: 'modtest',
        component: () => import('@/components/example/ModTest.vue'),
        name: '测试模型',
    },
    {
        path: 'moveTest',
        component: () => import('@/components/example/mod/MoveTest.vue'),
        name: '模型移动测试',
    },
];

export {routerData};
