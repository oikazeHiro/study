// src/utils/errorHandler.ts
import { ElMessage } from 'element-plus';

export const showErrorModal = (message: string) => {
    ElMessage.error({
        message,
        duration: 3000,
        showClose: true
    });
};
