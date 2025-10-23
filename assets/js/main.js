// Small JS for navigation toggle and simple UX niceties
(function(){
  const navToggle = document.querySelector('[data-menu-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  if(navToggle && navLinks){
    const menuLabel = navToggle.querySelector('.menu-toggle-label');
    navToggle.addEventListener('click',()=>{
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if(menuLabel){ menuLabel.textContent = open ? 'Close' : 'Menu'; }
    });
    navLinks.querySelectorAll('a').forEach((link)=>{
      link.addEventListener('click', ()=>{
        if(navLinks.classList.contains('open')){
          navLinks.classList.remove('open');
          navToggle.setAttribute('aria-expanded','false');
          if(menuLabel){ menuLabel.textContent = 'Menu'; }
        }
      });
    });
    const navDesktopQuery = window.matchMedia('(min-width: 761px)');
    navDesktopQuery.addEventListener('change', (event)=>{
      if(event.matches && navLinks.classList.contains('open')){
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded','false');
        if(menuLabel){ menuLabel.textContent = 'Menu'; }
      }
    });
  }

  // Update footer year
  const y = document.querySelector('[data-year]');
  if(y){ y.textContent = String(new Date().getFullYear()); }

  // Contact form handler (mailto fallback)
  const form = document.querySelector('[data-contact-form]');
  if(form){
    form.addEventListener('submit', (e)=>{
      e.preventDefault();
      const fd = new FormData(form);
      const name = encodeURIComponent(fd.get('name')||'');
      const email = encodeURIComponent(fd.get('email')||'');
      const message = encodeURIComponent(fd.get('message')||'');
      const subject = `Enquiry from ${decodeURIComponent(name) || 'Goshala Website'}`;
      const body = `Name: ${decodeURIComponent(name)}%0AEmail: ${decodeURIComponent(email)}%0A%0A${decodeURIComponent(message)}`;
      const mailto = `mailto:hello@goshala.example?subject=${encodeURIComponent(subject)}&body=${body}`;
      window.location.href = mailto;
    });
  }

  // Simple Carousel
  document.querySelectorAll('[data-carousel]').forEach((carousel)=>{
    const track = carousel.querySelector('[data-carousel-track]');
    const slides = Array.from(track.children);
    const prev = carousel.querySelector('[data-carousel-prev]');
    const next = carousel.querySelector('[data-carousel-next]');
    const dotsEl = carousel.querySelector('[data-carousel-dots]');
    let index = 0;
    let autoTimer;

    // Decorative backdrop from image source
    slides.forEach((slide)=>{
      const img = slide.querySelector('img');
      if(img){
        const src = img.currentSrc || img.getAttribute('src');
        if(src){ slide.style.setProperty('--photo', `url("${src}")`); }
      }
    });

    // Dots
    slides.forEach((_,i)=>{
      const b = document.createElement('button');
      b.className = 'carousel-dot';
      b.type = 'button';
      b.setAttribute('aria-label', `Go to slide ${i+1}`);
      b.addEventListener('click',()=>go(i));
      dotsEl.appendChild(b);
    });
    const dots = Array.from(dotsEl.children);

    function update(){
      track.style.transform = `translateX(-${index*100}%)`;
      dots.forEach((d,i)=>d.toggleAttribute('aria-current', i===index));
      if(prev) prev.disabled = index===0;
      if(next) next.disabled = index===slides.length-1;
    }
    function go(i){ index = Math.max(0, Math.min(slides.length-1, i)); update(); restartAuto(); }
    function nextSlide(){ go(index+1 <= slides.length-1 ? index+1 : 0); }
    function prevSlide(){ go(index-1 >= 0 ? index-1 : slides.length-1); }

    prev?.addEventListener('click', prevSlide);
    next?.addEventListener('click', nextSlide);

    // Auto-play
    function restartAuto(){
      clearInterval(autoTimer);
      autoTimer = setInterval(nextSlide, 6000);
    }
    restartAuto();

    // Keyboard
    carousel.addEventListener('keydown', (e)=>{
      if(e.key==='ArrowRight'){ nextSlide(); }
      if(e.key==='ArrowLeft'){ prevSlide(); }
    });
    carousel.tabIndex = 0;

    // Touch swipe
    let startX=0, dx=0;
    track.addEventListener('touchstart',(e)=>{startX=e.touches[0].clientX;clearInterval(autoTimer);},{passive:true});
    track.addEventListener('touchmove',(e)=>{dx=e.touches[0].clientX-startX;},{passive:true});
    track.addEventListener('touchend',()=>{
      if(Math.abs(dx)>40){ dx>0 ? prevSlide() : nextSlide(); }
      dx=0; restartAuto();
    });

    update();
  });

  const header = document.querySelector('[data-header]');
  const heroContent = document.querySelector('[data-hero-content]');
  const mobileHeroEligible = !!(heroContent && header);

  const mobileHeroQuery = window.matchMedia('(max-width: 760px)');
  let mobileHeroRevealAttached = false;
  function setMobileHeroHidden(hidden){
    if(!mobileHeroEligible) return;
    if(hidden){
      if(!mobileHeroQuery.matches) return;
      header.classList.add('mobile-hero-hidden');
      heroContent.classList.add('mobile-hero-hidden');
    }else{
      header.classList.remove('mobile-hero-hidden');
      heroContent.classList.remove('mobile-hero-hidden');
    }
  }
  function onMobileHeroScroll(){
    if(window.scrollY > window.innerHeight * 0.28){
      setMobileHeroHidden(false);
      window.removeEventListener('scroll', onMobileHeroScroll);
      mobileHeroRevealAttached = false;
    }
  }
  function applyMobileHeroMode(active){
    if(!mobileHeroEligible) return;
    if(active){
      setMobileHeroHidden(true);
      if(!mobileHeroRevealAttached){
        window.addEventListener('scroll', onMobileHeroScroll, { passive:true });
        mobileHeroRevealAttached = true;
        onMobileHeroScroll();
      }
    }else{
      setMobileHeroHidden(false);
      if(mobileHeroRevealAttached){
        window.removeEventListener('scroll', onMobileHeroScroll);
        mobileHeroRevealAttached = false;
      }
    }
  }
  applyMobileHeroMode(mobileHeroQuery.matches);
  mobileHeroQuery.addEventListener('change', (event)=>applyMobileHeroMode(event.matches));

  // Header transparency toggle
  const hero = document.querySelector('.hero-full');
  if(header && hero && 'IntersectionObserver' in window){
    const observer = new IntersectionObserver((entries)=>{
      entries.forEach((entry)=>{
        header.classList.toggle('is-solid', !entry.isIntersecting);
      });
    }, { rootMargin: `-${parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')||'60',10)+10}px 0px 0px 0px`, threshold:0 });
    observer.observe(hero);
  } else if(header){
    const onScroll = ()=>{
      header.classList.toggle('is-solid', window.scrollY > 24);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive:true });
  }
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


