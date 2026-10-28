/* ==========================================================================
   قالب مهتاب – اسکریپت اصلی
   نسخه: 0.1.0
   --------------------------------------------------------------------------
   بدون jQuery و بدون کتابخانه‌ی خارجی. تغییرات شخصی خود را در custom.js بنویسید.
   هر دمو (کلاس demo-… و ویژگی data-demo روی <html>) سبد، علاقه‌مندی و مقایسه‌ی جداگانه دارد.
   ========================================================================== */

(function () {
  'use strict';

  const root = document.documentElement;
  const DEMO = root.dataset.demo || 'store';
  // مسیر پوشه‌ی assets نسبت به صفحه‌ی فعلی (از آدرس همین فایل main.js خوانده می‌شود)
  const mainScript = document.querySelector('script[src$="js/main.js"]');
  const ASSETS = mainScript ? mainScript.getAttribute('src').replace(/js\/main\.js$/, '') : 'assets/';
  const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const prefersReducedMotion = () => reduceMotionQuery.matches || root.classList.contains('no-motion');

  /* ------------------------------------------------------------------------
     ابزارها
     ------------------------------------------------------------------------ */
  const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
  const toFa = (value) => String(value).replace(/\d/g, (d) => FA_DIGITS[d]);
  const toEn = (value) => String(value).replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d));
  const formatPrice = (value) => new Intl.NumberFormat('fa-IR').format(value);

  // قیمت به‌صورت HTML: هر جداکننده‌ی ٬ در span.num-sep (مثل خروجی build)
  const priceHtml = (value) => `<span class="num">${formatPrice(value).split('٬').join('<span class="num-sep">٬</span>')}</span>`;

  const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

  // حافظه‌ی مرورگر؛ اگر در دسترس نباشد (حالت خصوصی و…) بی‌صدا کار می‌کند
  const store = {
    key: (name) => `mahtab-${DEMO}-${name}`,
    read(name, fallback) {
      try {
        const value = JSON.parse(localStorage.getItem(this.key(name)));
        return value === null ? fallback : value;
      } catch (e) {
        return fallback;
      }
    },
    write(name, value) {
      try {
        localStorage.setItem(this.key(name), JSON.stringify(value));
      } catch (e) {
        /* حافظه در دسترس نیست؛ داده فقط تا رفرش بعدی می‌ماند */
      }
    },
  };

  // پیام برای صفحه‌خوان‌ها
  const live = document.createElement('p');
  live.className = 'sr-only';
  live.setAttribute('aria-live', 'polite');
  document.body.appendChild(live);
  const announce = (text) => {
    live.textContent = '';
    setTimeout(() => (live.textContent = text), 30);
  };

  const bump = (el) => {
    if (prefersReducedMotion() || !el.animate) return;
    el.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.4)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 600, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' });
  };

  /* ------------------------------------------------------------------------
     هدر: سایه با اسکرول
     ------------------------------------------------------------------------ */
  function initHeader() {
    const header = document.getElementById('site-header');
    if (!header) return;
    let ticking = false;
    const update = () => {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }, { passive: true });
    update();
  }

  /* ------------------------------------------------------------------------
     کشوها (منوی موبایل و سبد خرید)
     باز کردن:  دکمه با data-drawer-open="شناسه‌ی کشو"
     بستن:      هر عنصر با data-drawer-close، کلیک روی پس‌زمینه یا کلید Esc
     فوکوس داخل کشو می‌ماند و بعد از بستن به دکمه‌ی بازکننده برمی‌گردد.
     ------------------------------------------------------------------------ */
  const drawers = (() => {
    const overlay = document.querySelector('[data-drawer-overlay]');
    let active = null;
    let lastOpener = null;

    const focusables = (el) =>
      Array.from(el.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select, textarea')).filter((node) => !node.closest('[hidden]'));

    const setOpeners = (id, open) =>
      document.querySelectorAll(`[data-drawer-open="${id}"]`).forEach((btn) => btn.setAttribute('aria-expanded', String(open)));

    const close = (restoreFocus = true) => {
      if (!active) return;
      const el = active;
      active = null;
      el.classList.remove('is-open');
      el.setAttribute('inert', '');
      if (overlay) overlay.classList.remove('is-open');
      document.body.classList.remove('is-locked');
      setOpeners(el.id, false);
      if (restoreFocus && lastOpener && document.body.contains(lastOpener)) lastOpener.focus({ preventScroll: true });
    };

    const open = (id, opener) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (active) close(false);
      document.dispatchEvent(new CustomEvent('mahtab:overlay-open'));
      active = el;
      lastOpener = opener || document.activeElement;
      el.removeAttribute('inert');
      el.classList.add('is-open');
      if (overlay) overlay.classList.add('is-open');
      document.body.classList.add('is-locked');
      setOpeners(id, true);
      const first = el.querySelector('[data-drawer-close]') || focusables(el)[0];
      if (first) setTimeout(() => first.focus({ preventScroll: true }), 60);
    };

    document.addEventListener('click', (event) => {
      const opener = event.target.closest('[data-drawer-open]');
      if (opener) {
        const id = opener.dataset.drawerOpen;
        if (active && active.id === id) close();
        else open(id, opener);
        return;
      }
      if (active && event.target.closest('[data-drawer-close]')) close(!event.target.closest('a[href]'));
    });
    if (overlay) overlay.addEventListener('click', () => close());

    document.addEventListener('keydown', (event) => {
      if (!active) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === 'Tab') {
        const els = focusables(active);
        if (!els.length) return;
        const first = els[0];
        const last = els[els.length - 1];
        if (event.shiftKey && (document.activeElement === first || !active.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !active.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    // منوی موبایل در عرض دسکتاپ بسته شود
    window.matchMedia('(min-width: 1024px)').addEventListener('change', (e) => {
      if (e.matches && active && active.id === 'mobile-menu') close(false);
    });

    return { open, close, isOpen: (id) => Boolean(active && active.id === id) };
  })();

  /* ------------------------------------------------------------------------
     باز و بسته شدن ساده (زیرمنوهای منوی موبایل و…)
     دکمه با data-disclosure و aria-controls="شناسه‌ی بخش"
     ------------------------------------------------------------------------ */
  function initDisclosures() {
    document.querySelectorAll('[data-disclosure]').forEach((button) => {
      const target = document.getElementById(button.getAttribute('aria-controls'));
      if (!target) return;
      button.addEventListener('click', () => {
        const open = button.getAttribute('aria-expanded') !== 'true';
        button.setAttribute('aria-expanded', String(open));
        target.hidden = !open;
      });
    });
  }

  /* ------------------------------------------------------------------------
     مگامنو (دسکتاپ)
     با کلیک یا Enter باز می‌شود؛ با ماوس هم با کمی تأخیر باز و بسته می‌شود.
     Esc منو را می‌بندد و فوکوس را به گزینه برمی‌گرداند.
     ------------------------------------------------------------------------ */
  function initMegaMenu() {
    const triggers = Array.from(document.querySelectorAll('[data-mega-trigger]'));
    if (!triggers.length) return;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

    const panelOf = (trigger) => document.getElementById(trigger.getAttribute('aria-controls'));
    const setOpen = (trigger, open) => {
      if (open) triggers.forEach((t) => t !== trigger && setOpen(t, false));
      trigger.setAttribute('aria-expanded', String(open));
      panelOf(trigger).classList.toggle('is-open', open);
    };
    const closeAll = () => triggers.forEach((t) => t.getAttribute('aria-expanded') === 'true' && setOpen(t, false));

    triggers.forEach((trigger) => {
      const item = trigger.parentElement;
      let timer = null;

      trigger.addEventListener('click', () => setOpen(trigger, trigger.getAttribute('aria-expanded') !== 'true'));

      item.addEventListener('mouseenter', () => {
        if (!finePointer.matches) return;
        clearTimeout(timer);
        timer = setTimeout(() => setOpen(trigger, true), 120);
      });
      item.addEventListener('mouseleave', () => {
        if (!finePointer.matches) return;
        clearTimeout(timer);
        timer = setTimeout(() => setOpen(trigger, false), 200);
      });
      item.addEventListener('focusout', (event) => {
        if (!item.contains(event.relatedTarget)) setOpen(trigger, false);
      });
      item.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && trigger.getAttribute('aria-expanded') === 'true') {
          setOpen(trigger, false);
          trigger.focus();
        }
      });
    });

    document.addEventListener('click', (event) => {
      if (!event.target.closest('.main-nav')) closeAll();
    });
    document.addEventListener('mahtab:overlay-open', closeAll);
  }

  /* ------------------------------------------------------------------------
     پنل جست‌وجو (هدر وسط‌چین و موبایل)
     ------------------------------------------------------------------------ */
  function initSearchPanel() {
    const panel = document.querySelector('[data-search-panel]');
    const toggles = document.querySelectorAll('[data-search-toggle]');
    if (!panel || !toggles.length) return;
    let opener = null;

    const setOpen = (open, focusBack = true) => {
      panel.hidden = !open;
      toggles.forEach((t) => t.setAttribute('aria-expanded', String(open)));
      if (open) {
        const input = panel.querySelector('input');
        if (input) input.focus();
      } else if (focusBack && opener) {
        opener.focus();
      }
    };

    toggles.forEach((toggle) =>
      toggle.addEventListener('click', () => {
        opener = toggle;
        setOpen(panel.hidden);
      })
    );
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !panel.hidden) setOpen(false);
    });
    document.addEventListener('click', (event) => {
      if (!panel.hidden && !panel.contains(event.target) && !event.target.closest('[data-search-toggle]')) setOpen(false, false);
    });
    document.addEventListener('mahtab:overlay-open', () => !panel.hidden && setOpen(false, false));
  }

  /* ------------------------------------------------------------------------
     علاقه‌مندی و مقایسه (دکمه‌های روی کارت محصول)
     فهرست‌ها در حافظه‌ی مرورگر ذخیره و تعدادشان در هدر نمایش داده می‌شود.
     ------------------------------------------------------------------------ */
  const COMPARE_LIMIT = 4;

  function initSavedLists() {
    const lists = {
      wish: { key: 'wishlist', badge: '[data-wish-count]', added: 'به علاقه‌مندی‌ها اضافه شد', removed: 'از علاقه‌مندی‌ها حذف شد' },
      compare: { key: 'compare', badge: '[data-compare-count]', added: 'به فهرست مقایسه اضافه شد', removed: 'از فهرست مقایسه حذف شد', limit: COMPARE_LIMIT },
    };

    Object.entries(lists).forEach(([type, cfg]) => {
      let ids = store.read(cfg.key, []);
      const buttons = document.querySelectorAll(`[data-${type}]`);

      const render = (animate) => {
        buttons.forEach((btn) => {
          const product = btn.closest('[data-product]');
          if (product) btn.setAttribute('aria-pressed', String(ids.includes(product.dataset.productId)));
        });
        document.querySelectorAll(cfg.badge).forEach((badge) => {
          badge.textContent = toFa(ids.length);
          badge.hidden = ids.length === 0;
          if (animate && ids.length) bump(badge);
        });
      };

      buttons.forEach((btn) =>
        btn.addEventListener('click', () => {
          const product = btn.closest('[data-product]');
          if (!product) return;
          const id = product.dataset.productId;
          const name = product.dataset.productName;
          if (ids.includes(id)) {
            ids = ids.filter((x) => x !== id);
            announce(`${name} ${cfg.removed}`);
          } else {
            if (cfg.limit && ids.length >= cfg.limit) {
              announce(`حداکثر ${toFa(cfg.limit)} محصول را می‌توانید مقایسه کنید.`);
              return;
            }
            ids.push(id);
            announce(`${name} ${cfg.added}`);
          }
          store.write(cfg.key, ids);
          render(true);
        })
      );

      window.addEventListener('storage', (event) => {
        if (event.key !== store.key(cfg.key)) return;
        ids = store.read(cfg.key, []);
        render(false);
      });
      render(false);
    });
  }

  /* ------------------------------------------------------------------------
     انتخاب وزن یا حجم روی کارت محصول: قیمت کارت و داده‌ی سبد به‌روز می‌شود
     ------------------------------------------------------------------------ */
  function initCardVariants() {
    document.querySelectorAll('[data-product] input[data-variant-price]').forEach((input) => {
      input.addEventListener('change', () => {
        const product = input.closest('[data-product]');
        const price = parseInt(input.dataset.variantPrice, 10);
        const sale = parseInt(input.dataset.variantSale, 10) || 0;
        product.dataset.productPrice = String(sale || price);
        product.dataset.productVariant = input.dataset.variantLabel;
        const box = product.querySelector('[data-card-price]');
        if (!box) return;
        const label = box.querySelector('.p-price-label');
        box.innerHTML = `${label ? label.outerHTML : ''}${sale ? `<del><span class="sr-only">قیمت قبلی: </span>${priceHtml(price)}</del>` : ''}<span><span class="price-now">${priceHtml(sale || price)}</span> <span class="currency">تومان</span></span>`;
      });
      if (input.checked) input.dispatchEvent(new Event('change'));
    });
  }

  /* ------------------------------------------------------------------------
     سبد خرید کشویی
     - سبد فقط سمت کاربر است و در حافظه‌ی مرورگر ذخیره می‌شود (Help.pdf را ببینید).
     - هر محصول قابل افزودن، عنصری با data-product و این ویژگی‌هاست:
         data-product-id، data-product-name، data-product-price (عدد انگلیسی، تومان)، data-product-image
       و یک دکمه با data-add-to-cart داخل آن. اگر وزن یا حجم انتخاب شود، جداگانه ثبت می‌شود.
     ------------------------------------------------------------------------ */
  const cartStore = {
    read: () => store.read('cart', []).filter((i) => i && i.id && i.qty > 0),
    write: (items) => store.write('cart', items),
  };

  // بعد از initCart پر می‌شود؛ صفحه‌هایی که کارت محصول را با جاوااسکریپت می‌سازند (مثل علاقه‌مندی‌ها)
  // دکمه‌ی «افزودن به سبد» تازه‌ساخته را با rebindAddToCart(ریشه) فعال می‌کنند، نه با اجرای دوباره‌ی initCart.
  let rebindAddToCart = () => {};

  function initCart() {
    const panel = document.querySelector('[data-mini-cart]');
    const badges = document.querySelectorAll('[data-cart-count]');
    const openers = document.querySelectorAll('[data-cart-open]');
    let items = cartStore.read();

    const list = panel && panel.querySelector('[data-cart-items]');
    const empty = panel && panel.querySelector('[data-cart-empty]');
    const foot = panel && panel.querySelector('[data-cart-foot]');
    const total = panel && panel.querySelector('[data-cart-total]');
    const headingCount = panel && panel.querySelector('[data-cart-heading-count]');
    const status = panel && panel.querySelector('[data-cart-status]');
    const say = (text) => (status ? (status.textContent = text) : announce(text));

    const count = () => items.reduce((sum, i) => sum + i.qty, 0);

    const renderBadges = (animate) => {
      const n = count();
      badges.forEach((badge) => {
        badge.textContent = toFa(n);
        badge.hidden = n === 0;
        if (animate && n) bump(badge);
      });
      openers.forEach((btn) => btn.setAttribute('aria-label', n ? `سبد خرید، ${toFa(n)} کالا` : 'سبد خرید، خالی'));
    };

    const render = () => {
      if (!panel) return;
      const n = count();
      list.innerHTML = items
        .map((item) => {
          const name = escapeHtml(item.name);
          return `<li class="cart-item" data-id="${escapeHtml(item.id)}">
  <img class="cart-thumb" src="${escapeHtml(item.image)}" width="76" height="76" alt="">
  <div class="cart-info">
    <p class="cart-name">${name}</p>
    ${item.variant ? `<p class="cart-variant">${escapeHtml(item.variant)}</p>` : ''}
    <p class="cart-price">${priceHtml(item.price * item.qty)} <span class="currency">تومان</span></p>
    <div class="qty" role="group" aria-label="تعداد ${name}">
      <button type="button" data-qty="1" aria-label="افزایش تعداد ${name}"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></button>
      <span>${toFa(item.qty)}</span>
      <button type="button" data-qty="-1" aria-label="کاهش تعداد ${name}"><svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg></button>
    </div>
  </div>
  <button type="button" class="cart-remove" data-remove aria-label="حذف ${name} از سبد"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
</li>`;
        })
        .join('');
      list.hidden = n === 0;
      empty.hidden = n !== 0;
      foot.hidden = n === 0;
      total.innerHTML = priceHtml(items.reduce((sum, i) => sum + i.price * i.qty, 0));
      headingCount.textContent = n ? `(${toFa(n)})` : '';
      document.dispatchEvent(new CustomEvent('mahtab:cart-render', { detail: { items } }));
    };

    const save = (animate) => {
      cartStore.write(items);
      renderBadges(animate);
      render();
    };

    /* ---- افزودن به سبد ----
       بعد از اینکه صفحه‌ای (مثل علاقه‌مندی‌ها) کارت محصول تازه با جاوااسکریپت می‌سازد،
       با window.Mahtab.bindAddToCart(ریشه‌ی تازه) همین دکمه‌ها را در آن فعال می‌کند. */
    const bindAddButtons = (root) => {
      (root || document).querySelectorAll('[data-add-to-cart]').forEach((button) => {
        if (button.dataset.cartBound) return;
        button.dataset.cartBound = '1';

        const label = button.querySelector('[data-cart-label]');
        const icon = button.querySelector('use');
        const original = label ? label.textContent : '';
        const originalIcon = icon ? icon.getAttribute('href') : '';
        let timer = null;

        button.addEventListener('click', () => {
          const product = button.closest('[data-product]');
          if (!product) return;
          const data = product.dataset;
          const variant = data.productVariant || '';
          const id = variant ? `${data.productId}::${variant}` : data.productId;
          const existing = items.find((i) => i.id === id);
          if (existing) existing.qty += 1;
          else
            items.push({
              id,
              name: data.productName,
              variant,
              price: parseInt(data.productPrice, 10) || 0,
              // مسیر کامل ذخیره می‌شود تا در همه‌ی صفحه‌ها درست نمایش داده شود
              image: new URL(data.productImage, document.baseURI).href,
              qty: 1,
            });
          save(true);
          say(`${data.productName}${variant ? ` (${variant})` : ''} به سبد اضافه شد`);

          button.classList.add('is-added');
          if (label) label.textContent = 'اضافه شد';
          if (icon) icon.setAttribute('href', '#i-check');
          clearTimeout(timer);
          timer = setTimeout(() => {
            button.classList.remove('is-added');
            if (label) label.textContent = original;
            if (icon) icon.setAttribute('href', originalIcon);
          }, 1800);
        });
      });
    };
    bindAddButtons(document);
    rebindAddToCart = bindAddButtons;

    renderBadges(false);
    if (!panel) return;
    render();

    /* ---- تعداد و حذف ---- */
    list.addEventListener('click', (event) => {
      const row = event.target.closest('.cart-item');
      if (!row) return;
      const item = items.find((i) => i.id === row.dataset.id);
      if (!item) return;
      const qtyBtn = event.target.closest('[data-qty]');
      const removeBtn = event.target.closest('[data-remove]');
      const index = items.indexOf(item);

      if (qtyBtn) {
        item.qty += parseInt(qtyBtn.dataset.qty, 10);
        if (item.qty < 1) items.splice(index, 1);
        say(item.qty < 1 ? `${item.name} از سبد حذف شد` : `تعداد ${item.name}: ${toFa(item.qty)}`);
      } else if (removeBtn) {
        items.splice(index, 1);
        say(`${item.name} از سبد حذف شد`);
      } else {
        return;
      }
      const action = qtyBtn ? `[data-qty="${qtyBtn.dataset.qty}"]` : null;
      save(false);

      // فوکوس کیبورد در جای منطقی بماند
      const sameRow = action && list.querySelector(`.cart-item[data-id="${CSS.escape(item.id)}"] ${action}`);
      const nextRow = list.querySelectorAll('.cart-item')[Math.min(index, items.length - 1)];
      const target = sameRow || (nextRow && nextRow.querySelector('[data-remove]')) || panel.querySelector('[data-cart-empty] a');
      if (target) target.focus();
    });

    // هماهنگی بین تب‌های باز همین سایت
    window.addEventListener('storage', (event) => {
      if (event.key !== store.key('cart')) return;
      items = cartStore.read();
      renderBadges(false);
      render();
    });
  }

  /* ------------------------------------------------------------------------
     خبرنامه (فقط اعتبارسنجی سمت کاربر)
     اگر فرم ویژگی action با آدرس واقعی داشته باشد، بعد از اعتبارسنجی ارسال می‌شود.
     ------------------------------------------------------------------------ */
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const hasRealAction = (form) => {
    const action = (form.getAttribute('action') || '').trim();
    return action !== '' && action !== '#';
  };

  function initNewsletter() {
    document.querySelectorAll('[data-newsletter]').forEach((form) => {
      const input = form.querySelector('input[type="email"]');
      const error = form.querySelector('[data-newsletter-error]');
      const success = form.parentElement.querySelector('[data-newsletter-success]');
      if (!input || !error) return;

      const showError = (message) => {
        input.setAttribute('aria-invalid', 'true');
        error.textContent = message;
        error.hidden = false;
        input.focus();
      };
      const clearError = () => {
        input.removeAttribute('aria-invalid');
        error.hidden = true;
      };

      input.addEventListener('input', () => {
        if (input.getAttribute('aria-invalid') === 'true' && EMAIL_PATTERN.test(input.value.trim())) clearError();
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const value = input.value.trim();
        if (!value) return showError('لطفاً ایمیل خود را وارد کنید.');
        if (!EMAIL_PATTERN.test(value)) return showError('ایمیل واردشده معتبر نیست؛ مثال درست: name@example.com');
        clearError();
        if (hasRealAction(form)) {
          form.submit();
          return;
        }
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.focus();
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     تایمر شمارش معکوس: عنصر با data-countdown="2026-12-21T23:59:59+03:30"
     و داخل آن [data-cd="days|hours|minutes|seconds"]
     ------------------------------------------------------------------------ */
  function initCountdown() {
    document.querySelectorAll('[data-countdown]').forEach((timer) => {
      let end = new Date(timer.dataset.countdown).getTime();
      if (Number.isNaN(end)) return;
      // data-countdown-repeat="7": اگر مهلت گذشته باشد، شمارش برای دوره‌ی بعدیِ ۷روزه ادامه پیدا می‌کند (مناسب دمو)
      const repeatDays = parseInt(timer.dataset.countdownRepeat, 10);
      if (repeatDays > 0 && end <= Date.now()) {
        const period = repeatDays * 86400000;
        end += Math.ceil((Date.now() - end) / period) * period;
      }
      const render = () => {
        const diff = Math.max(0, end - Date.now());
        const values = {
          days: Math.floor(diff / 86400000),
          hours: Math.floor((diff / 3600000) % 24),
          minutes: Math.floor((diff / 60000) % 60),
          seconds: Math.floor((diff / 1000) % 60),
        };
        Object.entries(values).forEach(([key, value]) => {
          const el = timer.querySelector(`[data-cd="${key}"]`);
          if (el) el.textContent = toFa(String(value).padStart(2, '0'));
        });
        if (diff === 0) timer.classList.add('is-ended');
        return diff;
      };
      if (render() === 0) return;
      const loop = setInterval(() => render() === 0 && clearInterval(loop), 1000);
    });
  }

  /* ------------------------------------------------------------------------
     ظاهر شدن نرم عناصر با کلاس reveal هنگام اسکرول
     ------------------------------------------------------------------------ */
  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!items.length) return;
    if (prefersReducedMotion() || !('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }),
      { rootMargin: '0px 0px -40px 0px', threshold: 0 }
    );
    items.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     زبانه‌ها (الگوی استاندارد tablist)
     کلیدهای چپ/راست، Home و End بین زبانه‌ها جابه‌جا می‌شوند.
     ------------------------------------------------------------------------ */
  function initTabs() {
    document.querySelectorAll('[data-tabs]').forEach((list) => {
      const tabs = Array.from(list.querySelectorAll('[role="tab"]'));
      const select = (tab, focus) => {
        tabs.forEach((t) => {
          const on = t === tab;
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
          const panel = document.getElementById(t.getAttribute('aria-controls'));
          if (panel) panel.hidden = !on;
        });
        if (focus) tab.focus();
      };
      tabs.forEach((tab, i) => {
        tab.addEventListener('click', () => select(tab, false));
        tab.addEventListener('keydown', (event) => {
          const last = tabs.length - 1;
          // در راست‌چین، کلید چپ یعنی زبانه‌ی بعدی
          const map = { ArrowLeft: i === last ? 0 : i + 1, ArrowRight: i === 0 ? last : i - 1, Home: 0, End: last };
          if (event.key in map) {
            event.preventDefault();
            select(tabs[map[event.key]], true);
          }
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     «افزودن کل ست به سبد» (لوک‌بوک): همه‌ی محصولات داخل [data-look] را اضافه می‌کند
     ------------------------------------------------------------------------ */
  function initAddAll() {
    document.querySelectorAll('[data-add-all]').forEach((button) => {
      const scope = button.closest('section') || document;
      button.addEventListener('click', () => {
        scope.querySelectorAll('[data-look] [data-add-to-cart]').forEach((b) => b.click());
        announce('همه‌ی محصولات این ست به سبد اضافه شد');
      });
    });
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی فروشگاه: فیلتر، مرتب‌سازی و صفحه‌بندی سمت کاربر
     هر کارت محصول ویژگی‌های data-cat، data-brand، data-colors، data-sizes،
     data-price-sort، data-rating-sort و data-badges را برای فیلتر دارد.
     ------------------------------------------------------------------------ */
  // نشانی صفحه‌ی محصول از روی نام فایل تصویرش (product-<نام>.html)
  function productUrl(item) {
    const slug = String((item && item.image) || '').split('/').pop().split('.')[0];
    return slug ? `product-${slug}.html` : 'product.html';
  }

  function initShop() {
    const grid = document.querySelector('[data-shop-grid]');
    if (!grid) return;

    const PAGE_SIZE = 8;
    const cards = Array.from(grid.querySelectorAll('.p-card'));
    const emptyMsg = document.querySelector('[data-shop-empty]');
    const countEl = document.querySelector('[data-result-count]');
    const paginationEl = document.querySelector('[data-pagination]');
    const sortSelect = document.querySelector('[data-sort]');
    const priceBox = document.querySelector('[data-price-filter]');
    const priceMinInput = document.querySelector('[data-price-min]');
    const priceMaxInput = document.querySelector('[data-price-max]');
    const sliderMin = document.querySelector('[data-price-slider-min]');
    const sliderMax = document.querySelector('[data-price-slider-max]');
    let page = 1;

    /* فیلتر از روی نشانی صفحه (لینک‌های منو و دسته‌ها): ?cat=women-coat ، ?collection=autumn ، ?style=sport ، ?sale=1 ، ?sort=newest
       هر مقدار باید در data-tags کارت محصول باشد. اگر هیچ محصولی برچسب نداشته باشد، این فیلتر نادیده گرفته می‌شود. */
    const params = new URLSearchParams(location.search);
    const hasTags = cards.some((c) => c.dataset.tags);
    const urlTags = [];
    params.forEach((value, key) => { if (!['sort', 'sale', 'page'].includes(key) && value) urlTags.push(value); });
    const urlSale = params.get('sale') === '1';
    if (sortSelect && params.get('sort') && [...sortSelect.options].some((o) => o.value === params.get('sort'))) sortSelect.value = params.get('sort');
    if ((urlTags.length && hasTags) || urlSale || params.get('sort')) {
      const q = location.search;
      // عنوان صفحه: نام همان دسته از روی لینک‌های منو (به‌جز «مشاهده‌ی همه»)، یا از فهرست data-filter-labels
      let labels = {};
      try { labels = JSON.parse((document.getElementById('filter-labels') || {}).textContent || '{}'); } catch (e) { labels = {}; }
      const names = [...document.querySelectorAll('a[href]')]
        .filter((a) => a.getAttribute('href').endsWith(`shop.html${q}`))
        .map((a) => (a.querySelector('strong, span') || a).textContent.trim().split('\n')[0].trim())
        .filter((t) => t && !t.startsWith('مشاهده'));
      const label = labels[q.replace(/^\?/, '')] || names.sort((a, b) => a.length - b.length)[0];
      const title = document.querySelector('.shop-head .section-title');
      if (title && label) title.textContent = label;
      const head = document.querySelector('.shop-head-count');
      if (head && !head.querySelector('[data-clear-url]')) head.insertAdjacentHTML('beforeend', ' · <a href="shop.html" data-clear-url>نمایش همه‌ی محصولات</a>');
    }

    const checkedValues = (name) => Array.from(document.querySelectorAll(`[data-filter="${name}"] input:checked`)).map((i) => i.value);

    const priceBounds = priceBox ? { min: parseInt(priceBox.dataset.min, 10), max: parseInt(priceBox.dataset.max, 10) } : null;
    const currentPriceRange = () => [
      Math.max(priceBounds.min, parseInt(priceMinInput.value, 10) || priceBounds.min),
      Math.min(priceBounds.max, parseInt(priceMaxInput.value, 10) || priceBounds.max),
    ];

    const matches = (card) => {
      const cats = checkedValues('cat');
      const brands = checkedValues('brand');
      const colors = checkedValues('color');
      const sizes = checkedValues('size');
      if (cats.length && !cats.includes(card.dataset.cat)) return false;
      if (urlTags.length && hasTags && !urlTags.every((t) => (card.dataset.tags || '').split('|').includes(t))) return false;
      if (urlSale && !(card.dataset.badges || '').split('|').includes('sale')) return false;
      if (brands.length && !brands.includes(card.dataset.brand)) return false;
      if (colors.length) {
        const cardColors = (card.dataset.colors || '').split('|');
        if (!colors.some((c) => cardColors.includes(c))) return false;
      }
      if (sizes.length) {
        const cardSizes = (card.dataset.sizes || '').split('|');
        if (!sizes.some((s) => cardSizes.includes(s))) return false;
      }
      if (priceBox) {
        const [lo, hi] = currentPriceRange();
        const price = parseInt(card.dataset.priceSort, 10);
        if (price < lo || price > hi) return false;
      }
      return true;
    };

    const SORTERS = {
      default: null,
      newest: (a, b) => (b.dataset.badges || '').includes('new') - (a.dataset.badges || '').includes('new'),
      'price-asc': (a, b) => a.dataset.priceSort - b.dataset.priceSort,
      'price-desc': (a, b) => b.dataset.priceSort - a.dataset.priceSort,
      rating: (a, b) => b.dataset.ratingSort - a.dataset.ratingSort,
    };

    const renderPagination = (pages) => {
      if (!paginationEl) return;
      paginationEl.hidden = pages <= 1;
      if (pages <= 1) {
        paginationEl.innerHTML = '';
        return;
      }
      const btn = (label, target, extra = '') => `<button type="button" data-page="${target}" ${extra}>${label}</button>`;
      let html = btn('قبلی', 'prev', page === 1 ? 'disabled aria-label="صفحه‌ی قبل"' : 'aria-label="صفحه‌ی قبل"');
      // صفحه‌ی اول و آخر، و دو صفحه‌ی اطراف صفحه‌ی فعلی؛ بقیه با «…»
      let last = 0;
      for (let i = 1; i <= pages; i++) {
        if (i !== 1 && i !== pages && Math.abs(i - page) > 1) continue;
        if (i - last > 1) html += '<span class="pagination-gap" aria-hidden="true">…</span>';
        html += btn(toFa(i), i, i === page ? 'aria-current="page"' : `aria-label="صفحه‌ی ${toFa(i)}"`);
        last = i;
      }
      html += btn('بعدی', 'next', page === pages ? 'disabled aria-label="صفحه‌ی بعد"' : 'aria-label="صفحه‌ی بعد"');
      paginationEl.innerHTML = html;
    };

    const render = () => {
      const filtered = cards.filter(matches);
      const sorter = SORTERS[sortSelect ? sortSelect.value : 'default'];
      const ordered = sorter ? [...filtered].sort(sorter) : filtered;

      const pages = Math.max(1, Math.ceil(ordered.length / PAGE_SIZE));
      page = Math.min(page, pages);
      const start = (page - 1) * PAGE_SIZE;
      const visible = new Set(ordered.slice(start, start + PAGE_SIZE));

      // ترتیب DOM فقط وقتی مرتب‌سازی واقعی فعال است جابه‌جا می‌شود (در حالت پیش‌فرض/فیلتر، ترتیب اصلی حفظ و لرزش چیدمان جلوگیری می‌شود)
      if (sorter) ordered.forEach((card) => grid.appendChild(card));
      cards.forEach((card) => (card.hidden = !visible.has(card)));

      if (countEl) countEl.textContent = toFa(ordered.length);
      if (emptyMsg) emptyMsg.hidden = ordered.length !== 0;
      grid.hidden = ordered.length === 0;
      renderPagination(pages);
    };

    document.querySelectorAll('[data-filter] input, [data-price-filter] input').forEach((input) =>
      input.addEventListener('change', () => {
        page = 1;
        syncPriceInputs(input);
        render();
      })
    );
    if (sortSelect) sortSelect.addEventListener('change', () => { page = 1; render(); });

    function syncPriceInputs(from) {
      if (!priceBox) return;
      let [lo, hi] = currentPriceRange();
      if (lo > hi) {
        if (from === sliderMin || from === priceMinInput) hi = lo;
        else lo = hi;
      }
      priceMinInput.value = lo;
      priceMaxInput.value = hi;
      sliderMin.value = lo;
      sliderMax.value = hi;
      const range = priceBounds.max - priceBounds.min || 1;
      priceBox.style.setProperty('--p1', `${((lo - priceBounds.min) / range) * 100}%`);
      priceBox.style.setProperty('--p2', `${((hi - priceBounds.min) / range) * 100}%`);
    }

    if (priceBox) {
      [priceMinInput, priceMaxInput, sliderMin, sliderMax].forEach((input) =>
        input.addEventListener('input', () => {
          page = 1;
          syncPriceInputs(input);
          render();
        })
      );
      syncPriceInputs(null);
    }

    if (paginationEl) {
      paginationEl.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-page]');
        if (!button || button.disabled) return;
        const target = button.dataset.page;
        const pages = paginationEl.querySelectorAll('button[aria-current], button[data-page]:not([data-page="prev"]):not([data-page="next"])').length;
        if (target === 'prev') page = Math.max(1, page - 1);
        else if (target === 'next') page = page + 1;
        else page = parseInt(target, 10);
        render();
        grid.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'start' });
      });
    }

    document.querySelectorAll('[data-filters-reset]').forEach((button) =>
      button.addEventListener('click', () => {
        document.querySelectorAll('[data-filter] input:checked').forEach((input) => (input.checked = false));
        page = 1;
        if (priceBox) {
          priceMinInput.value = priceBounds.min;
          priceMaxInput.value = priceBounds.max;
          syncPriceInputs(null);
        }
        render();
      })
    );

    render();
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی محصول: گالری تصویر، شمارشگر تعداد، الزام انتخاب سایز، فرم نظرات
     ------------------------------------------------------------------------ */
  function initProductGallery() {
    const main = document.getElementById('pd-main-image');
    const thumbs = document.querySelectorAll('[data-pd-thumb]');
    if (!main || !thumbs.length) return;
    thumbs.forEach((thumb) =>
      thumb.addEventListener('click', () => {
        main.src = thumb.dataset.src;
        thumbs.forEach((t) => {
          t.classList.toggle('is-active', t === thumb);
          t.setAttribute('aria-pressed', String(t === thumb));
        });
      })
    );
  }

  function initQuantityStepper() {
    document.querySelectorAll('[data-qty-up], [data-qty-down]').forEach((button) => {
      const wrap = button.closest('.qty');
      const input = wrap && wrap.querySelector('input[type="number"]');
      if (!input) return;
      button.addEventListener('click', () => {
        const min = parseInt(input.min, 10) || 1;
        const max = parseInt(input.max, 10) || 99;
        const delta = button.hasAttribute('data-qty-up') ? 1 : -1;
        input.value = Math.min(max, Math.max(min, (parseInt(input.value, 10) || 1) + delta));
      });
    });
  }

  function initProductColorLabel() {
    document.querySelectorAll('input[name="pd-color"]').forEach((input) => {
      input.addEventListener('change', () => {
        const label = input.closest('.pd-option').querySelector('[data-color-label]');
        const span = input.nextElementSibling.nextElementSibling; // sr-only name
        if (label && span) label.textContent = span.textContent;
      });
    });
  }

  // انتخاب وزن یا حجم در صفحه‌ی محصول: قیمت و برچسب بالای صفحه را به‌روز می‌کند
  function initProductVariants() {
    const wrap = document.querySelector('[data-pd-variants]');
    if (!wrap) return;
    const product = wrap.closest('[data-product]');
    const priceBox = document.querySelector('.pd-price');
    const label = wrap.closest('.pd-option').querySelector('[data-variant-label]');

    wrap.querySelectorAll('input').forEach((input) => {
      input.addEventListener('change', () => {
        const price = parseInt(input.dataset.variantPrice, 10);
        const sale = parseInt(input.dataset.variantSale, 10) || 0;
        if (product) {
          product.dataset.productPrice = String(sale || price);
          product.dataset.productVariant = input.dataset.variantLabel;
        }
        if (label) label.textContent = input.dataset.variantLabel;
        if (priceBox) {
          priceBox.innerHTML = `${sale ? `<del><span class="sr-only">قیمت قبلی: </span>${priceHtml(price)}</del>` : ''}<span><span class="price-now">${priceHtml(sale || price)}</span> <span class="currency">تومان</span></span>${sale ? `<span class="badge badge-sale">${toFa(Math.round((1 - sale / price) * 100))}٪ تخفیف</span>` : ''}`;
        }
      });
    });
  }

  // دکمه‌ی «افزودن به سبد» در صفحه‌ی محصول: اگر سایز الزامی است و انتخاب نشده، بدون افزودن متوقف می‌شود.
  // برای تعداد بیشتر از ۱، همین دکمه به تعداد لازم کلیک می‌شود (هر کلیک یک عدد به initCart اضافه می‌کند).
  function initProductAddToCart() {
    const addButton = document.querySelector('[data-pd-add]');
    if (!addButton) return;
    const sizeField = addButton.closest('.pd-info').querySelector('fieldset:has(input[name="pd-size"])');
    const qtyInput = document.getElementById('pd-qty');
    const product = addButton.closest('[data-product]');
    let extraPending = 0;

    addButton.addEventListener(
      'click',
      (event) => {
        if (extraPending > 0) {
          extraPending -= 1;
          return; // یکی از کلیک‌های برنامه‌ای برای تکمیل تعداد؛ بدون اعتبارسنجی دوباره از initCart عبور می‌کند
        }
        if (sizeField) {
          const chosen = sizeField.querySelector('input[name="pd-size"]:checked');
          const error = sizeField.querySelector('[data-size-error]');
          if (!chosen) {
            event.stopImmediatePropagation();
            event.preventDefault();
            if (error) error.hidden = false;
            sizeField.querySelector('input[name="pd-size"]').focus();
            return;
          }
          if (error) error.hidden = true;
          if (product) product.dataset.productVariant = chosen.value;
        }
        if (qtyInput) {
          const qty = Math.max(1, parseInt(qtyInput.value, 10) || 1);
          if (qty > 1) {
            extraPending = qty - 1;
            for (let i = 0; i < qty - 1; i++) addButton.click();
          }
        }
      },
      true
    );
  }

  // فرم ثبت نظر (فقط اعتبارسنجی سمت کاربر؛ برای ثبت واقعی به سرور خود وصل کنید)
  /* ------------------------------------------------------------------------
     اسلایدر صفحه‌ی اصلی (طرح ۲): [data-slider] با اسلایدهای [data-slide]
     پخش خودکار هر ۶ ثانیه؛ با نگه داشتن نشانگر یا فوکوس متوقف می‌شود و در حالت «کاهش حرکت» خودکار نمی‌چرخد.
     ------------------------------------------------------------------------ */
  function initSliders() {
    document.querySelectorAll('[data-slider]').forEach((slider) => {
      const slides = Array.from(slider.querySelectorAll('[data-slide]'));
      const dots = Array.from(slider.querySelectorAll('[data-slide-to]'));
      if (slides.length < 2) return;
      let index = 0;
      let timer = null;
      const show = (i) => {
        index = (i + slides.length) % slides.length;
        slides.forEach((s, k) => {
          s.hidden = k !== index;
          s.classList.toggle('is-active', k === index);
          if (k === index) s.querySelectorAll('img[loading="lazy"]').forEach((img) => (img.loading = 'eager'));
        });
        dots.forEach((d, k) => d.setAttribute('aria-pressed', String(k === index)));
      };
      const play = () => {
        if (prefersReducedMotion()) return;
        stop();
        timer = setInterval(() => show(index + 1), 6000);
      };
      const stop = () => timer && (clearInterval(timer), (timer = null));
      dots.forEach((d) => d.addEventListener('click', () => { show(parseInt(d.dataset.slideTo, 10)); play(); }));
      const next = slider.querySelector('[data-slide-next]');
      const prev = slider.querySelector('[data-slide-prev]');
      if (next) next.addEventListener('click', () => { show(index + 1); play(); });
      if (prev) prev.addEventListener('click', () => { show(index - 1); play(); });
      slider.addEventListener('mouseenter', stop);
      slider.addEventListener('mouseleave', play);
      slider.addEventListener('focusin', stop);
      slider.addEventListener('focusout', play);
      show(0);
      play();
    });
  }

  /* ------------------------------------------------------------------------
     اسلایدر افقی محصولات: دکمه‌های [data-rail-prev] و [data-rail-next] با شناسه‌ی فهرست
     ------------------------------------------------------------------------ */
  function initRails() {
    const step = (rail, dir) => {
      const card = rail.firstElementChild;
      const w = card ? card.getBoundingClientRect().width + 20 : rail.clientWidth;
      // در صفحه‌ی راست‌به‌چپ، «بعدی» یعنی حرکت به سمت چپ
      const rtl = getComputedStyle(rail).direction === 'rtl';
      rail.scrollBy({ left: (rtl ? -1 : 1) * dir * w, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
    };
    document.querySelectorAll('[data-rail-next]').forEach((b) => b.addEventListener('click', () => { const r = document.getElementById(b.dataset.railNext); if (r) step(r, 1); }));
    document.querySelectorAll('[data-rail-prev]').forEach((b) => b.addEventListener('click', () => { const r = document.getElementById(b.dataset.railPrev); if (r) step(r, -1); }));
  }

  /* ------------------------------------------------------------------------
     نظرات محصول: «نمایش نظرات بیشتر» و دکمه‌ی «مفید بود»
     ------------------------------------------------------------------------ */

  /* ------------------------------------------------------------------------
     راهنمای سایز: تبدیل سانتی‌متر/اینچ در جدول‌ها و سایزیاب
     اعداد جدول در ویژگی data-cm (مثلاً "82-86") نوشته می‌شوند.
     ------------------------------------------------------------------------ */
  // جدول اندازه‌ی بدن برای سایزیاب (حد بالای هر سایز، سانتی‌متر)
  const SIZE_CHART = {
    women: { sizes: ['S', 'M', 'L', 'XL', 'XXL'], nums: ['۳۶', '۳۸', '۴۰', '۴۲', '۴۴'], chest: [86, 90, 96, 102, 108], waist: [68, 72, 78, 84, 90], hip: [94, 98, 104, 110, 116] },
    men: { sizes: ['S', 'M', 'L', 'XL', 'XXL'], nums: ['۴۶', '۴۸', '۵۰', '۵۲', '۵۴'], chest: [94, 100, 106, 112, 118], waist: [82, 88, 94, 100, 106] },
    kids: { sizes: ['۲ سال', '۴ سال', '۶ سال', '۸ سال', '۱۰ سال'], height: [92, 104, 116, 128, 140] },
  };
  const toEnNum = (text) => parseFloat(String(text).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٫,]/g, '.'));

  function initSizeGuide() {
    // واحد اندازه
    const cells = document.querySelectorAll('[data-cm]');
    const unitBtns = document.querySelectorAll('[data-sg-unit]');
    const renderUnit = (unit) => {
      cells.forEach((cell) => {
        const parts = cell.dataset.cm.split('-').map(Number);
        const vals = parts.map((v) => (unit === 'in' ? (Math.round((v / 2.54) * 10) / 10).toString() : String(v)));
        cell.textContent = toFa(vals.join(' تا ')).replace(/\./g, '٫');
      });
      unitBtns.forEach((b) => {
        const on = b.dataset.sgUnit === unit;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
    };
    if (cells.length) renderUnit('cm');
    unitBtns.forEach((b) => b.addEventListener('click', () => renderUnit(b.dataset.sgUnit)));

    // سایزیاب
    const form = document.querySelector('[data-size-finder]');
    if (!form) return;
    const result = form.querySelector('[data-sg-result]');
    const fieldsFor = { women: ['chest', 'waist', 'hip'], men: ['chest', 'waist'], kids: ['height'] };
    const who = () => form.querySelector('input[name="sg-who"]:checked').value;
    const syncFields = () => {
      form.querySelectorAll('[data-sg-field]').forEach((f) => {
        f.hidden = !fieldsFor[who()].includes(f.dataset.sgField);
      });
      result.hidden = true;
    };
    form.querySelectorAll('input[name="sg-who"]').forEach((r) => r.addEventListener('change', syncFields));
    syncFields();

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const chart = SIZE_CHART[who()];
      let index = -1;
      let missing = false;
      fieldsFor[who()].forEach((key) => {
        const input = form.querySelector(`[name="${key}"]`);
        const value = toEnNum(input.value);
        if (!value) {
          missing = true;
          input.setAttribute('aria-invalid', 'true');
          return;
        }
        input.removeAttribute('aria-invalid');
        // بزرگ‌ترین سایز لازم بین همه‌ی اندازه‌ها انتخاب می‌شود
        let i = chart[key].findIndex((max) => value <= max);
        if (i === -1) i = chart[key].length;
        index = Math.max(index, i);
      });
      result.hidden = false;
      if (missing) {
        result.className = 'sg-result is-error';
        result.textContent = 'لطفاً همه‌ی اندازه‌ها را به سانتی‌متر وارد کنید.';
        return;
      }
      result.className = 'sg-result';
      if (index >= chart.sizes.length) {
        result.innerHTML = '<strong>اندازه‌ها از بزرگ‌ترین سایز جدول بیشترند.</strong><span>برای مدل‌های گشاد یا سفارشی با مشاوران ما تماس بگیرید.</span>';
        return;
      }
      const size = chart.sizes[index];
      const num = chart.nums ? ` (سایز عددی ${chart.nums[index]})` : '';
      const tip = who() === 'kids' ? 'بچه‌ها زود رشد می‌کنند؛ اگر نزدیک سایز بعدی است، بزرگ‌تر را بردارید.' : 'برای مدل‌های جذب، یک سایز بزرگ‌تر را هم در نظر بگیرید.';
      result.innerHTML = `<span>سایز پیشنهادی شما</span><strong>${escapeHtml(size)}</strong><span>${num ? escapeHtml(num.trim()) + ' · ' : ''}${tip}</span>`;
    });
  }

  function initReviews() {
    document.querySelectorAll('[data-reviews-more]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const hidden = btn.parentElement.querySelectorAll('[data-review-more]');
        hidden.forEach((el) => (el.hidden = false));
        if (hidden[0]) hidden[0].setAttribute('tabindex', '-1'), hidden[0].focus();
        btn.remove();
      })
    );
    document.querySelectorAll('[data-helpful]').forEach((btn) =>
      btn.addEventListener('click', () => {
        const count = btn.querySelector('[data-helpful-count]');
        const on = btn.getAttribute('aria-pressed') !== 'true';
        const n = parseInt(String(count.textContent).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)), 10) || 0;
        count.textContent = toFa(n + (on ? 1 : -1));
        btn.setAttribute('aria-pressed', String(on));
      })
    );
  }

  function initReviewForm() {
    document.querySelectorAll('[data-review-form]').forEach((form) => {
      const fields = Array.from(form.querySelectorAll('input[required], textarea[required]'));
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        let invalid = false;
        fields.forEach((field) => {
          const error = document.getElementById(`${field.id}-error`);
          const bad = field.type === 'textarea' || field.tagName === 'TEXTAREA' ? field.value.trim().length < (parseInt(field.dataset.min, 10) || 1) : field.value.trim() === '';
          if (bad) field.setAttribute('aria-invalid', 'true');
          else field.removeAttribute('aria-invalid');
          if (error) {
            error.hidden = !bad;
            error.textContent = bad ? (field.tagName === 'TEXTAREA' ? 'لطفاً نظر خود را کامل‌تر بنویسید.' : 'لطفاً نام خود را وارد کنید.') : '';
          }
          if (bad) invalid = true;
        });
        if (invalid) {
          fields.find((f) => f.getAttribute('aria-invalid') === 'true').focus();
          return;
        }
        form.hidden = true;
        const success = form.querySelector('[data-review-success]');
        if (success) {
          success.hidden = false;
          success.focus();
        }
      });
    });
  }

  /* ------------------------------------------------------------------------
     اعتبارسنجی عمومی فرم‌ها (پروفایل، آدرس، تسویه‌حساب، تماس با ما)
     هر فرم با data-validate بررسی می‌شود. قوانین از خود فیلدها خوانده می‌شوند:
       required          الزامی          type="email"      ایمیل معتبر
       data-phone        موبایل ایرانی   data-min          حداقل طول
       data-match="id"   باید با مقدار فیلد دیگر یکسان باشد (فقط اگر خودش پر است)
     بعد از اعتبارسنجی موفق، رویداد mahtab:valid-submit روی خود فرم ارسال می‌شود؛
     ثبت واقعی داده (ارسال به سرور یا ذخیره‌ی محلی) در هر صفحه جداگانه انجام می‌شود.
     ------------------------------------------------------------------------ */
  function initFormValidation() {
    const errorOf = (field) => document.getElementById(`${field.id}-error`) || (field.closest('.field') && field.closest('.field').querySelector('[data-field-error]'));

    const check = (field) => {
      const value = field.type === 'checkbox' ? field.checked : field.value.trim();
      const labelEl = field.form.querySelector(`label[for="${field.id}"]`);
      const name = labelEl ? labelEl.textContent.replace('*', '').trim() : 'این فیلد';

      if (field.required && (field.type === 'checkbox' ? !value : value === '')) {
        return field.tagName === 'SELECT' ? `لطفاً ${name} را انتخاب کنید.` : `لطفاً ${name} را وارد کنید.`;
      }
      if (value === '' || value === false) return '';
      if (field.type === 'email' && !EMAIL_PATTERN.test(value)) return 'ایمیل معتبر نیست؛ مثال درست: name@example.com';
      if (field.hasAttribute('data-phone') && !/^09\d{9}$/.test(toEn(value).replace(/[\s-]/g, ''))) {
        return 'شماره‌ی موبایل باید ۱۱ رقم باشد و با ۰۹ شروع شود.';
      }
      const min = parseInt(field.dataset.min || '0', 10);
      if (min && value.length < min) return `${name} باید دست‌کم ${toFa(min)} نویسه باشد.`;
      if (field.dataset.match) {
        const other = document.getElementById(field.dataset.match);
        if (other && value !== other.value.trim()) return 'با مقدار وارد‌شده یکسان نیست.';
      }
      return '';
    };

    document.querySelectorAll('form[data-validate]').forEach((form) => {
      const fields = () => Array.from(form.querySelectorAll('input, select, textarea')).filter((f) => f.id && !f.closest('[hidden]'));

      const show = (field, message) => {
        const error = errorOf(field);
        if (message) field.setAttribute('aria-invalid', 'true');
        else field.removeAttribute('aria-invalid');
        if (error) {
          error.textContent = message;
          error.hidden = !message;
        }
      };

      form.addEventListener('focusout', (event) => {
        const field = event.target;
        if (field.matches('input, select, textarea') && field.id && (field.value || field.getAttribute('aria-invalid') === 'true')) show(field, check(field));
      });
      form.addEventListener('input', (event) => {
        const field = event.target;
        if (field.matches('input, textarea') && field.id && field.getAttribute('aria-invalid') === 'true') show(field, check(field));
      });
      form.addEventListener('change', (event) => {
        const field = event.target;
        if (field.matches('select') && field.id && field.getAttribute('aria-invalid') === 'true') show(field, check(field));
      });

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const invalid = fields().filter((field) => {
          const message = check(field);
          show(field, message);
          return Boolean(message);
        });
        if (invalid.length) {
          invalid[0].focus();
          return;
        }
        form.dispatchEvent(new CustomEvent('mahtab:valid-submit', { bubbles: true }));
      });
    });
  }

  /* ------------------------------------------------------------------------
     آدرس‌های حساب کاربری (CRUD ساده در حافظه‌ی مرورگر؛ برای فروشگاه واقعی به حساب سمت سرور وصل کنید)
     ------------------------------------------------------------------------ */
  const SAMPLE_ADDRESSES = [
    { id: 'a1', title: 'خانه', receiver: 'مریم رضایی', phone: '09120000000', postal: '1456789012', full: 'تهران، خیابان ولیعصر، کوچه‌ی بهار، پلاک ۸، واحد ۳', isDefault: true },
    { id: 'a2', title: 'محل کار', receiver: 'مریم رضایی', phone: '09350000000', postal: '1987654321', full: 'تهران، خیابان شریعتی، ساختمان آفتاب، طبقه‌ی ۴، واحد ۱۲', isDefault: false },
  ];

  function initAddressBook() {
    const list = document.querySelector('[data-address-list]');
    if (!list) return;
    const emptyMsg = document.querySelector('[data-address-empty]');
    const form = document.querySelector('[data-address-form]');
    const formTitle = form.querySelector('[data-address-form-title]');
    const addToggle = document.querySelector('[data-address-add-toggle]');
    const cancelBtn = form.querySelector('[data-address-cancel]');
    let addresses = store.read('addresses', null);
    if (!addresses) {
      addresses = SAMPLE_ADDRESSES;
      store.write('addresses', addresses);
    }

    const closeForm = () => {
      form.hidden = true;
      addToggle.setAttribute('aria-expanded', 'false');
      form.reset();
      form.querySelectorAll('[aria-invalid]').forEach((f) => f.removeAttribute('aria-invalid'));
      form.querySelectorAll('[data-field-error]').forEach((e) => (e.hidden = true));
    };

    const openForm = (address) => {
      formTitle.textContent = address ? 'ویرایش آدرس' : 'آدرس جدید';
      form.elements.id.value = address ? address.id : '';
      form.elements.title.value = address ? address.title : '';
      form.elements.receiver.value = address ? address.receiver : '';
      form.elements.phone.value = address ? address.phone : '';
      form.elements.postal.value = address ? address.postal : '';
      form.elements.full.value = address ? address.full : '';
      form.hidden = false;
      addToggle.setAttribute('aria-expanded', 'true');
      form.querySelector('input[name="title"]').focus();
      form.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' });
    };

    const render = () => {
      list.innerHTML = addresses
        .map(
          (a) => `<article class="address-card">
  ${a.isDefault ? '<span class="badge badge-soft address-default">پیش‌فرض</span>' : ''}
  <h3>${escapeHtml(a.title)}</h3>
  <p>${escapeHtml(a.receiver)}</p>
  <p>${escapeHtml(a.full)}</p>
  <p>کد پستی: <span class="num">${toFa(a.postal)}</span></p>
  <p dir="ltr" class="address-phone">${escapeHtml(a.phone)}</p>
  <div class="address-actions">
    <button type="button" data-address-edit="${a.id}">ویرایش</button>
    <button type="button" data-address-delete="${a.id}">حذف</button>
    ${a.isDefault ? '' : `<button type="button" data-address-default="${a.id}">انتخاب به‌عنوان پیش‌فرض</button>`}
  </div>
</article>`
        )
        .join('');
      emptyMsg.hidden = addresses.length !== 0;
      list.hidden = addresses.length === 0;
      store.write('addresses', addresses);
    };

    addToggle.addEventListener('click', () => (form.hidden ? openForm(null) : closeForm()));
    cancelBtn.addEventListener('click', closeForm);

    list.addEventListener('click', (event) => {
      const editId = event.target.closest('[data-address-edit]');
      const delId = event.target.closest('[data-address-delete]');
      const defId = event.target.closest('[data-address-default]');
      if (editId) openForm(addresses.find((a) => a.id === editId.dataset.addressEdit));
      else if (delId) {
        addresses = addresses.filter((a) => a.id !== delId.dataset.addressDelete);
        announce('آدرس حذف شد');
        render();
      } else if (defId) {
        addresses.forEach((a) => (a.isDefault = a.id === defId.dataset.addressDefault));
        render();
      }
    });

    form.addEventListener('mahtab:valid-submit', () => {
      const data = Object.fromEntries(new FormData(form).entries());
      if (data.id) {
        const existing = addresses.find((a) => a.id === data.id);
        Object.assign(existing, data);
      } else {
        addresses.push({ id: `a${Date.now()}`, isDefault: addresses.length === 0, ...data });
      }
      announce('آدرس ذخیره شد');
      closeForm();
      render();
    });

    render();
  }

  /* ------------------------------------------------------------------------
     فرم ویرایش پروفایل (فقط اعتبارسنجی و نمایش پیام موفقیت؛ ذخیره‌ی واقعی نیاز به سرور دارد)
     ------------------------------------------------------------------------ */
  function initAccountEditForm() {
    const form = document.querySelector('.account-form[data-validate]');
    if (!form) return;
    form.addEventListener('mahtab:valid-submit', () => {
      const success = document.querySelector('[data-edit-success]');
      if (success) {
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     فرم تماس با ما (فقط اعتبارسنجی و نمایش پیام موفقیت؛ ثبت واقعی نیاز به سرور دارد)
     ------------------------------------------------------------------------ */
  function initContactForm() {
    const form = document.querySelector('[data-contact-form]');
    if (!form) return;
    form.addEventListener('mahtab:valid-submit', () => {
      const success = document.querySelector('[data-contact-success]');
      if (success) {
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }
    });
  }

  /* ------------------------------------------------------------------------
     فرم ثبت نظر زیر مقاله (فقط اعتبارسنجی و نمایش پیام موفقیت)
     ------------------------------------------------------------------------ */
  function initCommentForm() {
    const form = document.querySelector('[data-comment-form]');
    if (!form) return;
    form.addEventListener('mahtab:valid-submit', () => {
      const success = document.querySelector('[data-comment-success]');
      if (success) {
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }
    });
  }

  // عدد علاقه‌مندی در کارت آماری داشبورد حساب کاربری
  function initWishCountBadge() {
    const el = document.querySelector('[data-wish-count-full]');
    if (el) el.textContent = toFa(store.read('wishlist', []).length);
  }

  /* ------------------------------------------------------------------------
     کارت محصول ساده برای صفحه‌هایی که سمت کاربر رندر می‌شوند (علاقه‌مندی‌ها)
     همان ساختار و کلاس‌های p-card را می‌سازد تا با بقیه‌ی سایت یکدست باشد.
     ------------------------------------------------------------------------ */
  function simpleProductCard(p, extraButton) {
    const price = p.finalPrice ?? p.price;
    const sale = p.salePrice || null;
    return `<article class="p-card" data-product data-product-id="${p.id}" data-product-name="${escapeHtml(p.name)}" data-product-price="${price}" data-product-image="${ASSETS}images/${p.__demo}/products/${p.image}.${p.imageExt || 'svg'}">
  <div class="p-media">
    <a class="p-media-link" href="product-${p.image}.html" tabindex="-1" aria-hidden="true">
      <img src="${ASSETS}images/${p.__demo}/products/${p.image}.${p.imageExt || 'svg'}" alt="" width="600" height="600" loading="lazy" decoding="async">
    </a>
    <div class="p-tools">${extraButton || ''}</div>
  </div>
  <div class="p-body">
    <p class="p-cat">${escapeHtml(p.category || '')}</p>
    <h3 class="p-title"><a href="product-${p.image}.html">${escapeHtml(p.name)}</a></h3>
    <div class="p-foot">
      <div class="price"><span><span class="price-now">${priceHtml(sale || price)}</span> <span class="currency">تومان</span></span></div>
      <button type="button" class="btn btn-sm p-add" data-add-to-cart>${'<svg class="icon" aria-hidden="true"><use href="#i-bag"/></svg>'} <span data-cart-label>افزودن به سبد</span></button>
    </div>
  </div>
</article>`;
  }

  function readEmbeddedProducts() {
    const el = document.getElementById('product-data');
    if (!el) return [];
    try {
      const demo = document.documentElement.dataset.demo;
      return JSON.parse(el.textContent).map((p) => ({ ...p, __demo: demo }));
    } catch (e) {
      return [];
    }
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی علاقه‌مندی‌ها
     ------------------------------------------------------------------------ */
  function initWishlistPage() {
    const grid = document.querySelector('[data-wish-page-grid]');
    if (!grid) return;
    const products = readEmbeddedProducts();
    const emptyMsg = document.querySelector('[data-wish-page-empty]');
    const countEl = document.querySelector('[data-wish-page-count]');

    const render = () => {
      const ids = store.read('wishlist', []);
      const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
      grid.innerHTML = items
        .map((p) => simpleProductCard(p, `<button type="button" class="p-tool" data-wish-remove="${p.id}" aria-label="حذف ${escapeHtml(p.name)} از علاقه‌مندی‌ها">${'<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'}</button>`))
        .join('');
      emptyMsg.hidden = items.length !== 0;
      grid.hidden = items.length === 0;
      if (countEl) countEl.textContent = toFa(items.length);
      // کارت‌ها هر بار از نو ساخته می‌شوند؛ دکمه‌ی «افزودن به سبد» باید دوباره فعال شود
      rebindAddToCart(grid);
    };

    grid.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-wish-remove]');
      if (!btn) return;
      const ids = store.read('wishlist', []).filter((id) => id !== btn.dataset.wishRemove);
      store.write('wishlist', ids);
      announce('از علاقه‌مندی‌ها حذف شد');
      render();
    });

    render();
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی مقایسه‌ی محصولات
     ------------------------------------------------------------------------ */
  function initComparePage() {
    const table = document.querySelector('[data-compare-table]');
    if (!table) return;
    const products = readEmbeddedProducts();
    const wrap = document.querySelector('[data-compare-page]');
    const emptyMsg = document.querySelector('[data-compare-page-empty]');

    const ROWS = [
      { label: 'قیمت', get: (p) => `${priceHtml(p.salePrice || p.finalPrice || p.price)} تومان` },
      { label: 'امتیاز', get: (p) => (p.rating ? `${toFa(p.rating)} از ۵ (${toFa(p.reviews || 0)} نظر)` : '—') },
      { label: 'دسته', get: (p) => p.category || '—' },
      { label: 'برند', get: (p) => p.brand || '—' },
      { label: 'رنگ‌ها', get: (p) => (p.colors ? p.colors.map((c) => c.name).join('، ') : '—') },
      { label: 'سایزها', get: (p) => (p.sizes ? p.sizes.join('، ') : '—') },
    ];

    const render = () => {
      const ids = store.read('compare', []);
      const items = ids.map((id) => products.find((p) => p.id === id)).filter(Boolean);
      wrap.hidden = items.length === 0;
      emptyMsg.hidden = items.length !== 0;
      if (!items.length) {
        table.innerHTML = '';
        return;
      }
      const head = `<tr><th scope="col" class="compare-row-label"><span class="sr-only">ویژگی</span></th>${items
        .map(
          (p) => `<th scope="col">
  <button type="button" class="icon-btn compare-remove" data-compare-remove="${p.id}" aria-label="حذف ${escapeHtml(p.name)} از مقایسه">${'<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'}</button>
  <img src="${ASSETS}images/${p.__demo}/products/${p.image}.${p.imageExt || 'svg'}" alt="" width="140" height="140" loading="lazy">
  <a href="product-${p.image}.html">${escapeHtml(p.name)}</a>
</th>`
        )
        .join('')}</tr>`;
      const rows = ROWS.map(
        (row) => `<tr><th scope="row">${row.label}</th>${items.map((p) => `<td>${row.get(p)}</td>`).join('')}</tr>`
      ).join('');
      const addRow = `<tr><th scope="row"><span class="sr-only">افزودن به سبد</span></th>${items
        .map(
          (p) =>
            `<td data-product data-product-id="${p.id}" data-product-name="${escapeHtml(p.name)}" data-product-price="${p.salePrice || p.finalPrice || p.price}" data-product-image="${ASSETS}images/${p.__demo}/products/${p.image}.${p.imageExt || 'svg'}"><button type="button" class="btn btn-sm btn-primary" data-add-to-cart><span data-cart-label>افزودن به سبد</span></button></td>`
        )
        .join('')}</tr>`;
      table.innerHTML = `<caption class="sr-only">مقایسه‌ی ویژگی‌های محصولات انتخاب‌شده</caption><thead>${head}</thead><tbody>${rows}${addRow}</tbody>`;
      // کارت‌ها هر بار از نو ساخته می‌شوند؛ دکمه‌ی «افزودن به سبد» باید دوباره فعال شود
      rebindAddToCart(table);
    };

    table.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-compare-remove]');
      if (!btn) return;
      const ids = store.read('compare', []).filter((id) => id !== btn.dataset.compareRemove);
      store.write('compare', ids);
      announce('از مقایسه حذف شد');
      render();
    });

    render();
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی سبد خرید (نمای کامل، همان داده‌ی سبد کشویی)
     ------------------------------------------------------------------------ */
  const FREE_SHIPPING_FROM = 2000000;
  const SHIPPING_COST = 250000;

  function cartItemRow(item) {
    return `<li class="cart-item cart-page-item" data-id="${escapeHtml(item.id)}">
  <img class="cart-thumb" src="${escapeHtml(item.image)}" width="90" height="90" alt="">
  <div class="cart-info">
    <a class="cart-name" href="${productUrl(item)}">${escapeHtml(item.name)}</a>
    ${item.variant ? `<p class="cart-variant">${escapeHtml(item.variant)}</p>` : ''}
    <p class="cart-price">${priceHtml(item.price)} <span class="currency">تومان</span></p>
    <div class="qty" role="group" aria-label="تعداد ${escapeHtml(item.name)}">
      <button type="button" data-qty="1" aria-label="افزایش تعداد">${'<svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>'}</button>
      <span>${toFa(item.qty)}</span>
      <button type="button" data-qty="-1" aria-label="کاهش تعداد">${'<svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg>'}</button>
    </div>
  </div>
  <p class="cart-page-line-total">${priceHtml(item.price * item.qty)} <span class="currency">تومان</span></p>
  <button type="button" class="cart-remove" data-remove aria-label="حذف ${escapeHtml(item.name)} از سبد">${'<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'}</button>
</li>`;
  }

  function initCartPage() {
    const page = document.querySelector('[data-cart-page]');
    if (!page) return;
    const list = document.querySelector('[data-cart-page-items]');
    const emptyMsg = document.querySelector('[data-cart-page-empty]');
    const countEl = document.querySelector('[data-cart-page-count]');
    const subtotalEl = document.querySelector('[data-cart-page-subtotal]');
    const shippingEl = document.querySelector('[data-cart-page-shipping]');
    const totalEl = document.querySelector('[data-cart-page-total]');
    const noteEl = document.querySelector('[data-cart-shipping-note]');
    const checkoutLink = document.querySelector('[data-cart-checkout]');

    const render = () => {
      const items = cartStore.read();
      const count = items.reduce((sum, i) => sum + i.qty, 0);
      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const shipping = items.length === 0 || subtotal >= FREE_SHIPPING_FROM ? 0 : SHIPPING_COST;

      page.hidden = items.length === 0;
      emptyMsg.hidden = items.length !== 0;
      if (!items.length) return;

      list.innerHTML = items.map(cartItemRow).join('');
      if (countEl) countEl.textContent = toFa(count);
      subtotalEl.innerHTML = `${priceHtml(subtotal)} <span class="currency">تومان</span>`;
      shippingEl.innerHTML = shipping === 0 ? 'رایگان' : `${priceHtml(shipping)} <span class="currency">تومان</span>`;
      totalEl.innerHTML = `${priceHtml(subtotal + shipping)} <span class="currency">تومان</span>`;
      if (noteEl) {
        const remain = FREE_SHIPPING_FROM - subtotal;
        noteEl.textContent = remain > 0 ? `${formatPrice(remain)} تومان دیگر خرید کنید تا ارسال رایگان شود.` : 'ارسال این سفارش رایگان است.';
      }
      if (checkoutLink) checkoutLink.setAttribute('aria-disabled', String(items.length === 0));
    };

    list &&
      list.addEventListener('click', (event) => {
        const row = event.target.closest('.cart-item');
        if (!row) return;
        const items = cartStore.read();
        const item = items.find((i) => i.id === row.dataset.id);
        if (!item) return;
        const qtyBtn = event.target.closest('[data-qty]');
        const removeBtn = event.target.closest('[data-remove]');
        if (qtyBtn) {
          item.qty += parseInt(qtyBtn.dataset.qty, 10);
          if (item.qty < 1) items.splice(items.indexOf(item), 1);
        } else if (removeBtn) {
          items.splice(items.indexOf(item), 1);
          announce(`${item.name} از سبد حذف شد`);
        } else return;
        cartStore.write(items);
        document.dispatchEvent(new CustomEvent('mahtab:cart-render'));
        render();
      });

    document.addEventListener('mahtab:cart-render', render);
    window.addEventListener('storage', (event) => {
      if (event.key === store.key('cart')) render();
    });

    // کد تخفیف: فقط نمایشی (کد YALDA20 را به‌عنوان نمونه می‌پذیرد)
    const couponForm = document.querySelector('[data-coupon-form]');
    if (couponForm) {
      couponForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = couponForm.querySelector('input');
        const error = document.querySelector('[data-coupon-error]');
        const code = input.value.trim().toUpperCase();
        if (code === 'MAHTAB10') {
          error.hidden = true;
          announce('کد تخفیف اعمال شد');
          input.value = '';
        } else {
          error.textContent = 'کد تخفیف نامعتبر است.';
          error.hidden = false;
        }
      });
    }

    render();
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی تسویه‌حساب
     ------------------------------------------------------------------------ */
  function initCheckout() {
    const page = document.querySelector('[data-checkout-page]');
    if (!page) return;
    const list = document.querySelector('[data-checkout-items]');
    const emptyMsg = document.querySelector('[data-checkout-empty]');
    const subtotalEl = document.querySelector('[data-checkout-subtotal]');
    const shippingEl = document.querySelector('[data-checkout-shipping]');
    const totalEl = document.querySelector('[data-checkout-total]');
    const form = document.querySelector('.checkout-form');

    const currentShippingCost = () => (document.querySelector('input[name="shipping"]:checked').value === 'express' ? 180000 : 0);

    const render = () => {
      const items = cartStore.read();
      page.hidden = items.length === 0;
      emptyMsg.hidden = items.length !== 0;
      if (!items.length) return;
      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const shipping = currentShippingCost();
      list.innerHTML = items
        .map((i) => `<li><img src="${escapeHtml(i.image)}" width="48" height="48" alt=""><span class="checkout-mini-name">${escapeHtml(i.name)} × ${toFa(i.qty)}</span><span>${priceHtml(i.price * i.qty)}</span></li>`)
        .join('');
      subtotalEl.innerHTML = `${priceHtml(subtotal)} <span class="currency">تومان</span>`;
      shippingEl.innerHTML = shipping === 0 ? 'رایگان' : `${priceHtml(shipping)} <span class="currency">تومان</span>`;
      totalEl.innerHTML = `${priceHtml(subtotal + shipping)} <span class="currency">تومان</span>`;
    };

    document.querySelectorAll('input[name="shipping"]').forEach((input) => input.addEventListener('change', render));
    render();

    if (form) {
      form.addEventListener('mahtab:valid-submit', () => {
        // ثبت سفارش: در فروشگاه واقعی اینجا به درگاه پرداخت یا سرور وصل می‌شود
        const orderNumber = `۱۰${toFa(Math.floor(500 + Math.random() * 499))}`;
        store.write('cart', []);
        try {
          sessionStorage.setItem(`mahtab-${document.documentElement.dataset.demo}-last-order`, orderNumber);
        } catch (e) {
          /* بدون حافظه‌ی نشست هم مشکلی نیست */
        }
        window.location.href = 'order-received.html';
      });
    }
  }

  function initOrderReceived() {
    const el = document.querySelector('[data-order-number]');
    if (!el) return;
    let number = '—';
    try {
      number = sessionStorage.getItem(`mahtab-${document.documentElement.dataset.demo}-last-order`) || '۱۰۵۰۰';
    } catch (e) {
      number = '۱۰۵۰۰';
    }
    el.textContent = number;
  }

  /* ------------------------------------------------------------------------
     اجرا
     ------------------------------------------------------------------------ */
  initHeader();
  initDisclosures();
  initMegaMenu();
  initSearchPanel();
  initSavedLists();
  initCardVariants();
  initTabs();
  initCart();
  initAddAll();
  initShop();
  initProductGallery();
  initQuantityStepper();
  initProductColorLabel();
  initProductVariants();
  initProductAddToCart();
  initSliders();
  initRails();
  initReviews();
  initSizeGuide();
  initReviewForm();
  initNewsletter();
  initCountdown();
  initReveal();
  initFormValidation();
  initAddressBook();
  initAccountEditForm();
  initContactForm();
  initCommentForm();
  initWishCountBadge();
  initWishlistPage();
  initComparePage();
  initCartPage();
  initCheckout();
  initOrderReceived();

  // ابزارها برای custom.js
  window.Mahtab = { toFa, toEn, formatPrice, priceHtml, store, cartStore, drawers, announce };
})();
