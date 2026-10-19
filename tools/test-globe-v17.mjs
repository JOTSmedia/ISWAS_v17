import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Run the real GlobeTable callbacks without a browser/GPU; this verifies animation
// timing and lifecycle behavior, while visual frame rate remains a browser check.
const asModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const dataURL=asModule(readFileSync(new URL('../assets/horror-locations-data-v17-1.js',import.meta.url),'utf8'));
const source=readFileSync(new URL('../assets/black-lodge-scene-v17-1.js',import.meta.url),'utf8').replace("'./horror-locations-data-v17-1.js'",JSON.stringify(dataURL));
const {createBlackLodge}=await import(asModule(source));
class Bus {
 constructor(){this.handlers=new Map}
 addEventListener(name,fn){if(!this.handlers.has(name))this.handlers.set(name,new Set);this.handlers.get(name).add(fn)}
 removeEventListener(name,fn){this.handlers.get(name)?.delete(fn)}
 dispatchEvent(event){for(const fn of this.handlers.get(event.type)||[])fn(event)}
}
class Vector {
 constructor(x=0,y=0,z=0){Object.assign(this,{x,y,z})}
 copy(v){Object.assign(this,{x:v.x,y:v.y,z:v.z});return this}
 multiplyScalar(n){this.x*=n;this.y*=n;this.z*=n;return this}
 setScalar(n){this.x=this.y=this.z=n;return this}
 add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this}
 sub(v){this.x-=v.x;this.y-=v.y;this.z-=v.z;return this}
 normalize(){return this.multiplyScalar(1/(Math.hypot(this.x,this.y,this.z)||1))}
 applyMatrix4(){return this}
 project(){return this.multiplyScalar(.5)}
}
class Quaternion {
 constructor(){this.remaining=1;this.lastAlpha=0}
 setFromUnitVectors(){return this}
 slerp(_target,alpha){this.lastAlpha=alpha;this.remaining*=1-alpha}
 angleTo(){return this.remaining}
}
class Shape {constructor(){this.holes=[]}absarc(){}}
class Object3D {constructor(){this.position=new Vector;this.scale=new Vector;this.matrix={}}updateMatrix(){}}
const children=node=>Array.isArray(node?.props?.children)?node.props.children:[node?.props?.children];
const find=(node,test)=>{if(!node||typeof node!=='object')return null;if(test(node))return node;for(const child of children(node)){const found=find(child,test);if(found)return found}return null};
const close=(actual,expected,message)=>assert.ok(Math.abs(actual-expected)<1e-10,`${message}: ${actual} vs ${expected}`);

function harness({mobile=false,reduced=false}={}){
 let clock=1,frame,stateIndex=0,dialogOpen=false;
 const effects=[],layouts=[],intervals=new Set,texturePaths=[];
 const records=[{id:'test-lodge',lat:30,lon:-40,status:'open',film:'Test Film',place:'Test Lodge'}];
 const R={useRef:current=>({current}),useMemo:fn=>fn(),useEffect:fn=>effects.push(fn),useLayoutEffect:fn=>layouts.push(fn),useState:value=>[stateIndex++===0?records:value,()=>{}]};
 const jsx=(type,props)=>{
  const node={type,props};
  if(props?.ref){
   node.instance=type==='instancedMesh'?{setMatrixAt(){},setColorAt(){},instanceMatrix:{},computeBoundingSphere(){}}:
    type==='group'?{rotation:{x:props.rotation?.[0]||0,y:props.rotation?.[1]||0},quaternion:new Quaternion,matrixWorld:{}}:
    type==='meshPhysicalMaterial'?{emissiveIntensity:props.emissiveIntensity}:{intensity:props.intensity};
   props.ref.current=node.instance;
  }
  return node;
 };
 globalThis.window=new Bus;
 globalThis.document=Object.assign(new Bus,{hidden:false,body:{style:{},append(){}},documentElement:{classList:{contains:()=>true}},querySelector:()=>dialogOpen?{}:null,createElement:()=>({style:{},hidden:true,offsetWidth:220,offsetHeight:48,setAttribute(){},remove(){}})});
 globalThis.innerWidth=mobile?390:1280;globalThis.innerHeight=800;
 globalThis.matchMedia=query=>({matches:query.includes('reduced-motion')?reduced:mobile});
 Object.defineProperty(globalThis,'navigator',{value:{connection:{}},configurable:true});
 globalThis.performance={now:()=>clock};
 globalThis.setInterval=fn=>{intervals.add(fn);return fn};globalThis.clearInterval=fn=>intervals.delete(fn);
 const camera={position:{x:21.5}};
 const {GlobeTable}=createBlackLodge({React:R,jsx:{jsx,jsxs:jsx},useFrame:fn=>frame=fn,useThree:()=>({camera}),RoundedBox:class{},Vector2:Vector,Vector3:Vector,Quaternion,Object3D,Color:class{},Shape,Path:Shape,Curve:class{},loadTexture:path=>{texturePaths.push(path);return{repeat:{set(){}},dispose(){}}}});
 const tree=GlobeTable();layouts.forEach(fn=>fn());const cleanup=effects.map(fn=>fn()).filter(Boolean);
 const globe=find(tree,node=>node.type==='mesh'&&node.props.onPointerDown);
 const material=find(globe,node=>node.type==='meshPhysicalMaterial');
 const spin=find(tree,node=>node.type==='group'&&node.props.ref).instance;
 const light=find(tree,node=>node.type==='pointLight'&&node.props.ref).instance;
 const pins=find(tree,node=>node.type==='instancedMesh');
 return {tree,globe,material,spin,light,pins,camera,texturePaths,
  tick(dt){clock+=dt*1000;frame(null,dt)},
  advance(seconds,fps){for(let n=0;n<Math.round(seconds*fps);n++)this.tick(1/fps)},
  setDialog(value){dialogOpen=value},
  dispose(){cleanup.reverse().forEach(fn=>fn());assert.equal(intervals.size,0)}
 };
}

for(const mobile of [false,true])for(const fps of [30,60,120]){
 const h=harness({mobile}),start=h.spin.rotation.y;
 h.advance(10,fps);
 close(h.spin.rotation.y-start,.75,`${mobile?'Mobile':'Desktop'} globe rotates .075 radians/sec at ${fps}fps`);
 const geometry=find(h.globe,node=>node.type==='sphereGeometry');
 assert.deepEqual(geometry.props.args,mobile?[1.05,48,32]:[1.05,80,56]);
 assert.ok(h.texturePaths.every(path=>path.endsWith(mobile?'-1024.webp':'-2048.webp')),'Lodge texture tier matches the device budget');
 h.dispose();
}

{
 const h=harness(),levels=[];
 for(let i=0;i<8*60;i++){h.tick(1/60);levels.push(h.material.instance.emissiveIntensity);close(h.light.intensity,3.8+h.material.instance.emissiveIntensity*2,'Inner light follows the surface pulse')}
 assert.ok(Math.min(...levels)<.601&&Math.max(...levels)>1.699,'Emission sweeps the complete visible pulse range');
 const shader={fragmentShader:'void main() {\n#include <map_fragment>\n#include <emissivemap_fragment>\n}'};
 h.material.props.onBeforeCompile(shader);
 assert.match(shader.fragmentShader,/#include <map_fragment>[\s\S]*float continentMask/);
 assert.match(shader.fragmentShader,/diffuseColor\.rgb\s*=\s*mix\(diffuseColor\.rgb,[\s\S]*continentMask\)/);
 assert.match(shader.fragmentShader,/#include <emissivemap_fragment>[\s\S]*totalEmissiveRadiance\s*=\s*mix\(totalEmissiveRadiance,[\s\S]*continentMask\)/);
 const tints=[...shader.fragmentShader.matchAll(/\* vec3\(([^)]+)\)/g)].map(match=>match[1].split(',').map(Number));
 assert.equal(tints.length,2,'Surface and emission each receive the land tint');assert.deepEqual(tints[0],tints[1]);
 assert.ok(tints[0][1]>tints[0][0]&&tints[0][1]>tints[0][2],'The common land tint is green dominant');
 assert.ok(h.material.props.customProgramCacheKey().includes('green'),'Custom shader does not share the ordinary material cache key');
 const before=h.spin.rotation.y,phase=h.material.instance.emissiveIntensity;
 document.hidden=true;h.tick(10);close(h.spin.rotation.y,before,'Hidden globe pauses rotation');close(h.material.instance.emissiveIntensity,phase,'Hidden globe pauses pulse');document.hidden=false;
 h.tick(10);close(h.spin.rotation.y-before,.00375,'Long stalls cannot cause a large catch-up jump');
 h.pins.props.onPointerOver({instanceId:0,stopPropagation(){}});const hovered=h.spin.rotation.y;h.advance(1,60);close(h.spin.rotation.y,hovered,'Pin hover pauses rotation for reading');
 h.pins.props.onPointerOut();h.tick(1/60);assert.ok(h.spin.rotation.y>hovered,'Rotation resumes when the label is left');
 h.setDialog(true);const modal=h.spin.rotation.y;h.advance(1,60);close(h.spin.rotation.y,modal,'Location popup pauses idle rotation');
 h.setDialog(false);h.camera.position.x=0;h.advance(1,60);close(h.spin.rotation.y,modal,'Distant globe pauses idle rotation');
 h.dispose();
}

for(const mobile of [false,true]){
 const h=harness({mobile,reduced:true}),start=h.spin.rotation.y;
 h.advance(5,60);close(h.spin.rotation.y,start,'Reduced motion disables idle spin');close(h.material.instance.emissiveIntensity,1.15,'Reduced motion keeps a steady glow');
 h.dispose();
}

for(const fps of [30,60,120]){
 const h=harness();window.dispatchEvent({type:'globe-location-select',detail:{id:'test-lodge',lat:30,lon:-40}});
 h.advance(.5,fps);close(h.spin.quaternion.remaining,Math.exp(-2),`Location easing is time based at ${fps}fps`);
 h.tick(10);close(h.spin.quaternion.lastAlpha,1-Math.exp(-.2),'Location easing is bounded after a stall');h.dispose();
}
console.log('PASS: actual globe callbacks at 30/60/120fps on both geometry tiers; green surface/emission hook; full glow pulse; reduced-motion, hidden, hover, dialog and distance pauses; bounded rotation and selection easing.');
