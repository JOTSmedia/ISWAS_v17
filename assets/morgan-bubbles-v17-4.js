import { BubbleLifetime } from './bubble-lifetime-v17-4.js';
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
const isOverview=()=>{const base=(window.__ISWAS_BASE||'/').replace(/\/$/,'');const path=(window.location?.pathname||'/').replace(/\/$/,'');return path===base;};
export function createMorganBubbles({guide,onAction,onDone}) {
 const life=new BubbleLifetime(),bubble=document.createElement('div');
 bubble.className='morgan-speech-bubble';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
 const action=document.createElement('button');action.type='button';action.className='morgan-bubble-action';
 const close=document.createElement('button');close.type='button';close.className='morgan-bubble-close';close.textContent='×';close.setAttribute('aria-label','Close Morgan’s speech bubble');
 bubble.append(action,close);guide.append(bubble);
 const tail=document.createElementNS('http://www.w3.org/2000/svg','svg');tail.classList.add('morgan-bubble-tail');tail.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');tail.append(path);guide.append(tail);
 let context=null,fadeTimer=0,endTimer=0,finishedKey=null,settledSince=null,lastAnchor=null,lastPlacement=null;
 const hide=()=>{bubble.hidden=true;tail.style.display='none';};
 const clearTimers=()=>{clearTimeout(fadeTimer);clearTimeout(endTimer);fadeTimer=endTimer=0;};
 const done=()=>{if(context?.key&&finishedKey!==context.key){finishedKey=context.key;onDone(context.kind)}};
 const dismiss=()=>{life.dismiss();clearTimers();hide();done()};
 close.onclick=event=>{event.stopPropagation();dismiss()};
 action.onclick=()=>{const kind=context?.kind;dismiss();if(kind!=='controls')onAction()};
 function place(anchor,kind){
  const a=anchor.rect,m=anchor.mouth,margin=10,maxTail=32,preferredWidth=Math.min(kind==='controls'?174:190,innerWidth-20);
  // The world rect encloses the silhouette, not the transparent source image.
  // Anchor to the projected mouth and leave the visible head clear on both sides.
  const head={left:m.x-a.width*.22,right:m.x+a.width*.075,top:m.y-a.height*.12,bottom:m.y+a.height*.065};
  const body={left:a.left+a.width*(anchor.space==='portrait'?.25:.12),right:a.left+a.width*(anchor.space==='portrait'?.74:.92),top:a.top+a.height*.23,bottom:a.top+a.height*.99};
  const blockers=[document.querySelector('.gallery-controls'),document.querySelector('.mast')].filter(Boolean).map(el=>el.getBoundingClientRect());
  if(kind==='initial'){const hero=document.querySelector('.dossier-panel')?.getBoundingClientRect();if(hero)blockers.push(hero)}
  const valid=(b,edge)=>{
   if(b.left<margin||b.right>innerWidth-margin||b.top<margin||b.bottom>innerHeight-margin||blockers.some(r=>intersects(b,r))||intersects(b,head)||intersects(b,body))return false;
   const startY=Math.max(b.top+10,Math.min(b.bottom-10,m.y));
   if(Math.hypot(m.x-edge,m.y-startY)>maxTail)return false;
   bubble.style.left=b.left+'px';bubble.style.top=b.top+'px';
   tail.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);path.setAttribute('d',`M ${edge} ${startY-4} L ${m.x} ${m.y} L ${edge} ${startY+4} Z`);
   return true;
  };
  // Keep a proven text position through subpixel camera/breathing changes. Its
  // pointer still tracks the live mouth, and every collision is checked again.
  if(lastPlacement&&Math.hypot(m.x-lastPlacement.mouth.x,m.y-lastPlacement.mouth.y)<6){
   const b=lastPlacement.rect;bubble.style.width=lastPlacement.width+'px';bubble.style.maxWidth=lastPlacement.width+'px';
   b.bottom=b.top+bubble.offsetHeight;
   if(valid(b,lastPlacement.edge))return true;
  }
  const sides=[{edge:Math.max(m.x+16,head.right+4),right:true},{edge:Math.min(m.x-16,head.left-4),right:false}];
  for(const side of sides){
   const available=side.right?innerWidth-margin-side.edge:side.edge-margin;
   if(available<106||Math.abs(side.edge-m.x)>maxTail)continue;
   const widths=[...new Set([Math.min(preferredWidth,available),160,140,120,106].filter(width=>width<=preferredWidth&&width<=available))];
   for(const width of widths){
    bubble.style.width=width+'px';bubble.style.maxWidth=width+'px';
    const height=bubble.offsetHeight,x=side.right?side.edge:side.edge-width;
    for(const y of [m.y-height+8,m.y-height*.5,m.y-12]){
     const b={left:x,right:x+width,top:y,bottom:y+height};
     if(valid(b,side.edge)){lastPlacement={rect:b,width,edge:side.edge,mouth:{x:m.x,y:m.y}};return true;}
    }
   }
  }
  return false;
 }
 function initialReady(next,now,started){
  if(next?.kind!=='initial')return true;
  const live=document.documentElement.classList.contains('iswas-scene-ready')&&window.__morgan3D?.isReady===true&&!document.querySelector('.is-intro');
  if(!live){settledSince=null;lastAnchor=null;return false}
  if(started)return true;
  if('__tourStopStartedAt' in window&&!window.__v9Paused)return window.__tourStopSection==='/'&&Number.isFinite(window.__tourStopStartedAt)&&window.__tourStopStartedAt>0&&now-window.__tourStopStartedAt>=100;
  const a=next.anchor,m=a?.mouth;
  if(!a?.visible||!m){settledSince=null;lastAnchor=null;return false}
  if(lastAnchor){
   const elapsed=Math.max(1,now-lastAnchor.at),movement=Math.hypot(m.x-lastAnchor.x,m.y-lastAnchor.y)+Math.abs(a.rect.width-lastAnchor.width);
   if(elapsed>250||movement>Math.max(.75,elapsed*.04))settledSince=now;
  }
  settledSince??=now;lastAnchor={x:m.x,y:m.y,width:a.rect.width,at:now};
  // The canvas has a 450ms reveal. The greeting starts only once its owner is
  // both painted and settled, so loading and camera travel consume no read time.
  return now-settledSince>=500;
 }
 return { update(next,now=performance.now()){
  // On a slow GPU the guide can outpace the 3D paint. Its last explicit visible
  // projection still describes the displayed avatar; a stale timestamp alone
  // is not evidence that the user looked away. A new offscreen frame wins.
  if(next?.kind==='initial'&&!next.anchor&&window.__morganProjection?.visible)next={...next,anchor:window.__morganProjection};
  if(next?.key!==context?.key){clearTimers();hide();finishedKey=null;settledSince=null;lastAnchor=null;lastPlacement=null;}
  context=next;
  // The welcome belongs to Overview and runs inside its existing tour hold.
  // Leaving that route ends it even before its first usable placement.
  if(next?.kind==='initial'&&!isOverview()){life.sync(next.key,false,now);life.dismiss();clearTimers();hide();done();return;}
  const key=next?.key||null,starting=life.key!==key||life.started===null,startedForKey=life.key===key&&life.started!==null;
  const ownerVisible=!!(next?.anchor?.visible&&!window.__morganInTransit&&!document.hidden&&!document.querySelector('dialog[open],.gallery-dialog,.tome-back,.magic-portal'));
  if(!ownerVisible&&!startedForKey){settledSince=null;lastAnchor=null}
  let eligible=ownerVisible&&initialReady(next,now,startedForKey),placed=false;
  // A valid placement is part of readiness. Never spend or cancel the opening
  // greeting just because the first loading/camera frame has no usable space.
  if(eligible&&(!life.closed||life.key!==key)){
   if(action.textContent!==next.text)action.textContent=next.text;
   const label=next.kind==='controls'?'Dismiss direction-control tip':`Ask Morgan: ${next.text}`;
   if(action.getAttribute('aria-label')!==label)action.setAttribute('aria-label',label);
   bubble.hidden=false;bubble.style.visibility='hidden';
   placed=place(next.anchor,next.kind);bubble.style.visibility='';
   if(!startedForKey)eligible=eligible&&placed;
  }
  life.duration=next?.kind==='initial'?8000:3000;
  const phase=life.sync(key,eligible,now);
  if(phase==='hidden'||phase==='expired'){hide();if(phase==='expired'||startedForKey&&!eligible){clearTimers();done()}return;}
  if(!placed){hide();return;}
  bubble.hidden=false;bubble.classList.toggle('is-fading',phase==='fading');
  tail.style.display='block';tail.classList.toggle('is-fading',phase==='fading');
  if(starting&&life.started!==null){const key=next.key;fadeTimer=setTimeout(()=>{if(context?.key===key){bubble.classList.add('is-fading');tail.classList.add('is-fading')}},life.duration-life.fade);endTimer=setTimeout(()=>{if(context?.key===key){life.dismiss();hide();done()}},life.duration);}
 }, dismiss, destroy(){clearTimers();bubble.remove();tail.remove();} };
}
