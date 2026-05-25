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

  // --- Donate: token & network switching ---
  const qrImg = document.getElementById('donate-qr');
  const addressEl = document.getElementById('donate-address');
  const copyBtn = document.getElementById('copy-btn');
  let copyTimer = null;

  if (qrImg && addressEl && copyBtn) {
    function setQR(address, qrSrc) {
      qrImg.style.opacity = '0';
      qrImg.style.transform = 'scale(0.95)';
      setTimeout(() => {
        qrImg.src = qrSrc;
        addressEl.textContent = address;
        requestAnimationFrame(() => {
          qrImg.style.opacity = '1';
          qrImg.style.transform = 'scale(1)';
        });
      }, 200);
    }

    // Single-network token clicks
    document.querySelectorAll('.token-item:not(.has-networks)').forEach((item) => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.token-item').forEach((i) => i.classList.remove('active'));
        item.classList.add('active');
        setQR(item.dataset.address, item.dataset.qr);
      });
    });

    // Multi-network token header clicks (toggle expand)
    document.querySelectorAll('.token-header').forEach((header) => {
      header.addEventListener('click', () => {
        const item = header.closest('.token-item');
        const wasExpanded = item.classList.contains('expanded');
        item.classList.toggle('expanded');
        if (!wasExpanded) {
          document.querySelectorAll('.token-item').forEach((i) => i.classList.remove('active'));
          item.classList.add('active');
          const activeNet = item.querySelector('.network-btn.active');
          if (activeNet) setQR(activeNet.dataset.address, activeNet.dataset.qr);
        }
      });
    });

    // Network button clicks (inside expanded tokens)
    document.querySelectorAll('.token-body .network-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (btn.classList.contains('active')) return;
        const item = btn.closest('.token-item');
        item.querySelectorAll('.network-btn').forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        setQR(btn.dataset.address, btn.dataset.qr);
      });
    });

    // Copy
    function copyAddress() {
      const text = addressEl.textContent;
      if (!text) return;

      const doCopy = () => {
        if (copyTimer) clearTimeout(copyTimer);
        copyBtn.textContent = 'Copied';
        copyBtn.classList.add('copied');
        copyTimer = setTimeout(() => {
          copyBtn.textContent = 'Copy';
          copyBtn.classList.remove('copied');
        }, 2000);
      };

      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(doCopy).catch(() => {
          fallbackCopy(text, doCopy);
        });
      } else {
        fallbackCopy(text, doCopy);
      }
    }

    function fallbackCopy(text, cb) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      ta.style.pointerEvents = 'none';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); cb(); } catch (e) { /* noop */ }
      document.body.removeChild(ta);
    }

    copyBtn.addEventListener('click', copyAddress);
    addressEl.addEventListener('click', copyAddress);
  }
})();
