/* CareerCompass landing page: Locomotive Scroll (smooth scroll, parallax, reveals).
   The page works without this file: reveal styles only apply once
   `has-scroll-anim` is set on <html>, which happens after a successful init. */
(function () {
  'use strict';

  var root = document.documentElement;
  var container = document.querySelector('[data-scroll-container]');
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!container || reduced || typeof window.LocomotiveScroll !== 'function') return;

  // Fade-up reveals. Items in the same row are staggered.
  var REVEAL = [
    '.section-head', '.source', '.grid-4 > *', '.grid-3 > *', '.grid-2 > *', '.steps-list > *',
    '.tiers > *', '.lp-product > *', '.cta-band',
  ].join(',');
  Array.prototype.forEach.call(container.querySelectorAll(REVEAL), function (el) {
    var i = Array.prototype.indexOf.call(el.parentNode.children, el);
    el.setAttribute('data-scroll', '');
    el.setAttribute('data-reveal', '');
    el.setAttribute('data-scroll-offset', '8%');
    el.style.setProperty('--reveal-delay', Math.min(i, 5) * 70 + 'ms');
  });

  // Locomotive moves the page with transforms, so the browser's own scroll offset
  // (restored on reload, or set by a #hash) has to stay at zero.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  var resetNative = function () { if (root.classList.contains('has-scroll-smooth')) { window.scrollTo(0, 0); root.scrollTop = 0; document.body.scrollTop = 0; } };

  var scroll;
  try {
    scroll = new window.LocomotiveScroll({
      el: container,
      smooth: true,
      lerp: 0.09,
      multiplier: 1,
      getDirection: true,
      tablet: { smooth: false, breakpoint: 900 },
      smartphone: { smooth: false },
    });
  } catch (err) {
    return; // leave the page as a normal, fully visible document
  }
  root.classList.add('has-scroll-anim');

  // Page height changes once fonts and the hero photo settle.
  var update = function () { scroll.update(); };
  window.addEventListener('load', update);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(update);
  Array.prototype.forEach.call(container.querySelectorAll('img'), function (img) {
    img.addEventListener('load', update);
    img.addEventListener('error', update);
  });

  // Arriving with a hash (for example index.html#pricing).
  var target = location.hash.length > 1 ? document.getElementById(location.hash.slice(1)) : null;
  resetNative();
  window.addEventListener('load', function () {
    resetNative();
    scroll.update();
    if (target) scroll.scrollTo(target, { duration: 0, disableLerp: true });
  });
})();
