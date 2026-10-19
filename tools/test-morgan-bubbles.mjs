import fs from 'node:fs';
import assert from 'node:assert/strict';

const dataModule=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
const lifetime=dataModule(fs.readFileSync(new URL('../assets/bubble-lifetime.js',import.meta.url),'utf8'));
const source=fs.readFileSync(new URL('../assets/morgan-bubbles.js',import.meta.url),'utf8').replace("'./bubble-lifetime.js'",JSON.stringify(lifetime));

class Element {
 constructor(){this.style={};this.children=[];this.hidden=false;this.attributes={};this.classes=new Set;this.classList={add:name=>this.classes.add(name),toggle:(name,on)=>on?this.classes.add(name):this.classes.delete(name)};}
 append(...children){this.children.push(...children)}
 setAttribute(name,value){this.attributes[name]=value}
 getAttribute(name){return this.attributes[name]??null}
 get offsetHeight(){return 64}
 getBoundingClientRect(){const left=parseFloat(this.style.left)||0,top=parseFloat(this.style.top)||0,width=parseFloat(this.style.width)||0,height=this.offsetHeight;return{left,top,width,height,right:left+width,bottom:top+height}}
 remove(){}
}
const timers=new Map;let nextTimer=1;
globalThis.setTimeout=(callback,delay)=>{const id=nextTimer++;timers.set(id,{callback,delay});return id};
globalThis.clearTimeout=id=>timers.delete(id);
globalThis.window={__morganInTransit:false};
globalThis.innerWidth=1000;globalThis.innerHeight=800;
globalThis.document={hidden:false,createElement:()=>new Element,createElementNS:()=>new Element,querySelector:()=>null};
const {createMorganBubbles}=await import(dataModule(source));
const guide=new Element,finished=[];
const bubbles=createMorganBubbles({guide,onAction(){},onDone:kind=>finished.push(kind)});
const [bubble,tail]=guide.children;
const anchor=(left=100,top=300,width=100,height=150)=>({rect:{left,top,width,height},mouth:{x:left+width*.56,y:top+height*.132},visible:true});
const context=(key,kind='library',position=anchor())=>({key,kind,text:'NEED A HAND? ASK MORGAN.',anchor:position});

bubbles.update(context('library-1'),100);
assert.equal(bubble.hidden,false);
window.__morganInTransit=true;
bubbles.update(context('controls-1','controls'),200);
assert.deepEqual(finished,[],'A new owner waiting for its arrival flight must not inherit the previous bubble’s started state.');
window.__morganInTransit=false;
bubbles.update(context('controls-1','controls'),300);
assert.equal(bubble.hidden,false,'Controls greeting survives the flight handoff.');
const mouth=anchor().mouth;
assert.ok(bubble.getBoundingClientRect().left-mouth.x<=24,'The bubble stays close enough for its short tail to reach Morgan.');
assert.ok(tail.children[0].attributes.d.includes(`L ${mouth.x} ${mouth.y} L`),'The tail tip connects to the actual projected mouth.');
const close=bubble.children[1];
close.onclick({stopPropagation(){}});
assert.equal(bubble.hidden,true,'The X closes the greeting.');
bubbles.update(context('controls-1','controls'),400);
assert.equal(bubble.hidden,true,'An explicitly closed greeting does not reappear.');
assert.deepEqual(finished,['controls']);

globalThis.innerWidth=320;
bubbles.update(context('controls-2','controls',anchor(108,300,76,114)),500);
assert.equal(bubble.hidden,false,'The mobile greeting fits beside the controls avatar.');
assert.ok(bubble.getBoundingClientRect().right<=310,'Mobile bubble remains inside the viewport.');
const expiry=[...timers.values()].find(timer=>timer.delay===3000);
assert.ok(expiry,'The hard deadline is scheduled for three seconds.');
expiry.callback();
assert.equal(bubble.hidden,true,'The hard deadline hides the bubble independently of animation frames.');
bubbles.update(context('controls-2','controls',anchor(108,300,76,114)),3600);
assert.equal(bubble.hidden,true,'A timed-out greeting cannot restart.');
console.log('PASS: owner-flight handoff, exact short mouth pointer, X dismissal, mobile fit, and hard three-second expiry.');
