import { BubbleLifetime } from './bubble-lifetime.js';
const intersects=(a,b)=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top;
export function createMorganBubbles({guide,onAction,onDone}) {
 const life=new BubbleLifetime(),bubble=document.createElement('div');
 bubble.className='morgan-speech-bubble';bubble.hidden=true;bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
 const action=document.createElement('button');action.type='button';action.className='morgan-bubble-action';
 const close=document.createElement('button');close.type='button';close.className='morgan-bubble-close';close.textContent='×';close.setAttribute('aria-label','Close Morgan’s speech bubble');
 bubble.append(action,close);guide.append(bubble);
 const tail=document.createElementNS('http://www.w3.org/2000/svg','svg');tail.classList.add('morgan-bubble-tail');tail.setAttribute('aria-hidden','true');
 const path=document.createElementNS('http://www.w3.org/2000/svg','path');tail.append(path);guide.append(tail);
 let context=null,fadeTimer=0,endTimer=0,finishedKey=null;
 const hide=()=>{bubble.hidden=true;tail.style.display='none';};
 const clearTimers=()=>{clearTimeout(fadeTimer);clearTimeout(endTimer);fadeTimer=endTimer=0;};
 const done=()=>{if(context?.key&&finishedKey!==context.key){finishedKey=context.key;onDone(context.kind)}};
 const dismiss=()=>{life.dismiss();clearTimers();hide();done()};
 close.onclick=event=>{event.stopPropagation();dismiss()};
 action.onclick=()=>{const kind=context?.kind;dismiss();if(kind!=='controls')onAction()};
 function place(anchor,kind){
  const a=anchor.rect,m=anchor.mouth,margin=10,preferredWidth=Math.min(kind==='controls'?174:190,innerWidth-20);
  // The portrait contains transparent margins. Place beside his head rather than
  // the image rectangle, so the short pointer can reach his actual mouth.
  const right=Math.max(m.x+16,a.left+a.width*.63+4),left=Math.min(m.x-16,a.left+a.width*.44-4);
  const rightRoom=innerWidth-margin-right,leftRoom=left-margin;
  let x,width;
  if(right-m.x<=24&&rightRoom>=106){width=Math.min(preferredWidth,rightRoom);x=right}
  else if(m.x-left<=24&&leftRoom>=106){width=Math.min(preferredWidth,leftRoom);x=left-width}
  else return false;
  bubble.style.width=width+'px';bubble.style.maxWidth=width+'px';
  const height=bubble.offsetHeight;
  let y=m.y-height+12;
  if(y<margin)return false;
  bubble.style.left=x+'px';bubble.style.top=y+'px';
  let b=bubble.getBoundingClientRect();
  const blockers=[document.querySelector('.gallery-controls'),document.querySelector('.mast')].filter(Boolean).map(el=>el.getBoundingClientRect());
  if(blockers.some(r=>intersects(b,r)))return false;
  if(b.bottom>innerHeight-margin)return false;
  if(kind==='initial'){const hero=document.querySelector('.dossier-panel')?.getBoundingClientRect();if(hero&&intersects(b,hero))return false;}
  const head={left:a.left+a.width*.44,right:a.left+a.width*.63,top:a.top+a.height*.015,bottom:a.top+a.height*.23};
  const body={left:a.left+a.width*.25,right:a.left+a.width*.74,top:a.top+a.height*.23,bottom:a.top+a.height*.99};
  if(intersects(b,head)||intersects(b,body))return false;
  const edge=m.x<b.left?b.left:m.x>b.right?b.right:Math.max(b.left+10,Math.min(b.right-10,m.x));
  const startY=Math.max(b.top+10,Math.min(b.bottom-10,m.y));
  if(Math.hypot(m.x-edge,m.y-startY)>24)return false;
  tail.setAttribute('viewBox',`0 0 ${innerWidth} ${innerHeight}`);path.setAttribute('d',`M ${edge} ${startY-4} L ${m.x} ${m.y} L ${edge} ${startY+4} Z`);
  return true;
 }
 return { update(next,now=performance.now()){
  if(next?.key!==context?.key){clearTimers();hide();finishedKey=null;}
  context=next;
  const eligible=!!(next?.anchor?.visible&&!window.__morganInTransit&&!document.hidden&&!document.querySelector('dialog[open],.gallery-dialog,.tome-back,.magic-portal'));
  const key=next?.key||null,starting=life.key!==key||life.started===null,startedForKey=life.key===key&&life.started!==null,phase=life.sync(key,eligible,now);
  if(phase==='hidden'||phase==='expired'){hide();if(phase==='expired'||startedForKey&&!eligible)done();return;}
  if(action.textContent!==next.text)action.textContent=next.text;
  const label=next.kind==='controls'?'Dismiss direction-control tip':`Ask Morgan: ${next.text}`;
  if(action.getAttribute('aria-label')!==label)action.setAttribute('aria-label',label);
  bubble.hidden=false;bubble.classList.toggle('is-fading',phase==='fading');
  if(!place(next.anchor,next.kind)){life.dismiss();hide();done();return;}
  tail.style.display='block';tail.classList.toggle('is-fading',phase==='fading');
  if(starting&&life.started!==null){const key=next.key;fadeTimer=setTimeout(()=>{if(context?.key===key){bubble.classList.add('is-fading');tail.classList.add('is-fading')}},2750);endTimer=setTimeout(()=>{if(context?.key===key){life.dismiss();hide();done()}},3000);}
 }, dismiss, destroy(){clearTimers();bubble.remove();tail.remove();} };
}
