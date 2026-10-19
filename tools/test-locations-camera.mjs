import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/lodge-canvas-v17-3-p1.js',import.meta.url),'utf8');
const start=source.indexOf('function frameLocationsCamera(');
assert.ok(start>=0,'Locations uses a dedicated framing helper');
const frame=new Function(source.slice(start,source.indexOf('function Oy(){',start))+';return frameLocationsCamera')();
const vector=()=>({x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}});
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} != ${b}`);
for(const [width,height,viewport] of [
 [1440,900,{left:740,top:110,width:660,height:710}],
 [1024,768,{left:540,top:100,width:460,height:620}],
 [390,844,{left:10,top:100,width:370,height:260}],
 [320,568,{left:8,top:84,width:304,height:180}],
 [844,390,{left:430,top:30,width:400,height:330}],
]){
 const camera={fov:42,updates:0,view:null,setViewOffset(fullWidth,fullHeight,offsetX,offsetY,width,height){this.updates++;this.view={enabled:true,fullWidth,fullHeight,offsetX,offsetY,width,height}},clearViewOffset(){this.updates++;this.view.enabled=false}};
 const desired=vector(),target=vector();
 assert.equal(frame(camera,viewport,width,height,desired,target),true);
 near(width*.5-camera.view.offsetX,viewport.left+viewport.width*.5,'Optical center is in the free horizontal pane');
 near(height*.5-camera.view.offsetY,viewport.top+viewport.height*.5,'Optical center is in the free vertical pane');
 near(camera.view.fullWidth/camera.view.fullHeight,width/height,'Full canvas aspect is preserved');
 const distance=Math.hypot(desired.x-target.x,desired.y-target.y,desired.z-target.z);
 const pixelsPerUnit=height/(2*Math.tan(camera.fov*Math.PI/360))/distance;
 assert.ok(2.3*pixelsPerUnit<viewport.width,'Globe and pins fit horizontally');
 assert.ok(2.3*pixelsPerUnit<viewport.height,'Globe and pins fit vertically');
 assert.ok(desired.y>3,'Framed camera stays above the globe/table');
 assert.ok(desired.z<8.1,'Framed camera stays inside the room in front of the rear wall');
 near(distance,7.5,'All layouts keep the same safe camera distance');
 near(pixelsPerUnit,Math.min(viewport.width/5.1,viewport.height/2.8),'Dynamic field of view preserves the requested scale');
 const updates=camera.updates;
 for(let i=0;i<120;i++)frame(camera,viewport,width,height,desired,target);
 assert.equal(camera.updates,updates,'Stationary frames do not rebuild the projection matrix');
 assert.equal(frame(camera,null,width,height,desired,target),false);
 assert.equal(camera.view.enabled,false,'Leaving locations restores the normal projection');
 frame(camera,null,width,height,desired,target);
 assert.equal(camera.updates,updates+1,'Projection is restored only once');
}
const oy=source.slice(source.indexOf('function Oy(){'),source.indexOf('function ky(){'));
assert.equal((oy.match(/!window\.__locationsViewport&&t instanceof xu&&t\.fov!==/g)||[]).length,2,'Both standard camera FOV setters are skipped during locations framing');
assert.match(oy,/let idle=!window\.__locationsViewport/,'Locations pauses the automatic room tour');
assert.match(oy,/r=r=>\{if\(window\.__locationsViewport\|\|r\.button/,'Room dragging cannot fight the globe');
assert.match(oy,/r=n=>\{if\(window\.__locationsViewport\|\|!e\(\)/,'Wheel scrolling does not move the room during locations');
console.log('PASS: shared-camera framing at desktop, tablet, narrow phone and landscape sizes; stable projection; normal projection restoration; room-navigation guards.');
