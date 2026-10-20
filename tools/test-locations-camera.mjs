import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../assets/lodge-canvas-v17-4.js',import.meta.url),'utf8');
const start=source.indexOf('function frameLocationsCamera(');
assert.ok(start>=0,'Locations uses a dedicated framing helper');
const {frame,visit}=new Function(source.slice(start,source.indexOf('function Oy(){',start))+';return {frame:frameLocationsCamera,visit:frameGlobeVisitCamera}')();
const vector=()=>({x:0,y:0,z:0,set(x,y,z){Object.assign(this,{x,y,z})}});
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} != ${b}`);
const cameraMock=()=>({fov:42,updates:0,view:null,setViewOffset(fullWidth,fullHeight,offsetX,offsetY,width,height){this.updates++;this.view={enabled:true,fullWidth,fullHeight,offsetX,offsetY,width,height}},clearViewOffset(){this.updates++;this.view.enabled=false},updateProjectionMatrix(){this.updates++}});
const subtract=(a,b)=>({x:a.x-b.x,y:a.y-b.y,z:a.z-b.z});
const dot=(a,b)=>a.x*b.x+a.y*b.y+a.z*b.z;
const cross=(a,b)=>({x:a.y*b.z-a.z*b.y,y:a.z*b.x-a.x*b.z,z:a.x*b.y-a.y*b.x});
const norm=a=>{const length=Math.hypot(a.x,a.y,a.z);return{x:a.x/length,y:a.y/length,z:a.z/length}};
// Sample the actual perspective tangent silhouette, rather than a flat disc at
// the globe center. The pin envelope includes the largest selected pin scale.
function projectedBounds(camera,width,height,position,center,radius){
 const forward=norm(subtract(center,position)),right=norm(cross(forward,{x:0,y:1,z:0})),up=cross(right,forward);
 const distance=Math.hypot(...Object.values(subtract(center,position)));
 const tangentDepth=(distance*distance-radius*radius)/distance;
 const tangentRadius=radius*Math.sqrt(1-radius*radius/(distance*distance));
 const focal=height/(2*Math.tan(camera.fov*Math.PI/360));
 const cx=width/2-(camera.view?.enabled?camera.view.offsetX:0),cy=height/2-(camera.view?.enabled?camera.view.offsetY:0);
 const bounds={left:Infinity,right:-Infinity,top:Infinity,bottom:-Infinity};
 for(let i=0;i<360;i++){
  const angle=i*Math.PI/180,point={};
  for(const axis of ['x','y','z'])point[axis]=position[axis]+forward[axis]*tangentDepth+tangentRadius*(right[axis]*Math.cos(angle)+up[axis]*Math.sin(angle));
  near(Math.hypot(...Object.values(subtract(point,center))),radius,'Sample lies on sphere');
  const relative=subtract(point,position),depth=dot(relative,forward);
  const x=cx+focal*dot(relative,right)/depth,y=cy-focal*dot(relative,up)/depth;
  bounds.left=Math.min(bounds.left,x);bounds.right=Math.max(bounds.right,x);bounds.top=Math.min(bounds.top,y);bounds.bottom=Math.max(bounds.bottom,y);
 }
 return bounds;
}
const sphereRadius=1.05,pinEnvelope=1.1+.032*1.7;
function checkFraming(camera,width,height,viewport,desired,target,scaleWidth,scaleHeight){
 const distance=Math.hypot(desired.x-target.x,desired.y-target.y,desired.z-target.z);
 const pixelsPerUnit=height/(2*Math.tan(camera.fov*Math.PI/360))/distance;
 near(target.x,21.5,'Camera targets the globe horizontally');near(target.y,1.49,'Camera targets the globe center vertically');near(target.z,1.5,'Camera targets the globe depth');
 near(distance,7.5,'All layouts keep the same safe camera distance');
 near(pixelsPerUnit,Math.min(viewport.width/scaleWidth,viewport.height/scaleHeight),'Dynamic field of view preserves the requested scale');
 assert.ok(desired.y>3,'Framed camera stays above the globe/table');
 assert.ok(desired.z<8.1,'Framed camera stays inside the room in front of the rear wall');
 for(const radius of [sphereRadius,pinEnvelope]){
  const bounds=projectedBounds(camera,width,height,desired,target,radius);
  assert.ok(bounds.left>viewport.left&&bounds.right<viewport.left+viewport.width,'Perspective silhouette fits horizontally');
  assert.ok(bounds.top>viewport.top&&bounds.bottom<viewport.top+viewport.height,'Perspective silhouette fits vertically');
  const diameter=2*radius/Math.sqrt(1-(radius/distance)**2)*pixelsPerUnit;
  near(bounds.right-bounds.left,diameter,'Sampled silhouette agrees with perspective tangent diameter');
  near((bounds.left+bounds.right)/2,viewport.left+viewport.width/2,'Globe is centered in the visible pane');
  near((bounds.top+bounds.bottom)/2,viewport.top+viewport.height/2,'Globe is centered vertically');
 }
}
for(const [width,height,viewport] of [
 [1440,900,{left:740,top:110,width:660,height:710}],
 [1024,768,{left:540,top:100,width:460,height:620}],
 [390,844,{left:10,top:100,width:370,height:260}],
 [320,568,{left:8,top:84,width:304,height:180}],
 [844,390,{left:430,top:30,width:400,height:330}],
]){
 const camera=cameraMock(),desired=vector(),target=vector();
 assert.equal(frame(camera,viewport,width,height,desired,target),true);
 near(camera.view.fullWidth/camera.view.fullHeight,width/height,'Full canvas aspect is preserved');
 checkFraming(camera,width,height,viewport,desired,target,3,2.7);
 const updates=camera.updates;
 for(let i=0;i<120;i++)frame(camera,viewport,width,height,desired,target);
 assert.equal(camera.updates,updates,'Stationary frames do not rebuild the projection matrix');
 for(const invalid of [null,{width:0,height:1},{width:1,height:NaN},{width:-1,height:2}])assert.equal(frame(camera,invalid,width,height,desired,target),false);
 assert.equal(camera.view.enabled,false,'Leaving locations restores the normal projection');
 assert.equal(camera.updates,updates+1,'Projection is restored only once');
}
for(const [width,height] of [[1440,900],[1024,768],[390,844],[320,568],[844,390]]){
 const camera=cameraMock(),desired=vector(),target=vector();
 // Match the production ordering when changing from Locations to a 360 visit.
 frame(camera,{left:10,top:80,width:width-20,height:height-160},width,height,desired,target);
 visit(camera,width,height,desired,target);frame(camera,null,width,height,desired,target);
 assert.equal(camera.view.enabled,false,'360 focus clears the previous companion-pane offset');
 checkFraming(camera,width,height,{left:0,top:0,width,height},desired,target,3.4,3.3);
 const bounds=projectedBounds(camera,width,height,desired,target,pinEnvelope);
 assert.ok(bounds.left>=width*.15&&bounds.right<=width*.85,'360 selected-pin envelope leaves horizontal edge controls room');
 assert.ok(bounds.top>=height*.14&&bounds.bottom<=height*.86,'360 selected-pin envelope leaves vertical control margins');
 const updates=camera.updates;
 for(let i=0;i<120;i++){visit(camera,width,height,desired,target);frame(camera,null,width,height,desired,target)}
 assert.equal(camera.updates,updates,'Stationary 360 focus does not rebuild the projection');
}
const oy=source.slice(source.indexOf('function Oy(){'),source.indexOf('function ky(){'));
assert.match(oy,/!window\.__locationsViewport&&!window\.__globeVisit&&t instanceof xu&&t\.fov!==/,'Standard 360 FOV does not fight globe focus');
assert.match(oy,/let idle=tourSceneReady\(\)&&!window\.__locationsViewport/,'Locations pauses the automatic room tour');
assert.match(oy,/r=r=>\{if\(window\.__locationsViewport\|\|r\.button/,'Room dragging cannot fight the globe');
assert.match(oy,/r=n=>\{if\(window\.__locationsViewport\|\|!e\(\)/,'Wheel scrolling does not move the room during locations');
console.log('PASS: actual perspective sphere and selected-pin silhouette fit at desktop/tablet/phone/landscape sizes; globe-centered framing; 360 margins; safe camera distance; stable projections and restoration; room-navigation guards.');
