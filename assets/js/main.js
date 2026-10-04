// Site behaviour: navigation, header state, scroll reveals, gallery, 3D tour hooks, forms
(function(){
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Navigation
  const navToggle = document.querySelector('[data-menu-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  if(navToggle && navLinks){
    const menuLabel = navToggle.querySelector('.menu-toggle-label');
    const setOpen = (open)=>{
      navLinks.classList.toggle('open', open);
      document.body.classList.toggle('nav-open', open);
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(menuLabel){ menuLabel.textContent = open ? 'Close' : 'Menu'; }
    };
    navToggle.addEventListener('click', ()=> setOpen(!navLinks.classList.contains('open')));
    navLinks.querySelectorAll('a').forEach((link)=> link.addEventListener('click', ()=> setOpen(false)));
    document.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') setOpen(false); });
    window.matchMedia('(min-width: 761px)').addEventListener('change', (e)=>{ if(e.matches) setOpen(false); });
  }

  // ---------- Footer year
  const y = document.querySelector('[data-year]');
  if(y){ y.textContent = String(new Date().getFullYear()); }

  // ---------- Contact form (opens the visitor's mail app, addressed to the trust)
  const form = document.querySelector('[data-contact-form]');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const name = String(fd.get('name') || '');
      const email = String(fd.get('email') || '');
      const message = String(fd.get('message') || '');
      const subject = `Enquiry from ${name || 'Goshala Website'}`;
      const body = `Name: ${name}\nEmail: ${email}\n\n${message}`;
      window.location.href = `mailto:surabhigomaata@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    });
  }

  // ---------- Header: transparent over the hero, solid after it
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('.hero-full');
  if(header){
    if(hero && 'IntersectionObserver' in window){
      const io = new IntersectionObserver((entries)=>{
        entries.forEach((entry)=> header.classList.toggle('is-solid', !entry.isIntersecting || entry.intersectionRatio < 0.88));
      }, { threshold:[0, 0.88, 1] });
      io.observe(hero);
    }else{
      const onScroll = ()=> header.classList.toggle('is-solid', window.scrollY > 24);
      onScroll();
      window.addEventListener('scroll', onScroll, { passive:true });
    }
  }

  // ---------- Scroll reveal (progressive enhancement: content is visible without JS)
  const revealTargets = document.querySelectorAll([
    '.section .section-title', '.section .section-desc', '.card', '.card-panel', '.immersive-card',
    '.program-item', '.mini-card', '.mission-card', '.benefit-item', '.project-item', '.objective-item',
    '.family-tree-container', '.family-tree-image-wrapper', '.timeline-item', '.cta-band', '.contact-map',
    '.carousel', '.page-hero .container > *', '.invitation', '.donation-tier'
  ].join(','));
  if('IntersectionObserver' in window && !reduceMotion){
    const rio = new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        if(entry.isIntersecting){ entry.target.classList.add('is-in'); rio.unobserve(entry.target); }
      });
    }, { rootMargin:'0px 0px -8% 0px', threshold:0.08 });
    revealTargets.forEach((el, i)=>{
      el.classList.add('reveal');
      el.style.setProperty('--reveal-delay', `${(i % 3) * 70}ms`);
      rio.observe(el);
    });
  }

  // ---------- Gallery (native scroll-snap, buttons + dots enhance it)
  document.querySelectorAll('[data-carousel]').forEach((carousel)=>{
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = Array.from(track.children);
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const dotsEl = carousel.querySelector('[data-carousel-dots]');
    track.tabIndex = 0;
    track.setAttribute('role', 'region');
    track.setAttribute('aria-label', 'Photo gallery, scroll horizontally');

    const slideStep = ()=>{
      const a = slides[0], b = slides[1];
      return b ? b.offsetLeft - a.offsetLeft : a.offsetWidth;
    };
    const current = ()=> Math.round(track.scrollLeft / Math.max(1, slideStep()));
    const goTo = (i)=> track.scrollTo({ left: Math.max(0, Math.min(slides.length-1, i)) * slideStep(), behavior: reduceMotion ? 'auto' : 'smooth' });

    // compact dots: show a rolling window so 25 photos do not overflow on phones
    const counter = document.createElement('span');
    counter.className = 'carousel-count';
    counter.setAttribute('aria-live', 'polite');
    dotsEl.appendChild(counter);

    function update(){
      const i = current();
      counter.textContent = `${i+1} / ${slides.length}`;
      if(prev) prev.disabled = track.scrollLeft <= 2;
      if(next) next.disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    }
    let ticking = false;
    track.addEventListener('scroll', ()=>{
      if(ticking) return; ticking = true;
      requestAnimationFrame(()=>{ ticking = false; update(); });
    }, { passive:true });
    prev?.addEventListener('click', ()=> goTo(current()-1));
    next?.addEventListener('click', ()=> goTo(current()+1));
    track.addEventListener('keydown', (e)=>{
      if(e.key === 'ArrowRight'){ e.preventDefault(); goTo(current()+1); }
      if(e.key === 'ArrowLeft'){ e.preventDefault(); goTo(current()-1); }
    });
    window.addEventListener('resize', update, { passive:true });
    update();
  });

  // ---------- Sticky donate button on phones (not on the donate page, not over the hero)
  if(!/donate\.html$/.test(location.pathname)){
    const cta = document.createElement('a');
    cta.className = 'sticky-donate';
    cta.href = 'donate.html';
    cta.textContent = 'Donate';
    document.body.appendChild(cta);
    const upd = ()=> cta.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.7);
    upd();
    window.addEventListener('scroll', upd, { passive:true });
  }

  // ---------- 3D tour hooks (hero chips + "See it in 3D" buttons)
  const chips = document.querySelectorAll('.tour-chip');
  const focus = (name)=>{
    window.dispatchEvent(new CustomEvent('goshala:focus', { detail:{ name } }));
    chips.forEach((c)=> c.classList.toggle('is-active', c.dataset.focus === name));
  };
  chips.forEach((chip)=> chip.addEventListener('click', ()=> focus(chip.dataset.focus)));
  document.querySelectorAll('[data-focus-jump]').forEach((btn)=>{
    btn.addEventListener('click', ()=>{
      window.scrollTo({ top:0, behavior: reduceMotion ? 'auto' : 'smooth' });
      setTimeout(()=> focus(btn.dataset.focusJump), reduceMotion ? 0 : 350);
    });
  });
})();


document.querySelectorAll('.triangle-board').forEach(board => {
  const vertices = board.querySelectorAll('.vertex');

  function closeAll() {
    board.querySelectorAll('.popup').forEach(p => p.removeAttribute('data-open'));
    vertices.forEach(v=>v.setAttribute('aria-expanded','false'));
  }

  vertices.forEach(v => {
    v.addEventListener('click', e => {
      const id = v.dataset.popup;
      const popup = board.querySelector('#' + id);
      const isOpen = popup.getAttribute('data-open') === 'true';
      closeAll();
      if (!isOpen) {
        popup.setAttribute('data-open', 'true');
        v.setAttribute('aria-expanded','true');
        const vb = board.getBoundingClientRect();
        const vx = (parseFloat(v.style.getPropertyValue('--vx')) / 200) * vb.width;
        const vy = (parseFloat(v.style.getPropertyValue('--vy')) / 180) * vb.height;
        
        // Calculate popup position relative to viewport
        const popupLeft = vb.left + vx + 20;
        const popupTop = vb.top + vy + 20;
        
        // Get popup dimensions after it's shown
        popup.style.left = popupLeft + 'px';
        popup.style.top = popupTop + 'px';
        
        // Force a reflow to get actual popup dimensions
        popup.offsetHeight;
        const pb = popup.getBoundingClientRect();
        
        // Adjust position to stay within viewport
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const margin = 16;
        
        let finalLeft = popupLeft;
        let finalTop = popupTop;
        
        // Check right boundary
        if (pb.right > viewportWidth - margin) {
          finalLeft = viewportWidth - pb.width - margin;
        }
        
        // Check left boundary
        if (finalLeft < margin) {
          finalLeft = margin;
        }
        
        // Check bottom boundary
        if (pb.bottom > viewportHeight - margin) {
          finalTop = viewportHeight - pb.height - margin;
        }
        
        // Check top boundary
        if (finalTop < margin) {
          finalTop = margin;
        }
        
        popup.style.left = finalLeft + 'px';
        popup.style.top = finalTop + 'px';
      }
    });
  });

  document.addEventListener('click', e => {
    if (!board.contains(e.target)) closeAll();
  });

  board.addEventListener('keydown', e => {
    if(e.key === 'Escape'){
      closeAll();
      vertices.forEach(v=>v.blur());
    }
  });

  // Reposition popups on window resize
  window.addEventListener('resize', () => {
    const openPopup = board.querySelector('.popup[data-open="true"]');
    if (openPopup) {
      const activeVertex = board.querySelector('.vertex[aria-expanded="true"]');
      if (activeVertex) {
        // Trigger a reposition by simulating a click
        activeVertex.click();
      }
    }
  });
});


