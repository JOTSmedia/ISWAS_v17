import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
const source=readFileSync(new URL('../assets/index-7le_n55D.js',import.meta.url),'utf8');
const body=source.slice(source.indexOf('check=(now)=>{')+6,source.indexOf(';frame=window.requestAnimationFrame(check)'));
function run(readyAt,stall=false){
 let now=0,raf,values=[],timers=[],classes=[];
 const win={__wallGot:{h:true,p:true,l:true},requestAnimationFrame:fn=>(raf=fn,1),setTimeout:fn=>(timers.push(fn),1)};
 const doc={querySelector:()=>({classList:{add:x=>classes.push(x)}})};
 const check=new Function('window','document','performance','i',`let started=0,timer=0,frame=0,shown=0,lastStep=0,finished=false,completing=false;const reveal=()=>{};const check=${body};return check`)(win,doc,{now:()=>now},v=>values.push(v));
 raf=check;
 for(now=0;now<15000&&!classes.includes('is-complete');now+=16){win.__wallReady=now>=readyAt;win.__galleryFirstFrame=now>=readyAt;if(stall&&now>500&&now<2500)continue;raf(now);if(now<Math.min(readyAt,12000)&&values.length)assert.ok(values.at(-1)<=95)}
 assert.deepEqual(values,Array.from({length:100},(_,i)=>i+1));
 assert.ok(classes.includes('is-complete'));
}
run(0);run(5000);run(0,true);run(Infinity);
console.log('PASS: cached load, delayed readiness, main-thread stall and timeout all count 1–100 without skipping.');
