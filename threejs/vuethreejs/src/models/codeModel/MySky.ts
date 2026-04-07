import {THREE} from "@/utils/threeModules";
import {Sky} from 'three/addons/objects/Sky.js';
import StaticModel from "@/models/base/StaticModel";

export default class MySky extends StaticModel {

    private parameters: { elevation: number; azimuth: number };
    private sceneEnv: THREE.Scene;
    private pmremGenerator: THREE.PMREMGenerator;
    private renderTarget: THREE.WebGLRenderTarget | undefined;
    private sunLight: THREE.DirectionalLight | undefined;

    // 默认使用北京经纬度
    private latitude = 39.9042;   // 北京 (N)
    private longitude = 116.4074; // 北京 (E)
    private timezone = 8;         // 北京时间 UTC+8

    constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
        super(scene, renderer);
        this.id = 'sky';
        this.parameters = {
            elevation: 2,
            azimuth: 180
        };
        this.renderTarget = undefined;
        this.init()
    }


    init() {
        this.model = new Sky();
        this.model.scale.setScalar( 450000 );
        this.scene.add( this.model );

        const skyUniforms = (this.model as Sky)!.material.uniforms;
        skyUniforms['rayleigh'].value = 0.6;
        skyUniforms['turbidity'].value = 2.2;
        skyUniforms['mieCoefficient'].value = 0.0008;
        skyUniforms['mieDirectionalG'].value = 0.45;

        this.sceneEnv = new THREE.Scene();
        this.pmremGenerator = new THREE.PMREMGenerator( this.renderer );

        // 添加一个方向光来作为太阳直接照明（用于阴影 / 强度）
        this.sunLight = new THREE.DirectionalLight(0xffffff, 0.5);
        this.sunLight.castShadow = true;
        this.sunLight.position.set(10000, 10000, 10000);
        this.scene.add(this.sunLight);

        // 添加目标点
        const target = new THREE.Object3D();
        target.position.set(0, 0, 0);
        this.sunLight.target = target;
        this.scene.add(target);

        // 初始化时生成一次环境贴图
        this.updateEnvironmentMap();
    }

    private updateEnvironmentMap() {
        // 清理之前的渲染目标
        if ( this.renderTarget !== undefined ) {
            this.renderTarget.dispose();
        }

        // 先从主场景中移除模型，添加到环境场景中生成贴图
        if (this.model.parent === this.scene) {
            this.scene.remove(this.model);
        }

        this.sceneEnv.add(this.model);
        this.renderTarget = this.pmremGenerator.fromScene( this.sceneEnv );

        // 将模型添加回主场景
        this.sceneEnv.remove(this.model);
        this.scene.add(this.model);

        // 更新场景环境贴图
        this.scene.environment = this.renderTarget.texture;
    }

    animate() {
        // 在 animate 中更新太阳位置
        this.setTime(new Date());
    }

    private updateSunPosition() {
        const sun = new THREE.Vector3();

        // 根据太阳高度角和方位角计算球坐标参数
        const phi = THREE.MathUtils.degToRad( 90 - this.parameters.elevation );
        const theta = THREE.MathUtils.degToRad( this.parameters.azimuth );

        // 设置太阳位置
        sun.setFromSphericalCoords( 1, phi, theta );

        // 更新天空材质中的太阳位置uniform变量
        (this.model as Sky)!.material.uniforms[ 'sunPosition' ].value.copy( sun );

        // 更新环境贴图（只在需要时更新，避免性能问题）
        // this.updateEnvironmentMap();

        // 更新方向光的位置
        if (this.sunLight) {
            // 把 sun 放大到一个足够远的位置
            this.sunLight.position.copy(sun).multiplyScalar(100000);

            // 确保光指向原点
            if (this.sunLight.target) {
                this.sunLight.target.position.set(0, 0, 0);
                // 手动更新方向光的矩阵
                this.sunLight.target.updateMatrixWorld(true);
            }

            // 更新方向光的矩阵
            this.sunLight.updateMatrixWorld(true);

            // 设置方向光强度：用一个简单模型：基于太阳高度角，近似强度
            const elevRad = THREE.MathUtils.degToRad(Math.max(0, this.parameters.elevation));
            // intensity range [0, 2], 在中午接近 1.5 左右
            const intensity = THREE.MathUtils.clamp(Math.sin(elevRad) * 1.5, 0.0, 2.0);
            this.sunLight.intensity = intensity;
        }
    }

    /**
     * setTime - 按北京时间设置太阳位置和光照强度
     * 参数可以是：
     *  - Date 实例（会按其时间解释为 UTC 时间 -> 我们根据 timezone 转换为北京时间）
     *  - ISO 字符串
     *  - number（表示小时，使用当天的日期和该小时，北京时间）
     */
    setTime(dateOrStrOrHour: Date | string | number) {
        let date: Date;
        if (typeof dateOrStrOrHour === 'number') {
            // 当作北京时间的小时（0-23）
            const now = new Date();
            // 构造 UTC 对应时间：北京时间 - 8 = UTC
            date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), dateOrStrOrHour - this.timezone, 0, 0));
        } else if (typeof dateOrStrOrHour === 'string') {
            date = new Date(dateOrStrOrHour);
        } else {
            date = dateOrStrOrHour;
        }

        // 计算太阳位置（高度角 elevation & 方位 azimuth） —— 使用北京经纬度 & 北京时间
        const pos = this.computeSolarPosForDate(date, this.latitude, this.longitude, this.timezone);

        // 更新参数
        this.parameters.elevation = pos.elevation;
        this.parameters.azimuth = pos.azimuth;

        // 立即更新太阳位置
        this.updateSunPosition();

        // 更新环境贴图（因为太阳位置变了）
        this.updateEnvironmentMap();
    }

    /**
     * computeSolarPosForDate - 计算给定日期/时间和经纬度下的太阳高度角（elevation）和方位（azimuth）
     * 返回单位：度
     *
     * 参考算法：基于常见的太阳位置计算步骤（朱利安日 -> 太阳赤纬/方位角/时角）。为性能和可读性做了适度简化，
     * 对于视觉渲染/游戏场景的太阳位置和光照强度是足够的。
     */
    private computeSolarPosForDate(dateUTC: Date, latDeg: number, lonDeg: number, tzOffsetHours: number) {
        // dateUTC 是 JS Date（实际存储为 UTC 时间）
        // 我们需要用当地时间（北京时间 = UTC + tzOffsetHours）来计算当地小时数
        // 但算法用的是 UTC 转换到朱利安日的统一流程 —— 下面采用 NOAA 风格步骤

        // helper: deg<->rad
        const toRad = (d: number) => d * Math.PI / 180;
        const toDeg = (r: number) => r * 180 / Math.PI;

        // 1) 计算 UTC 的朱利安日（包含时分秒）
        const year = dateUTC.getUTCFullYear();
        const month = dateUTC.getUTCMonth() + 1; // JS 月从 0 开始
        const day = dateUTC.getUTCDate();
        const hour = dateUTC.getUTCHours();
        const minute = dateUTC.getUTCMinutes();
        const second = dateUTC.getUTCSeconds();

        // Julian Day
        let Y = year;
        let M = month;
        if (M <= 2) {
            Y -= 1;
            M += 12;
        }
        const A = Math.floor(Y / 100);
        const B = 2 - A + Math.floor(A / 4);
        const JD = Math.floor(365.25 * (Y + 4716)) + Math.floor(30.6001 * (M + 1)) + day + B - 1524.5
            + (hour + minute / 60 + second / 3600) / 24;

        // Julian century
        const T = (JD - 2451545.0) / 36525.0;

        // Geometric mean longitude of the sun (deg)
        const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360;

        // Geometric mean anomaly of the sun (deg)
        const M_sun = 357.52911 + T * (35999.05029 - 0.0001537 * T);

        // Eccentricity of Earth's orbit
        const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);

        // Sun eq of center
        const C = Math.sin(toRad(M_sun)) * (1.914602 - T*(0.004817 + 0.000014*T))
            + Math.sin(toRad(2*M_sun)) * (0.019993 - 0.000101*T)
            + Math.sin(toRad(3*M_sun)) * 0.000289;

        // Sun true longitude
        const trueLong = L0 + C;

        // Sun apparent longitude
        const omega = 125.04 - 1934.136 * T;
        const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(toRad(omega));

        // Mean obliquity of ecliptic
        const eps0 = 23 + (26 + ((21.448 - T*(46.815 + T*(0.00059 - T*0.001813))))/60)/60;
        // Corrected obliquity
        const eps = eps0 + 0.00256 * Math.cos(toRad(omega));

        // Sun declination (deg)
        const sinDecl = Math.sin(toRad(eps)) * Math.sin(toRad(lambda));
        const decl = toDeg(Math.asin(sinDecl));

        // Equation of time (minutes)
        const y = Math.tan(toRad(eps / 2)) * Math.tan(toRad(eps / 2));
        const eqTime = 4 * toDeg( y * Math.sin(2 * toRad(L0)) - 2 * e * Math.sin(toRad(M_sun))
            + 4 * e * y * Math.sin(toRad(M_sun)) * Math.cos(2 * toRad(L0))
            - 0.5 * y * y * Math.sin(4 * toRad(L0))
            - 1.25 * e * e * Math.sin(2 * toRad(M_sun)) );

        // Local Standard Time Meridian (degrees) for timezone
        const LSTM = 15 * tzOffsetHours;

        // Time in minutes since midnight UTC
        const minutesUTC = hour * 60 + minute + second / 60;

        // Local true solar time in minutes:
        // LST_min = minutesUTC + 60*tzOffsetHours + eqTime + 4*(lonDeg - LSTM)
        const localMinutes = minutesUTC + 60 * tzOffsetHours + eqTime + 4 * (lonDeg - LSTM);

        // Hour angle (deg): convert minutes to degrees (15 deg per hour => 1 deg per 4 minutes)
        let HA = localMinutes / 4 - 180; // -180..180
        // normalize
        if (HA < -180) HA += 360;
        if (HA > 180) HA -= 360;

        // Convert to radians
        const haRad = toRad(HA);
        const latRad = toRad(latDeg);
        const declRad = toRad(decl);

        // Solar zenith angle
        const cosZenith = Math.sin(latRad) * Math.sin(declRad) + Math.cos(latRad) * Math.cos(declRad) * Math.cos(haRad);
        const zenith = toDeg(Math.acos(Math.min(Math.max(cosZenith, -1), 1))); // degrees
        const elevation = 90 - zenith;

        // Solar azimuth angle calculation (from North, clockwise)
        // Formula from NOAA: azimuth = atan2( sin(H), cos(H)*sin(phi) - tan(delta)*cos(phi) )
        let azimuth = toDeg(Math.atan2(
            Math.sin(haRad),
            Math.cos(haRad) * Math.sin(latRad) - Math.tan(declRad) * Math.cos(latRad)
        ));
        // Convert to degrees from North clockwise: (azimuth + 180) % 360
        azimuth = (azimuth + 180) % 360;

        return { elevation, azimuth };
    }

}
