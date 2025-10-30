// BaseModel.ts
import { THREE } from "@/utils/threeModules";

export abstract class BaseModel {
    // 通用的 fromObject 方法
    static fromObject<T extends BaseModel>(this: new (data?: any) => T, obj: any): T {
        return new this(obj);
    }

    // 通用的 fromJSON 方法
    static fromJSON<T extends BaseModel>(this: new (data?: any) => T, json: string): T {
        try {
            const data = JSON.parse(json);
            const instance = new this();

            // 遍历数据属性并反序列化
            for (const key in data) {
                if (data.hasOwnProperty(key)) {
                    (instance as any)[key] = instance.deserializeValue(key, data[key]);
                }
            }

            return instance;
        } catch (error) {
            console.error('Failed to parse JSON:', error);
            return new this();
        }
    }


    // 通用的 fromJSONArray 方法
    static fromJSONArray<T extends BaseModel>(this: new (data?: any) => T, jsonArray: string): T[] {
        try {
            const dataArray = JSON.parse(jsonArray);
            if (!Array.isArray(dataArray)) {
                throw new Error('Expected an array');
            }

            return dataArray.map(item => {
                const instance = new this();

                // 遍历数据属性并反序列化
                for (const key in item) {
                    if (item.hasOwnProperty(key)) {
                        (instance as any)[key] = instance.deserializeValue(key, item[key]);
                    }
                }

                return instance;
            });
        } catch (error) {
            console.error('Failed to parse JSON array:', error);
            return [];
        }
    }

    // 通用的 toObject 方法
    toObject(): any {
        const obj: any = {};
        for (const key in this) {
            if (this.hasOwnProperty(key)) {
                const value = (this as any)[key];
                obj[key] = this.serializeValue(value);
            }
        }
        return obj;
    }

    // 通用的 toJSON 方法
    toJSON(): string {
        return JSON.stringify(this.toObject());
    }

    // 值序列化处理
    private serializeValue(value: any): any {
        if (value instanceof THREE.Vector3) {
            return { x: value.x, y: value.y, z: value.z, __type: 'Vector3' };
        } else if (value instanceof THREE.Euler) {
            return { x: value.x, y: value.y, z: value.z, order: value.order, __type: 'Euler' };
        } else if (value instanceof Date) {
            return value.toISOString();
        } else if (Array.isArray(value)) {
            return value.map(item => this.serializeValue(item));
        } else if (typeof value === 'object' && value !== null) {
            const result: any = {};
            for (const key in value) {
                result[key] = this.serializeValue(value[key]);
            }
            return result;
        }
        return value;
    }

    // 值反序列化处理
    protected deserializeValue(key: string, value: any): any {
        if (value && value.__type) {
            switch (value.__type) {
                case 'Vector3':
                    return new THREE.Vector3(value.x, value.y, value.z);
                case 'Euler':
                    return new THREE.Euler(value.x, value.y, value.z, value.order);
                case 'Quaternion':
                    return new THREE.Quaternion(value.x, value.y, value.z, value.w);
                case 'Color':
                    return new THREE.Color(value);
                case 'Matrix4':
                    const matrix = new THREE.Matrix4();
                    matrix.fromArray(value.elements);
                    return matrix;
                default:
                    return value;
            }
        }
        return value;
    }

}
