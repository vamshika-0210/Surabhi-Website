// Small JS for navigation toggle and simple UX niceties
(function(){
  const navToggle = document.querySelector('[data-menu-toggle]');
  const navLinks = document.querySelector('[data-nav-links]');
  if(navToggle && navLinks){
    navToggle.addEventListener('click',()=>{
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
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
})();
