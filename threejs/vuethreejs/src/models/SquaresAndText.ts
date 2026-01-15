import hdModImpl from "@/models/HdModImpl";
import {THREE} from "@/utils/threeModules";
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import {getStaticUrl} from "@/utils/util";

export default class SquaresAndText extends hdModImpl{
    constructor(scene: THREE.Scene, data: any, model: THREE.Object3D, clock: THREE.Clock, renderer: THREE.WebGLRenderer) {
        super(scene, data, model, clock, renderer);
        this.model = new THREE.Group();

        this.creatModel()
    }
    creatModel(){
        const width = this.data.plane.width?this.data.plane.width:3.2
        console.log('width',width)
        const height = this.data.plane.height?this.data.plane.height:18
        const geometry = new THREE.PlaneGeometry( width, height);
        const basicMaterial = new THREE.MeshBasicMaterial( {
            color: this.data.plane.color? this.data.plane.color : 0xffffff,
            side: THREE.DoubleSide
        });
        const mesh = new THREE.Mesh( geometry, basicMaterial );
        this.model.add(mesh);
        const loader = new FontLoader();
        loader.load(getStaticUrl('~/blender/gentilis_regular.typeface.json'),(font)=>{
            const textColor = this.data.text.color? this.data.text.color : 0xffff00;
            const matLite = new THREE.MeshBasicMaterial( {
                color: textColor,
                side: THREE.DoubleSide
            } );
            const message = this.data.text.message? this.data.text.message : 'hello world';
            const size = this.data.text.size? this.data.text.size : 1;
            const shapes = font.generateShapes( message, size );
            const geometry = new THREE.ShapeGeometry( shapes );
            const text = new THREE.Mesh( geometry, matLite );

            // 计算文字边界框并居中
            geometry.computeBoundingBox();
            const textBoundingBox = geometry.boundingBox;
            if (textBoundingBox) {
                const textWidth = textBoundingBox.max.x - textBoundingBox.min.x;
                const textHeight = textBoundingBox.max.y - textBoundingBox.min.y;

                // 将文字中心对齐到方片中心
                text.position.x = -textWidth / 2;
                // text.position.y = -textHeight / 2;
                // 垂直位置控制
                const verticalAlign = this.data.text.verticalAlign || 'middle';
                switch(verticalAlign) {
                    case 'top':
                        text.position.y = height / 2 - textHeight*2;
                        break;
                    case 'middle':
                        text.position.y =  -textHeight / 2;
                        break;
                    case 'bottom':
                        text.position.y = -height / 2 + textHeight;
                        break;
                    default:
                        text.position.y = 0;
                }
            }

            text.position.z = 0.1;
            this.model.add( text );
            this.init()
            this.model.rotateX(-Math.PI / 2)
        })
    }
}
