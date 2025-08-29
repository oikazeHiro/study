// src/utils/loading.ts
import { ElLoading } from 'element-plus';
import type { LoadingInstance } from 'element-plus/es/components/loading/src/loading';

let loadingInstance: LoadingInstance | null = null;

export const showLoading = () => {
    loadingInstance = ElLoading.service({
        lock: true,
        text: '加载中...',
        background: 'rgba(0, 0, 0, 0.7)',
    });
};

export const hideLoading = () => {
    loadingInstance?.close();
    loadingInstance = null;
};
