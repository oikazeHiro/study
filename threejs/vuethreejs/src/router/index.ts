import { createWebHistory, createRouter } from 'vue-router';
import {routerData} from '@/utils/dataUtil'

const routes = [
  {
    path: '/',
    component: () => import('@/components/HelloWorld.vue'),
    name: '',
    children: routerData
  },
  {
    path: '/home',
    component: () => import('@/components/example/home2.vue'),
    name: 'home',
  }
];

const router = createRouter({
  history: createWebHistory(), // 浏览器环境用 WebHistory
  routes,
});

export default router;
