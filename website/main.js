(() => {
  'use strict';

  // --- Current year in footer ---
  document.getElementById('year').textContent = String(new Date().getFullYear());

  // --- Navbar scroll shadow ---
  const navbar = document.getElementById('navbar');
  let lastScrollY = 0;

  const onScroll = () => {
    const scrollY = window.scrollY;
    if (scrollY > 16) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    lastScrollY = scrollY;
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // --- Mobile nav toggle ---
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      const isOpen = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', (e) => {
      if (!navToggle.contains(e.target) && !navLinks.contains(e.target)) {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // --- Language dropdown ---
  const langBtn = document.querySelector('.lang-btn');
  const langDropdown = document.querySelector('.lang-dropdown');

  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = langDropdown.classList.toggle('open');
      langBtn.setAttribute('aria-expanded', String(isOpen));
    });

    document.addEventListener('click', () => {
      langDropdown.classList.remove('open');
      langBtn.setAttribute('aria-expanded', 'false');
    });
  }

  // --- Scroll story (IntersectionObserver) ---
  const storySteps = document.querySelectorAll('.story-step');

  if (storySteps.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    storySteps.forEach((step) => observer.observe(step));
  } else {
    storySteps.forEach((step) => step.classList.add('visible'));
  }

  // --- Smooth scroll for anchor links ---
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener('click', (e) => {
      const targetId = anchor.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const navHeight = navbar.offsetHeight;
        const targetPos = target.getBoundingClientRect().top + window.scrollY - navHeight;
        window.scrollTo({ top: targetPos, behavior: 'smooth' });

        if (navLinks) navLinks.classList.remove('open');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
      }
    });
  });
})();
