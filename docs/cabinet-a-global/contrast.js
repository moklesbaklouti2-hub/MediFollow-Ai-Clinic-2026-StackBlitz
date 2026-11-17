() => {
  const color = value => {
    const nums=(value.match(/[\d.]+/g)||[]).map(Number),scale=value.startsWith('color(')?255:1;
    return {r:nums[0]*scale||0,g:nums[1]*scale||0,b:nums[2]*scale||0,a:nums.length>3?nums[3]:1};
  };
  const over=(a,b)=>({r:a.r*a.a+b.r*(1-a.a),g:a.g*a.a+b.g*(1-a.a),b:a.b*a.a+b.b*(1-a.a),a:1});
  const background=e=>{if(!e)return {r:255,g:255,b:255,a:1};const c=color(getComputedStyle(e).backgroundColor);return c.a>=1?c:over(c,background(e.parentElement));};
  const lum=c=>[c.r,c.g,c.b].map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);
  const failures=[],seen=new Set();
  for(const e of document.querySelectorAll('#cabinet-app p,#cabinet-app span,#cabinet-app small,#cabinet-app strong,#cabinet-app label,#cabinet-app td,#cabinet-app th,#cabinet-app h1,#cabinet-app h2,#cabinet-app h3,#cabinet-app h4')){
    if(e.closest('[aria-hidden=true]')||!e.checkVisibility()||!e.childNodes.length||![...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||e.closest(':disabled')||e.getBoundingClientRect().width===0)continue;
    const style=getComputedStyle(e),bg=background(e),fg=over(color(style.color),bg),a=lum(bg),b=lum(fg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),size=parseFloat(style.fontSize),weight=parseFloat(style.fontWeight),threshold=size>=24||size>=18.67&&weight>=700?3:4.5;
    if(ratio+.01<threshold){const key=e.tagName+'.'+e.className+style.color+style.backgroundColor;if(!seen.has(key)){failures.push({element:e.tagName+'.'+e.className,text:e.textContent.replace(/\s+/g,' ').trim().slice(0,90),color:style.color,background:bg,ratio:Math.round(ratio*100)/100});seen.add(key);}}
  }
  return failures;
}
