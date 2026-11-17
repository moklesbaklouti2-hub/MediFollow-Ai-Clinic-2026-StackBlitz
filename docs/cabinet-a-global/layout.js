() => {
  const fields=[...document.querySelectorAll('#contenu-principal input,#contenu-principal select,#contenu-principal textarea')].filter(e=>e.checkVisibility()&&e.type!=='file').map(e=>{
    const b=e.getBoundingClientRect(),label=e.closest('label'),target=(e.type==='checkbox'||e.type==='radio')&&label?label.getBoundingClientRect():b;
    return {tag:e.tagName,type:e.type,name:e.getAttribute('aria-label')||[...(e.labels||[])].map(l=>l.textContent.trim()).join(' '),font:parseFloat(getComputedStyle(e).fontSize),width:b.width,height:b.height,targetWidth:target.width,targetHeight:target.height};
  });
  const buttons=[...document.querySelectorAll('#contenu-principal button,#contenu-principal summary')].filter(e=>e.checkVisibility()).map(e=>{const b=e.getBoundingClientRect();return {label:e.textContent.trim().slice(0,70),width:b.width,height:b.height};});
  const ids=[...document.querySelectorAll('[id]')].map(e=>e.id);
  const orb=document.querySelector('.mf-orb-assistant').getBoundingClientRect(),nav=document.querySelector('#cabinet-navigation'),n=nav.getBoundingClientRect(),main=document.querySelector('#contenu-principal').getBoundingClientRect();
  const assistantDocked=nav.dataset.mode==='drawer'?orb.left>=n.left&&orb.right<=n.right+1&&orb.top>=n.top-1&&orb.bottom<=n.bottom+1:orb.right<=main.left&&orb.top>=document.querySelector('.sidebar').getBoundingClientRect().bottom-1;
  const brand=document.querySelector('.cabinet-mobile-brand'),brandClear=!brand||brand.getBoundingClientRect().right<=orb.left;
  return {overflow:document.documentElement.scrollWidth>innerWidth,duplicateIds:ids.filter((v,i,a)=>a.indexOf(v)!==i),fields,buttons,assistantDocked,brandClear,orbBox:{x:orb.x,y:orb.y,width:orb.width,height:orb.height},prototypeVisible:document.querySelector('.premium-status').checkVisibility(),storageVisible:document.querySelector('.header-date small').checkVisibility()};
}
