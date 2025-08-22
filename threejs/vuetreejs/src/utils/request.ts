import axios, { type AxiosInstance, type AxiosResponse } from 'axios'
// src/utils/request.ts
import { type ResponseData, type RequestOptions } from '@/otherType/request'
import { showLoading, hideLoading } from './loading';
import { showErrorModal } from './errorHandler';

// 创建 axios 实例
const service: AxiosInstance = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL, // 从环境变量获取基础URL
    timeout: 10000, // 请求超时时间
    headers: {
        'Content-Type': 'application/json;charset=UTF-8'
    }
})

// 请求拦截器
service.interceptors.request.use(
    (config: RequestOptions) => {
        // 在发送请求之前做些什么
        if (config.showLoading){
            showLoading();
        }
        const token = localStorage.getItem('token')
        if (token && config.headers) {
            config.headers.Authorization = `Bearer ${token}`
            config.headers['Content-Type'] = 'application/json;charset=UTF-8'
        }
        return config
    },
    (error) => {
        // 对请求错误做些什么
        return Promise.reject(error)
    }
)

// 响应拦截器
service.interceptors.response.use(
    (response: AxiosResponse) => {
        // 对响应数据做点什么
        const config = response.config as RequestOptions;
        if (config.showLoading) {
            hideLoading();
        }
        const res = response.data as ResponseData
        // 假设后端返回的数据格式为 { code: number, data: any, message: string }
        if (res.code !== 200) {
            // 处理业务逻辑错误
            console.error(res.message || 'Error')
            return Promise.reject(new Error(res.message || 'Error'))
        }

        return res.data // 直接返回有用的数据部分
    },
    (error) => {
        const config = error.config as RequestOptions;
        if (config.showLoading) {
            hideLoading();
        }
        if (config.errorModal) {
            showErrorModal(error.message || '请求失败');
        }
        // 对响应错误做点什么
        if (error.response) {
            // 处理 HTTP 状态码错误
            switch (error.response.status) {
                case 401:
                    console.error('未授权，请重新登录')
                    // 跳转到登录页
                    break
                case 403:
                    console.error('拒绝访问')
                    break
                case 404:
                    console.error('请求的资源不存在')
                    break
                case 500:
                    console.error('服务器错误')
                    break
                default:
                    console.error(error.response.data.message || '请求错误')
            }
        }
        return Promise.reject(error)
    }
)



// 扩展 axios 实例
const request = {
    get<T = any>(url: string, params?: any, options?: RequestOptions): Promise<T> {
        return service.get(url, { params, ...options })
    },

    post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
        return service.post(url, data, options)
    },

    put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
        return service.put(url, data, options)
    },

    delete<T = any>(url: string, params?: any, options?: RequestOptions): Promise<T> {
        return service.delete(url, { params, ...options })
    },

    // 其他方法...
}

export default request
