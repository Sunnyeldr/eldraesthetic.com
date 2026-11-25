
(()=>{const reduce=matchMedia('(prefers-reduced-motion: reduce)'); if(reduce.matches||!('IntersectionObserver' in window))return;
const targets=[...document.querySelectorAll('.heading,.featured,.release,.videos > .video,.stack .video,.profile,.lower,details,main > .section:last-child > *')];
const observer=new IntersectionObserver(entries=>{for(const entry of entries){if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target)}}},{threshold:.08,rootMargin:'0px 0px -8px 0px'});
for(const el of targets){el.classList.add('reveal');if(el.matches('.release'))el.style.setProperty('--delay',((Array.from(el.parentElement.children).indexOf(el)%4)*65)+'ms');if(el.getBoundingClientRect().top<innerHeight)el.classList.add('is-visible');else observer.observe(el)}
document.documentElement.classList.add('motion-ready');
const hero=document.querySelector('.hero'); let queued=false;function update(){queued=false;const y=Math.max(0,scrollY);hero.style.setProperty('--hero-shift',Math.min(30,y*.065)+'px')};function onScroll(){if(!queued){queued=true;requestAnimationFrame(update)}};addEventListener('scroll',onScroll,{passive:true});update();
reduce.addEventListener?.('change',e=>{if(e.matches){observer.disconnect();document.documentElement.classList.remove('motion-ready');removeEventListener('scroll',onScroll);hero.style.removeProperty('--hero-shift')}});
})();
