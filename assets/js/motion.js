/* =========================================================================
   موشن و انیمیشن‌های مهتاب (همراه css/motion.css)

   خاموش کردن همه‌ی انیمیشن‌ها: مقدار زیر را false کنید.
   برای کسی که در دستگاهش «کاهش حرکت» را روشن کرده، حرکت‌ها خودکار خاموش‌اند
   (فقط نوار چسبان «افزودن به سبد» در گوشی، بدون حرکت، باقی می‌ماند).
   ========================================================================= */
var MAHTAB_MOTION = true;

(function () {
  'use strict';
  if (!MAHTAB_MOTION) return;

  var root = document.documentElement;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.classList.add('mt-on');

  /* ---------- پرواز عکس محصول تا آیکون سبد ---------- */
  // بعد از main.js اجرا می‌شود؛ اگر سایز انتخاب نشده باشد، main.js کلیک را متوقف می‌کند و پروازی هم انجام نمی‌شود
  var fly = function (button) {
    var cart = document.querySelector('.site-header [data-drawer-open="mini-cart"]');
    if (reduce || !cart || !cart.getBoundingClientRect().width) return;
    var holder = button.closest('[data-product]');
    if (!holder) return;
    var src = holder.querySelector('.p-media img, .c-am-media img, .pd-gallery-main img, img') || document.querySelector('.pd-gallery-main img');
    if (!src) return;
    var a = src.getBoundingClientRect();
    if (!a.width) return;
    var b = cart.getBoundingClientRect();
    var size = 72;
    var cy = a.top + Math.min(a.height, 300) / 2;
    var img = document.createElement('img');
    img.src = src.currentSrc || src.src;
    img.className = 'mt-fly';
    img.alt = '';
    img.style.left = (a.left + a.width / 2 - size / 2) + 'px';
    img.style.top = (cy - size / 2) + 'px';
    document.body.appendChild(img);
    var dx = b.left + b.width / 2 - (a.left + a.width / 2);
    var dy = b.top + b.height / 2 - cy;
    var anim = img.animate([
      { transform: 'translate(0,0) scale(1.4)', opacity: 0 },
      { transform: 'translate(0,-10px) scale(1.2)', opacity: 1, offset: 0.15 },
      { transform: 'translate(' + dx * 0.5 + 'px,' + (dy * 0.5 - 90) + 'px) scale(.8)', opacity: 1, offset: 0.6 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2)', opacity: 0.4 },
    ], { duration: 850, easing: 'cubic-bezier(.5,0,.3,1)' });
    anim.onfinish = function () {
      img.remove();
      cart.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 400 });
    };
  };
  document.addEventListener('click', function (e) {
    var add = e.target.closest('[data-add-to-cart]');
    if (add) fly(add);
    // تپش قلب علاقه‌مندی
    var heart = e.target.closest('[data-wish]');
    if (heart && !reduce) {
      heart.classList.remove('mt-beat');
      void heart.offsetWidth;
      heart.classList.add('mt-beat');
    }
  });

  /* ---------- نوار چسبان «افزودن به سبد» در صفحه‌ی محصول (گوشی) ---------- */
  var addBtn = document.querySelector('[data-pd-add]');
  if (addBtn) {
    var title = (document.querySelector('.pd-title') || {}).textContent || '';
    var price = document.querySelector('.pd-price');
    var image = document.querySelector('.pd-gallery-main img');
    var label = (addBtn.querySelector('[data-cart-label]') || addBtn).textContent.trim();
    var bar = document.createElement('div');
    bar.className = 'mt-sticky-buy';
    bar.innerHTML = (image ? '<img src="' + (image.currentSrc || image.src) + '" alt="">' : '') +
      '<span class="mt-sticky-buy-txt"><strong></strong><span></span></span>' +
      '<button type="button" class="btn btn-primary btn-sm"></button>';
    bar.querySelector('strong').textContent = title.trim();
    bar.querySelector('button').textContent = label;
    var priceEl = bar.querySelector('.mt-sticky-buy-txt span');
    var syncPrice = function () {
      if (!price) return;
      var now = price.querySelector('.price-now') ? price.querySelector('.price-now').parentNode : price;
      priceEl.textContent = now.textContent.replace(/\s+/g, ' ').trim();
    };
    syncPrice();
    document.body.appendChild(bar);
    bar.querySelector('button').addEventListener('click', function () {
      var sizes = document.querySelectorAll('input[name="pd-size"]');
      var chosen = document.querySelector('input[name="pd-size"]:checked');
      if (sizes.length && !chosen) {
        // سایز انتخاب نشده: به فرم برمی‌گردد و پیام «سایز را انتخاب کنید» نمایش داده می‌شود
        addBtn.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
        setTimeout(function () { addBtn.click(); }, reduce ? 0 : 450);
      } else {
        addBtn.click();
      }
    });
    // وقتی دکمه‌ی اصلی از بالای صفحه بیرون رفت، نوار نمایش داده می‌شود
    var queued = false;
    var check = function () {
      queued = false;
      var show = addBtn.getBoundingClientRect().bottom < 0;
      if (show !== bar.classList.contains('is-show')) {
        syncPrice();
        bar.classList.toggle('is-show', show);
      }
    };
    window.addEventListener('scroll', function () {
      if (!queued) { queued = true; requestAnimationFrame(check); }
    }, { passive: true });
    check();
  }

  if (reduce) return;

  /* ---------- ورود نرم بخش‌ها و کارت‌ها هنگام اسکرول ---------- */
  var groups = [
    '.p-grid > *', '.post-grid > *', '.account-stats > li', '.account-quick > *', '.empty-perks > li',
    '.cart-page-list > li', '.radio-cards > *', '.value-grid > *', '.team-grid > *', '.cat-bubbles > li',
  ];
  var singles = [
    '.section-head', '.shop-head', '.co-head', '.cart-page-summary', '.checkout-block', '.account-hero',
    '.account-panel', '.ab-panel', '.ab-cta', '.pd-tabs-wrap', '.au-card', '.picks-spot',
  ];
  var targets = [];
  groups.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) {
      var i = Array.prototype.indexOf.call(el.parentNode.children, el);
      el.style.setProperty('--mt-d', Math.min(i % 8, 7) * 70 + 'ms');
      targets.push(el);
    });
  });
  singles.forEach(function (sel) {
    document.querySelectorAll(sel).forEach(function (el) { targets.push(el); });
  });
  targets = targets.filter(function (el) {
    return !el.closest('.drawer, .fh, .site-header, .site-footer, .mega, [hidden], .reveal, .rail-track') && !el.classList.contains('reveal');
  });
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add('mt-in');
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (el) {
      var r = el.getBoundingClientRect();
      // چیزی که از همان اول در صفحه دیده می‌شود، بی‌تأخیر نمایش داده می‌شود
      if (r.top < window.innerHeight * 0.9 && r.bottom > 0) return;
      el.classList.add('mt-reveal');
      if (el.querySelector('.p-media img')) el.classList.add('mt-reveal-img');
      io.observe(el);
    });
  }

  /* ---------- تیتر هیرو کلمه‌به‌کلمه ---------- */
  var heroTitle = document.querySelector('.fh-title');
  if (heroTitle) {
    var n = 0;
    var walk = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (p) {
            if (!p) return;
            if (/^\s+$/.test(p)) { frag.appendChild(document.createTextNode(p)); return; }
            var w = document.createElement('span');
            w.className = 'mt-word';
            var inner = document.createElement('span');
            inner.style.setProperty('--i', n++);
            inner.textContent = p;
            w.appendChild(inner);
            frag.appendChild(w);
          });
          child.parentNode.replaceChild(frag, child);
        } else if (child.nodeType === 1 && child.tagName !== 'BR') {
          walk(child);
        }
      });
    };
    walk(heroTitle);
  }

  /* ---------- پارالاکس عکس هیرو و لوک‌بوک ---------- */
  // عکس هیرو داخل قاب خودش جابه‌جا می‌شود؛ لوک‌بوک همراه نقطه‌های محصولش جابه‌جا می‌شود تا نقطه‌ها سر جایشان بمانند
  var layers = [];
  document.querySelectorAll('.fh-media > img').forEach(function (el) {
    el.setAttribute('data-mt-parallax', '');
    el.style.scale = '1.1';
    layers.push({ el: el, box: el.parentElement, speed: 0.05 });
  });
  document.querySelectorAll('.lookbook-media').forEach(function (el) {
    el.setAttribute('data-mt-parallax', '');
    layers.push({ el: el, box: el.parentElement, speed: -0.06 });
  });
  if (layers.length) {
    var ticking = false;
    var update = function () {
      var vh = window.innerHeight;
      layers.forEach(function (l) {
        var r = l.box.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        var offset = (r.top + r.height / 2 - vh / 2) * l.speed;
        l.el.style.translate = '0 ' + offset.toFixed(1) + 'px';
      });
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }
})();
