import {RequestOptions} from "@/otherType/request"
import {AxiosHeaders} from "axios";

export const RequestOptionsAll: RequestOptions = {
    headers: new AxiosHeaders(),
    showLoading: true,
    errorModal: true
}
export const RequestOptionsNoShowLoading: RequestOptions = {
    headers: new AxiosHeaders(),
    showLoading: false,
    errorModal: true
}
export const RequestOptionsNoErrorModal: RequestOptions = {
    headers: new AxiosHeaders(),
    showLoading: true,
    errorModal: false
}
