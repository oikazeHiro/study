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
];



export {routerData};
