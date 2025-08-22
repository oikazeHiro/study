// src/otherType/request.ts
import {InternalAxiosRequestConfig} from "axios";

export interface ResponseData<T = any> {
    code: number
    data: T
    message: string
}

export interface RequestOptions {
    showLoading?: boolean // 是否显示加载提示
    errorModal?: boolean // 是否显示错误弹窗
    headers?: any
    // 其他自定义配置...
}
