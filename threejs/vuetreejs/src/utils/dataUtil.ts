let routerData = [
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
];



export {routerData};
