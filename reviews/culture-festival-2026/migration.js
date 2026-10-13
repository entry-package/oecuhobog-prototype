/* Local replacements for the original site's presentation-only widgets. */
(()=>{
 function previewMessage(el){
  if(!el)return;
  if(window.OecuhobogReceiver){window.OecuhobogReceiver.submitElement(el);return;}
  let note=el.querySelector('[role=status]');
  if(!note){note=document.createElement('p');note.setAttribute('role','status');el.append(note);}
  if(el.matches('.s-email-form')||el.closest('.s-email-form')){
   note.textContent='フォームでの受付は現在準備中です。メールでお問い合わせください：';
   const link=document.createElement('a');link.href='mailto:info@package-inc.com';link.textContent='info@package-inc.com';note.append(link);
  }else if(el.matches('.s-blog-subscription')||el.closest('.s-blog-subscription')){
   note.textContent='読者登録の新規受付は現在停止しています。登録は完了していません。';
  }else{
   note.textContent='コメントの新規受付は現在停止しています。投稿は送信されていません。';
  }
 }
 document.querySelectorAll('form').forEach(form=>form.addEventListener('submit',e=>{e.preventDefault();previewMessage(form);}));
 document.querySelectorAll('.s-email-form-button,.s-blog-subscribe-btn,.s-blog-comment-form .commit-button').forEach(button=>button.addEventListener('click',e=>{e.preventDefault();previewMessage(button.closest('.s-email-form,form,.s-blog-subscription,.s-blog-comment-form'));}));
 document.querySelectorAll('.s-blog-comment-form textarea').forEach(el=>el.addEventListener('focus',()=>el.closest('form').classList.add('expanded')));
 document.querySelectorAll('.cancel-button').forEach(el=>el.addEventListener('click',()=>el.closest('form')?.classList.remove('expanded')));
 document.querySelectorAll('[data-paginated]').forEach(list=>{
  const count=Number(list.dataset.paginated);const cards=[...list.children];let visible=count;
  const button=list.closest('.s-blog').querySelector('.s-blog-col-foot .s-common-button');
  function update(){cards.forEach((card,i)=>card.hidden=i>=visible);if(button)button.hidden=visible>=cards.length;}
  if(button){button.setAttribute('role','button');button.tabIndex=0;button.addEventListener('click',()=>{visible+=count;update();});button.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();button.click();}});}update();
 });
 document.querySelectorAll('.s-blog:not(:has([data-paginated])) .s-blog-col-foot .s-common-button').forEach(button=>{
  button.setAttribute('role','link');button.tabIndex=0;
  const home=document.querySelector('.s-nav a[href]')?.getAttribute('href')||'index.html';
  function open(){location.href=new URL('_blog/index.html#_blog',new URL(home,location.href)).href;}
  button.addEventListener('click',open);button.addEventListener('keydown',e=>{if(e.key==='Enter')open();});
 });
 document.querySelectorAll('.s-slider').forEach(slider=>{
  const track=slider.querySelector('.slick-track');if(!track)return;
  const slides=[...track.children],dots=[...slider.querySelectorAll('.selector')];let current=0;
  function show(index){current=(index+slides.length)%slides.length;track.style.left=`${-100*current}%`;slides.forEach((s,i)=>{s.classList.toggle('slick-current',i===current);s.classList.toggle('slick-active',i===current);s.setAttribute('aria-hidden',String(i!==current));});dots.forEach((d,i)=>d.classList.toggle('selected',i===current));}
  for(const [selector,step] of [['.prev-button',-1],['.next-button',1]])slider.querySelectorAll(selector).forEach(button=>{button.setAttribute('role','button');button.tabIndex=0;button.setAttribute('aria-label',step<0?'前の写真':'次の写真');button.addEventListener('click',()=>show(current+step));button.addEventListener('keydown',e=>{if(e.key==='Enter')show(current+step);});});
  dots.forEach((dot,i)=>{dot.tabIndex=0;dot.setAttribute('role','button');dot.setAttribute('aria-label',`写真 ${i+1}`);dot.addEventListener('click',()=>show(i));dot.addEventListener('keydown',e=>{if(e.key==='Enter')show(i);});});
  let start=0;slider.addEventListener('touchstart',e=>{start=e.changedTouches[0].clientX;},{passive:true});slider.addEventListener('touchend',e=>{const dx=e.changedTouches[0].clientX-start;if(Math.abs(dx)>40)show(current+(dx<0?1:-1));},{passive:true});
 });
 const header=document.querySelector('.s-navbar-mobile-header');
 if(header){header.setAttribute('role','button');header.tabIndex=0;header.setAttribute('aria-label','メニュー');header.setAttribute('aria-expanded','false');const toggle=()=>{const open=document.body.classList.toggle('migration-menu-open');header.setAttribute('aria-expanded',String(open));};header.addEventListener('click',toggle);header.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}});document.querySelectorAll('.s-navbar-desktop a').forEach(a=>a.addEventListener('click',()=>{document.body.classList.remove('migration-menu-open');header.setAttribute('aria-expanded','false');}));}
 document.querySelectorAll('.s-image img[data-image-link]').forEach(img=>{if(img.dataset.imageLink){img.style.cursor='pointer';img.addEventListener('click',()=>window.open(img.dataset.imageLink,'_blank','noopener'));}});
})();
