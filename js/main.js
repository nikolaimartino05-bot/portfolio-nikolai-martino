/* ============================================================
   Nikolai Martino — Orveka-style interactions
   ============================================================ */

const PLACEHOLDER_IMG =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';

/* Fullscreen overlay nav */
const menuBtn = document.querySelector('.menu-btn');
const overlayNav = document.querySelector('.overlay-nav');

function closeOverlay() {
  if (!overlayNav || !menuBtn) return;
  overlayNav.classList.remove('is-open');
  menuBtn.classList.remove('is-open');
  menuBtn.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
}

if (menuBtn && overlayNav) {
  menuBtn.addEventListener('click', () => {
    const open = overlayNav.classList.toggle('is-open');
    menuBtn.classList.toggle('is-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    document.body.style.overflow = open ? 'hidden' : '';
  });

  overlayNav.querySelectorAll('a').forEach((a) => {
    a.addEventListener('click', closeOverlay);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeOverlay();
  });
}

/* Solid header on scroll for home */
const siteHeader = document.querySelector('.site-header');
if (siteHeader && !siteHeader.classList.contains('site-header--solid')) {
  const onScroll = () => {
    siteHeader.classList.toggle('site-header--solid', window.scrollY > 40);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });
}

/* Typing hero */
(function () {
  const el = document.querySelector('[data-typed]');
  if (!el) return;
  const full = el.getAttribute('data-typed') || '';
  const lines = full.split('\n');
  el.textContent = '';
  const cursor = document.createElement('span');
  cursor.className = 'typed-cursor';
  cursor.setAttribute('aria-hidden', 'true');

  let lineIdx = 0;
  let charIdx = 0;
  let currentLine = document.createElement('span');
  if (lines.length > 1) currentLine.className = 'typed-line';
  el.appendChild(currentLine);
  el.appendChild(cursor);

  function type() {
    if (lineIdx >= lines.length) {
      cursor.remove();
      return;
    }
    const line = lines[lineIdx];
    if (charIdx < line.length) {
      currentLine.textContent += line[charIdx];
      charIdx += 1;
      setTimeout(type, 28 + Math.random() * 22);
      return;
    }
    lineIdx += 1;
    charIdx = 0;
    if (lineIdx < lines.length) {
      currentLine = document.createElement('span');
      currentLine.className = 'typed-line';
      currentLine.style.display = 'block';
      currentLine.style.marginTop = '0.15em';
      el.insertBefore(currentLine, cursor);
      setTimeout(type, 220);
    } else {
      cursor.remove();
    }
  }

  setTimeout(type, 400);
})();

/* Reveal */
const revealEls = document.querySelectorAll('.reveal');
if (revealEls.length && 'IntersectionObserver' in window) {
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
  );
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-in'));
}

/* FAQ */
document.querySelectorAll('.faq-item__btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    const item = btn.closest('.faq-item');
    const open = item.classList.contains('is-open');
    document.querySelectorAll('.faq-item.is-open').forEach((i) => {
      i.classList.remove('is-open');
      i.querySelector('.faq-item__btn')?.setAttribute('aria-expanded', 'false');
    });
    if (!open) {
      item.classList.add('is-open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

/* Phone rail drag */
document.querySelectorAll('.phone-rail').forEach((rail) => {
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;

  rail.addEventListener('pointerdown', (e) => {
    isDown = true;
    rail.setPointerCapture(e.pointerId);
    startX = e.clientX;
    scrollLeft = rail.scrollLeft;
  });

  rail.addEventListener('pointermove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    rail.scrollLeft = scrollLeft - (e.clientX - startX) * 1.25;
  });

  const stop = () => {
    isDown = false;
  };
  rail.addEventListener('pointerup', stop);
  rail.addEventListener('pointercancel', stop);
});

/* Lightbox */
const lightbox = document.getElementById('lightbox');
const lightboxImg = lightbox?.querySelector('.lightbox__img');
let gallery = [];
let galleryIndex = 0;

function collectGallery(fromEl) {
  const scope = fromEl.closest('main') || document;
  const nodes = [
    ...scope.querySelectorAll(
      '.lightbox-trigger, .ps-gallery__btn, .phone__frame, [data-img]'
    ),
  ];
  const items = [];
  nodes.forEach((node) => {
    const src =
      node.getAttribute('data-img') ||
      (node.tagName === 'IMG' ? node.currentSrc || node.src : null) ||
      node.querySelector?.('img')?.currentSrc ||
      node.querySelector?.('img')?.src;
    const alt =
      node.getAttribute('data-caption') ||
      node.getAttribute('aria-label') ||
      node.querySelector?.('img')?.alt ||
      '';
    if (src && src !== PLACEHOLDER_IMG) items.push({ src, alt });
  });
  const seen = new Set();
  return items.filter((item) => {
    if (seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
}

function openLightbox(src, fromEl) {
  if (!lightbox || !lightboxImg) return;
  gallery = collectGallery(fromEl || document.body);
  galleryIndex = Math.max(0, gallery.findIndex((g) => g.src === src));
  if (galleryIndex < 0) {
    gallery = [{ src, alt: '' }];
    galleryIndex = 0;
  }
  lightboxImg.src = gallery[galleryIndex].src;
  lightboxImg.alt = gallery[galleryIndex].alt || '';
  lightbox.classList.add('is-open');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  if (!lightbox || !lightboxImg) return;
  lightbox.classList.remove('is-open');
  lightboxImg.src = PLACEHOLDER_IMG;
  document.body.style.overflow = '';
}

function stepLightbox(dir) {
  if (!gallery.length) return;
  galleryIndex = (galleryIndex + dir + gallery.length) % gallery.length;
  lightboxImg.src = gallery[galleryIndex].src;
  lightboxImg.alt = gallery[galleryIndex].alt || '';
}

document.addEventListener('click', (e) => {
  const trigger = e.target.closest(
    '.lightbox-trigger, .ps-gallery__btn, .phone__frame, .icone-card__btn, .cartaceo-card__btn'
  );
  if (!trigger) return;
  e.preventDefault();
  const src =
    trigger.getAttribute('data-img') ||
    (trigger.tagName === 'IMG' ? trigger.currentSrc || trigger.src : null) ||
    trigger.querySelector?.('img')?.currentSrc ||
    trigger.querySelector?.('img')?.src;
  if (src) openLightbox(src, trigger);
});

lightbox?.querySelector('.lightbox__close')?.addEventListener('click', closeLightbox);
lightbox?.querySelector('.lightbox__prev')?.addEventListener('click', () => stepLightbox(-1));
lightbox?.querySelector('.lightbox__next')?.addEventListener('click', () => stepLightbox(1));
lightbox?.addEventListener('click', (e) => {
  if (e.target === lightbox) closeLightbox();
});

document.addEventListener('keydown', (e) => {
  if (!lightbox?.classList.contains('is-open')) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') stepLightbox(-1);
  if (e.key === 'ArrowRight') stepLightbox(1);
});

/* Cookies */
(function () {
  const STORAGE_KEY = 'cookieConsent';
  function hideBanner(banner) {
    banner.classList.add('is-hidden');
    document.documentElement.classList.add('cookie-consent-accepted');
  }
  function init() {
    const banner = document.getElementById('cookie-banner');
    if (!banner) return;
    if (sessionStorage.getItem(STORAGE_KEY) === 'accepted') hideBanner(banner);
    else banner.classList.remove('is-hidden');
    document.getElementById('accept-cookies')?.addEventListener('click', () => {
      sessionStorage.setItem(STORAGE_KEY, 'accepted');
      hideBanner(banner);
    });
    document.getElementById('reject-cookies')?.addEventListener('click', () => {
      banner.classList.add('is-hidden');
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* Contact form — submit nativo Web3Forms + popup */
(() => {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const modal = document.getElementById('contact-modal');
  const titleEl = document.getElementById('contact-modal-title');
  const textEl = document.getElementById('contact-modal-text');
  const closeBtn = document.getElementById('contact-modal-btn');
  const submitBtn = document.getElementById('contact-submit');

  const showModal = (title, text, closable = true) => {
    if (!modal) return;
    if (titleEl) titleEl.textContent = title;
    if (textEl) textEl.textContent = text;
    if (closeBtn) closeBtn.hidden = !closable;
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('contact-modal-open');
  };

  const hideModal = () => {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('contact-modal-open');
  };

  modal?.querySelectorAll('[data-close-modal]').forEach((el) => {
    el.addEventListener('click', hideModal);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modal && !modal.hidden) hideModal();
  });

  // Non bloccare il submit: il form posta davvero a Web3Forms
  form.addEventListener('submit', () => {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Invio…';
    }
    showModal('Messaggio in invio…', 'Sto inviando il tuo messaggio. Un attimo.', false);
  });

  if (new URLSearchParams(location.search).get('invio') === 'ok') {
    showModal('Messaggio inviato', 'Grazie! Ti rispondo al più presto.', true);
    history.replaceState({}, '', location.pathname);
  }
})();
