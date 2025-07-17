import { createWebHistory, createRouter } from 'vue-router';

const routes = [
  {
    path: '/',
    component: () => import('@/components/HelloWorld.vue'),
    name: 'Home',
    children: [
      {
        path: 'first', // 子路由 path 不加斜杠
        component: () => import('@/components/example/First.vue'),
        name: 'First',
      }
    ]
  }
];

const router = createRouter({
  history: createWebHistory(), // 浏览器环境用 WebHistory
  routes,
});

export default router;