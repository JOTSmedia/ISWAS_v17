import {morganHomeAngle} from './morgan-motion.js';
import './popup-behavior.js';
import { createMorganBubbles } from './morgan-bubbles.js';
window.__morganInitialAtLibrary ??= true;
// Morgan's accessible controls remain usable without WebGL.
const morganAtLibrary=()=>(document.documentElement.classList.contains('is-gallery')||window.__morganInitialAtLibrary)&&window.__atLibrary!==false;
const rectOf=el=>{const r=el.getBoundingClientRect();return{left:r.left,top:r.top,width:r.width,height:r.height}};
// Offscreen edge coordinates are used only for flights, never for speech anchoring.
const worldMorganRect=()=>{const p=window.__morganProjection;if(p?.rect&&performance.now()-p.at<250)return p.rect;return{left:-140,top:innerHeight*.35,width:120,height:180}};
let motionId=0;
const avatarImage=()=>(window.__ISWAS_BASE||'/')+'characters/morgan/morgan-mobile.webp';
function installMorgan3D(guide){
 let system=null,angle=0,homeTime=0,last=0,paint=null;const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const setup=async()=>{
  if(system||!window.__morgan3D)return;
  system=window.__morgan3D;if(!await system.ready){system=null;return}
  if(!guide.isConnected)return;
  for(const img of guide.querySelectorAll('img.morgan-corner-avatar,img.morgan-modal-avatar,img.morgan-control-avatar')){
   const canvas=document.createElement('canvas');canvas.className=img.className;canvas.setAttribute('aria-hidden','true');canvas.dataset.morgan3d='true';
   // The existing portrait remains the progressive fallback if WebGL is
   // unavailable or the small avatar context cannot be allocated.
   canvas.style.background=`center bottom / contain no-repeat url("${avatarImage()}")`;
   img.replaceWith(canvas);
  }
 };
 window.addEventListener('morgan-3d-ready',setup,{once:true});setup();
 guide.renderMorgan3D=(now,location)=>{
  if(!system)return;const delta=last?Math.min((now-last)/1000,.1):0;last=now;
  const card=guide.querySelector('#morgan-card'),flight=document.querySelector('canvas.morgan-flight');
  if(location==='home'&&!card.open&&!window.__morganInTransit&&!reduced.matches){homeTime+=delta;angle=morganHomeAngle(homeTime)}
  if(reduced.matches)angle=0;
  const active=flight||(card.open?guide.querySelector('.morgan-modal-avatar'):location==='home'?guide.querySelector('.morgan-corner-avatar'):location==='controls'?guide.querySelector('.morgan-control-avatar'):null);
  if(!active||active.tagName!=='CANVAS')return;
  let rotation=location==='home'&&!card.open?angle:0;
  if(flight){const start=Number(flight.dataset.angle)||0,t=Math.min(1,(now-Number(flight.dataset.started))/950);rotation=start*(1-t);angle=0;homeTime=0}
  window.__morganAvatarAngle=rotation;
  const rect=active.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);
  // A still portrait needs no repeated GPU render or canvas copy. Flights and
  // the rotating home avatar retain their existing update cadence.
  if(!flight&&paint&&paint.canvas===active&&paint.angle===rotation&&paint.dpr===dpr&&paint.width===rect.width&&paint.height===rect.height&&paint.left===rect.left&&paint.top===rect.top)return;
  if(system.renderAvatar(active,rotation)){active.style.background='none';active.dataset.rendered='true';paint={canvas:active,angle:rotation,dpr,width:rect.width,height:rect.height,left:rect.left,top:rect.top}}
 };
}
function flyMorgan(from,to,container=document.body){
 const id=++motionId;const existing=document.querySelector('.morgan-flight');if(existing){const current=rectOf(existing);if(current.width>0)from=current}document.querySelectorAll('.morgan-flight').forEach(el=>el.remove());
 if(!from.width||!to.width||matchMedia('(prefers-reduced-motion: reduce)').matches){window.__morganInTransit=false;document.documentElement.classList.remove('morgan-in-flight');return}
 window.__morganInTransit=true;document.documentElement.classList.add('morgan-in-flight');
 const threeReady=!!window.__morgan3D;const flyer=document.createElement(threeReady?'canvas':'img');
 if(threeReady){flyer.style.background=`center bottom / contain no-repeat url("${avatarImage()}")`;flyer.dataset.angle=String(window.__morganAvatarAngle||0);flyer.dataset.started=String(performance.now());flyer.setAttribute('aria-hidden','true')}
 else{flyer.src=avatarImage();flyer.alt=''}flyer.className='morgan-flight';
 Object.assign(flyer.style,{left:from.left+'px',top:from.top+'px',width:from.width+'px',height:from.height+'px'});container.append(flyer);
 const anim=flyer.animate([{transform:'translate(0,0) scale(1)'},{transform:`translate(${to.left-from.left}px,${to.top-from.top}px) scale(${to.width/from.width},${to.height/from.height})`}],{duration:950,easing:'cubic-bezier(.22,.68,.2,1)',fill:'forwards'});
 anim.onfinish=()=>{flyer.remove();if(id!==motionId)return;window.__morganInTransit=false;document.documentElement.classList.remove('morgan-in-flight')};
}
const controlsIntro='DRAG TO LOOK AROUND. USE MOVE TO WALK. HIDE MINIMIZES.';
const morganLocation=()=>window.__lodgeUnavailable?'home':document.documentElement.classList.contains('is-gallery')&&window.__morganControlsIntro?'controls':morganAtLibrary()?'library':'home';
const morganLocationRect=(guide,location)=>location==='library'?worldMorganRect():rectOf(guide.querySelector(location==='controls'?'.morgan-control-avatar':'.morgan-corner-avatar'));
function installMorganFlight(guide){
 let wasGallery=document.documentElement.classList.contains('is-gallery'),previous=morganLocation(),previousRect=null,last=0,deadline=0,visit=0,libraryVisit=0,wasLibrary=morganAtLibrary();
 function apply(location){guide.classList.toggle('morgan-at-library',location==='library');guide.classList.toggle('morgan-at-controls',location==='controls')}
 const finishControls=()=>{window.__morganControlsIntro=false;deadline=0;if(innerWidth<768){const c=guide.querySelector('.gallery-compass'),t=c?.querySelector('.compass-toggle');c?.classList.add('is-minimized');if(t){t.textContent='SHOW CONTROLS';t.setAttribute('aria-expanded','false')}}};
 guide.finishMorganControls=finishControls;apply(previous);
 function update(now){if(!guide.isConnected)return;requestAnimationFrame(update);if(document.hidden||now-last<32)return;last=now;
  const gallery=document.documentElement.classList.contains('is-gallery');
  if(gallery&&!wasGallery&&!window.__lodgeUnavailable){visit++;deadline=0;window.__morganInitialAtLibrary=false;window.__morganControlsIntro=true;const c=guide.querySelector('.gallery-compass'),t=c?.querySelector('.compass-toggle');c?.classList.remove('is-minimized');if(t){t.textContent='HIDE CONTROLS';t.setAttribute('aria-expanded','true')}}
  else if(!gallery||window.__lodgeUnavailable){window.__morganControlsIntro=false;deadline=0}
  wasGallery=gallery;if(window.__atLibrary===false||window.__lodgeUnavailable)window.__morganInitialAtLibrary=false;
  const library=morganAtLibrary();if(library&&!wasLibrary)libraryVisit++;wasLibrary=library;
  if(window.__morganControlsIntro&&!window.__morganInTransit){deadline||=now+3000;if(now>=deadline)finishControls()}
  const location=morganLocation(),card=guide.querySelector('#morgan-card');
  if(location!==previous){const from=previousRect||morganLocationRect(guide,previous);previous=location;apply(location);if(!card.open)flyMorgan(from,morganLocationRect(guide,location))}
  const rect=morganLocationRect(guide,location);
  if(location!=='library'&&previousRect&&rect.width>0&&!window.__morganInTransit&&!card.open&&(Math.abs(rect.left-previousRect.left)>2||Math.abs(rect.top-previousRect.top)>2))flyMorgan(previousRect,rect);
  if(rect.width>0)previousRect=rect;
  let context=null;
  if(location==='controls'){const img=guide.querySelector('.morgan-control-avatar'),a=rectOf(img);context={key:'controls-'+visit,kind:'controls',text:controlsIntro,anchor:{rect:a,mouth:img.__morganMouth||{x:a.left+a.width*.56,y:a.top+a.height*.132},visible:!card.open&&a.width>0&&a.top>=0&&a.left>=0&&a.left+a.width<=innerWidth&&a.top+a.height<=innerHeight}}}
  else if(location==='library'){const projection=window.__morganProjection,initial=!!window.__morganInitialAtLibrary;context={key:initial?'initial':'library-'+libraryVisit,kind:initial?'initial':'library',text:initial?'WELCOME. CHOOSE A SECTION OR ENTER 360 MODE.':'NEED A HAND? ASK MORGAN.',anchor:projection&&now-projection.at<250?projection:null}}
  guide.morganBubbles?.update(context,now);guide.renderMorgan3D?.(now,location);
 }
 requestAnimationFrame(update);
}
const boot=()=>{if(!window.__ISWAS_READY||window.__morganGuideMounted)return;window.__morganGuideMounted=true;
 const guide=document.createElement('aside');guide.id='morgan-guide';guide.setAttribute('aria-label','Morgan, your gallery guide');
 guide.innerHTML=`<button class="morgan-summon" aria-expanded="false" aria-controls="morgan-card" aria-label="Ask Morgan, your gallery guide"><img class="morgan-corner-avatar" alt="" draggable="false"><span class="morgan-avatar-caption">ASK MORGAN</span></button><dialog id="morgan-card" hidden aria-label="Ask Morgan"><img class="morgan-modal-avatar" alt="Morgan, your guide" draggable="false"><div class="morgan-heading"><span>The Old Dark House · Gallery guide</span><button aria-label="Close Morgan’s guide" class="morgan-close">×</button></div><h2>Allow me to show you around.</h2><p id="morgan-copy" aria-live="polite">I am Morgan, keeper of the library. Choose any numbered section above. The room glides into position, then holds while you read. Scroll the text at your own pace.</p><div class="morgan-actions"><button data-tip="tour">The tour</button><button data-tip="gallery">360 controls</button><button data-tip="objects">The collection</button></div><div class="morgan-actions"><button class="morgan-pause" aria-pressed="false">Pause tour</button><button class="morgan-visit">Find me by the library</button></div></dialog>`;
 document.body.appendChild(guide);guide.querySelectorAll('.morgan-corner-avatar,.morgan-modal-avatar').forEach(img=>img.src=(window.__ISWAS_BASE||'/')+'characters/morgan/morgan-mobile.webp');installMorganFlight(guide);const card=guide.querySelector('#morgan-card'),summon=guide.querySelector('.morgan-summon'),copy=guide.querySelector('#morgan-copy');
 function show(open){
  if(!guide.isConnected||open===card.open)return;
  const modalAvatar=card.querySelector('.morgan-modal-avatar');
  if(open){const from=morganLocationRect(guide,morganLocation());card.hidden=false;card.setAttribute('role','dialog');card.showModal();guide.classList.add('morgan-guide-open');window.__morganVisible=true;flyMorgan(from,rectOf(modalAvatar),card);}
  else{const currentFlight=guide.querySelector('.morgan-flight'),from=currentFlight?rectOf(currentFlight):rectOf(modalAvatar);card.close();card.hidden=true;card.removeAttribute('role');guide.classList.remove('morgan-guide-open');window.__morganVisible=false;flyMorgan(from,morganLocationRect(guide,morganLocation()));}
  summon.setAttribute('aria-expanded',String(open));
 }
 summon.onclick=()=>show(!card.open);window.addEventListener('morgan-open',()=>show(true));guide.querySelector('.morgan-close').onclick=()=>{show(false);if(!document.documentElement.classList.contains('is-gallery'))summon.focus()};
 card.addEventListener('cancel',ev=>{ev.preventDefault();show(false)});
 card.addEventListener('click',ev=>{if(ev.target===card){const r=card.getBoundingClientRect();if(ev.clientX<r.left||ev.clientX>r.right||ev.clientY<r.top||ev.clientY>r.bottom)show(false)}});
 guide.morganBubbles=createMorganBubbles({guide,onAction:()=>show(true),onDone:kind=>{if(kind==='controls')guide.finishMorganControls?.()}});
 const compass=document.createElement('div');compass.className='gallery-compass';compass.setAttribute('role','group');compass.setAttribute('aria-label','Gallery controls');
 const look=document.createElement('div');look.className='compass-look';look.setAttribute('role','group');look.setAttribute('aria-label','Look around');
 const title=document.createElement('span');title.className='compass-title';title.textContent='LOOK';look.append(title);
 const lookDirections=[['↑','UP','Look up',{pitch:.18},'up'],['←','LEFT','Look left',{yaw:-.28},'left'],['↺','RESET','Reset view',{reset:true},'reset'],['→','RIGHT','Look right',{yaw:.28},'right'],['↓','DOWN','Look down',{pitch:-.18},'down']];
 const addControl=(parent,symbol,label,accessible,detail,position)=>{const b=document.createElement('button');b.type='button';b.className='compass-'+position;b.setAttribute('aria-label',accessible);b.title=accessible;const icon=document.createElement('span');icon.textContent=symbol;icon.setAttribute('aria-hidden','true');const text=document.createElement('span');text.className='compass-button-label';text.textContent=label;b.append(icon,text);b.onclick=()=>window.dispatchEvent(new CustomEvent('gallery-direction',{detail}));parent.append(b)};
 for(const [symbol,label,accessible,detail,position]of lookDirections)addControl(look,symbol,label,accessible,detail,position);compass.append(look);
 const move=document.createElement('div');move.className='compass-move';move.setAttribute('role','group');move.setAttribute('aria-label','Move through gallery');const caption=document.createElement('span');caption.className='compass-move-title';caption.textContent='MOVE';move.append(caption);
 for(const [symbol,label,accessible,detail,position]of [['←','LEFT','Move left',{travel:-1},'move-left'],['↓','BACK','Move backward',{depth:-.7},'back'],['↑','AHEAD','Move forward',{depth:.7},'ahead'],['→','RIGHT','Move right',{travel:1},'move-right']])addControl(move,symbol,label,accessible,detail,position);compass.append(move);const toggle=document.createElement('button');toggle.className='compass-toggle';toggle.type='button';toggle.textContent='HIDE CONTROLS';toggle.setAttribute('aria-expanded','true');toggle.onclick=()=>{const minimized=compass.classList.toggle('is-minimized');toggle.textContent=minimized?'SHOW CONTROLS':'HIDE CONTROLS';toggle.setAttribute('aria-expanded',String(!minimized))};compass.append(toggle);const perch=document.createElement('button');perch.className='morgan-control-perch';perch.setAttribute('aria-label','Ask Morgan about the direction controls');const character=document.createElement('img');character.className='morgan-control-avatar';character.alt='';character.src=(window.__ISWAS_BASE||'/')+'characters/morgan/morgan-mobile.webp';perch.append(character);perch.onclick=()=>show(true);compass.append(perch);guide.append(compass);
 installMorgan3D(guide);
 const mast=document.querySelector('.mast');if(mast){const setMast=()=>document.documentElement.style.setProperty('--morgan-mast-height',mast.getBoundingClientRect().bottom+'px');setMast();new ResizeObserver(setMast).observe(mast);} const footer=document.querySelector('.site-footer');if(footer){const setFooter=()=>document.documentElement.style.setProperty('--morgan-footer-height',footer.getBoundingClientRect().height+'px');setFooter();const resize=new ResizeObserver(setFooter);resize.observe(footer);}
 const tips={tour:'Choose a section in the navigation, or let the tour move through all seven stops. Each stop holds for 14 seconds. Pause the tour for as long as you like. Scrolling never moves the text automatically.',gallery:'Select 360 MODE below to explore the room. Use the circular direction control to move forward or back, move sideways, or look up, down, left and right. The center resets your view. Click and drag anywhere in the gallery to look around. HIDE CONTROLS collapses the control; SHOW CONTROLS brings it back. Select Return to site to read the presentation again.',objects:'Select a portrait or a book in the library to open its story. Close the story to return to the gallery. Some objects are decorative; keep an eye out for the hidden shrine.'};
 guide.querySelectorAll('[data-tip]').forEach(b=>b.onclick=()=>copy.textContent=tips[b.dataset.tip]);
 guide.querySelector('.morgan-pause').onclick=e=>{window.__v9Paused=!window.__v9Paused;window.__tourUntil=performance.now()+14000;e.target.textContent=window.__v9Paused?'Resume tour':'Pause tour';e.target.setAttribute('aria-pressed',String(window.__v9Paused))};
 guide.querySelector('.morgan-visit').onclick=()=>{show(false);window.dispatchEvent(new Event('morgan-visit'))};
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&card.open){show(false);if(!document.documentElement.classList.contains('is-gallery'))summon.focus()}});
 document.addEventListener('pointerdown',e=>{if(!guide.contains(e.target))window.__tourUntil=performance.now()+14000},{passive:true});document.addEventListener('wheel',()=>window.__tourUntil=performance.now()+14000,{passive:true});
};
window.addEventListener('iswas-ready',boot,{once:true});
if(window.__ISWAS_READY)queueMicrotask(boot);
// A shared request and one dialog prevent duplicate catalogues on slow connections.
let cataloguePromise=null,catalogueDialog=null;
function loadCatalogue(){if(window.__variety)return Promise.resolve(window.__variety);return cataloguePromise??=fetch((window.__ISWAS_BASE||'/')+'data/variety.json').then(r=>{if(!r.ok)throw Error('Library unavailable');return r.json()}).then(rows=>{if(!Array.isArray(rows)||rows.length!==100)throw Error('Invalid library data');window.__variety=rows;return rows}).catch(error=>{cataloguePromise=null;throw error})}
window.addEventListener('library-catalogue',()=>{
 if(catalogueDialog?.isConnected){catalogueDialog.focus();return}
 window.dispatchEvent(new Event('morgan-visit'));
 const dialog=document.createElement('dialog');catalogueDialog=dialog;dialog.className='library-catalogue';dialog.setAttribute('aria-label','Library catalogue');
 const header=document.createElement('div');header.className='library-catalogue-header';const heading=document.createElement('h2');heading.textContent='THE LIBRARY';const close=document.createElement('button');close.type='button';close.textContent='CLOSE LIBRARY';close.onclick=()=>dialog.close();header.append(heading,close);dialog.append(header);
 const search=document.createElement('input');search.type='search';search.placeholder='FIND A MOVIE';search.setAttribute('aria-label','Find a movie in the library');search.disabled=true;dialog.append(search);
 const list=document.createElement('div');list.className='library-list';const status=document.createElement('p');status.textContent='LOADING LIBRARY…';status.setAttribute('role','status');list.append(status);dialog.append(list);
 const populate=()=>{status.textContent='LOADING LIBRARY…';loadCatalogue().then(rows=>{if(!dialog.isConnected)return;list.replaceChildren();for(const row of rows){const button=document.createElement('button');button.type='button';button.textContent=String(row[0]).padStart(2,'0')+' · '+row[1]+' ('+row[2]+')';button.dataset.title=row[1].toLowerCase();button.onclick=()=>{dialog.close();window.dispatchEvent(new CustomEvent('open-tome',{detail:'book-afi-'+String(row[0]).padStart(3,'0')}))};list.append(button)}search.disabled=false;if(innerWidth>=768)search.focus();else close.focus({preventScroll:true})}).catch(()=>{if(!dialog.isConnected)return;list.replaceChildren(status);status.textContent='THE LIBRARY COULD NOT LOAD. PLEASE TRY AGAIN.';const retry=document.createElement('button');retry.type='button';retry.textContent='TRY AGAIN';retry.onclick=()=>{retry.remove();populate()};list.append(retry)})};
 search.oninput=()=>list.querySelectorAll('[data-title]').forEach(button=>button.hidden=!button.dataset.title.includes(search.value.toLowerCase()));
 dialog.addEventListener('close',()=>{dialog.remove();if(catalogueDialog===dialog)catalogueDialog=null},{once:true});document.body.append(dialog);dialog.showModal();populate();
});
