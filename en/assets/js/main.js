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
  const toFa = (value) => String(value);
  const toEn = (value) => String(value).replace(/[۰-۹]/g, (d) => FA_DIGITS.indexOf(d));
  const formatPrice = (value) => new Intl.NumberFormat('en-US').format(value);

  // قیمت به‌صورت HTML: هر جداکننده‌ی ٬ در span.num-sep (مثل خروجی build)
  const priceHtml = (value) => `<span class="num">$${formatPrice(value)}</span>`;

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
      wish: { key: 'wishlist', badge: '[data-wish-count]', added: 'Added to wishlist', removed: 'Removed from wishlist' },
      compare: { key: 'compare', badge: '[data-compare-count]', added: 'Added to compare list', removed: 'Removed from compare list', limit: COMPARE_LIMIT },
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
              announce(`You can compare up to ${toFa(cfg.limit)} products.`);
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
        box.innerHTML = `${label ? label.outerHTML : ''}${sale ? `<del><span class="sr-only">Previous price: </span>${priceHtml(price)}</del>` : ''}<span><span class="price-now">${priceHtml(sale || price)}</span> <span class="currency"></span></span>`;
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

  // تصویر کالای ذخیره‌شده در سبد: مسیر از روی پوشه‌ی images همین نسخه از نو ساخته می‌شود
  // تا اگر قالب جابه‌جا شد یا سبد از نسخه‌ی دیگری آمده بود، تصویر شکسته نشود
  const itemImage = (src) => {
    const s = String(src || '');
    const i = s.lastIndexOf('/images/');
    return i >= 0 ? ASSETS + s.slice(i + 1) : s;
  };
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
      openers.forEach((btn) => btn.setAttribute('aria-label', n ? `Cart, ${toFa(n)} items` : 'Cart, empty'));
    };

    const render = () => {
      if (!panel) return;
      const n = count();
      list.innerHTML = items
        .map((item) => {
          const name = escapeHtml(item.name);
          return `<li class="cart-item" data-id="${escapeHtml(item.id)}">
  <img class="cart-thumb" src="${escapeHtml(itemImage(item.image))}" onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src=this.src.replace(/[.](svg|jpg|png)$/,'.webp')}else{this.style.visibility='hidden'}" width="76" height="76" alt="">
  <div class="cart-info">
    <p class="cart-name">${name}</p>
    ${item.variant ? `<p class="cart-variant">${escapeHtml(item.variant)}</p>` : ''}
    <p class="cart-price">${priceHtml(item.price * item.qty)} <span class="currency"></span></p>
    <div class="qty" role="group" aria-label="Quantity of ${name}">
      <button type="button" data-qty="1" aria-label="Increase quantity of ${name}"><svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg></button>
      <span>${toFa(item.qty)}</span>
      <button type="button" data-qty="-1" aria-label="Decrease quantity of ${name}"><svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg></button>
    </div>
  </div>
  <button type="button" class="cart-remove" data-remove aria-label="Remove ${name} from cart"><svg class="icon" aria-hidden="true"><use href="#i-close"/></svg></button>
</li>`;
        })
        .join('');
      list.hidden = n === 0;
      empty.hidden = n !== 0;
      foot.hidden = n === 0;
      total.innerHTML = priceHtml(items.reduce((sum, i) => sum + i.price * i.qty, 0));
      headingCount.textContent = n ? `(${toFa(n)})` : '';
      // نوار پیشرفت ارسال رایگان در سبد کشویی
      const ship = panel.querySelector('[data-mc-ship]');
      if (ship) {
        const sub = items.reduce((sum, i) => sum + i.price * i.qty, 0);
        const goal = 100;
        const remain = goal - sub;
        ship.hidden = n === 0;
        ship.classList.toggle('is-done', remain <= 0);
        ship.querySelector('[data-mc-ship-text]').innerHTML = remain > 0 ? `Only <strong>${priceHtml(remain)}</strong> away from free shipping` : '<strong>Great!</strong> This order ships free';
        ship.querySelector('[data-mc-ship-bar]').style.width = `${Math.min(100, Math.round((sub / goal) * 100))}%`;
        const cost = panel.querySelector('[data-mc-ship-cost]');
        if (cost) cost.textContent = remain <= 0 ? 'Free' : 'Calculated at checkout';
      }
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
          say(`${data.productName}${variant ? ` (${variant})` : ''} added to cart`);

          button.classList.add('is-added');
          if (label) label.textContent = 'added';
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
        say(item.qty < 1 ? `${item.name} removed from cart` : `Quantity of ${item.name}: ${toFa(item.qty)}`);
      } else if (removeBtn) {
        items.splice(index, 1);
        say(`${item.name} removed from cart`);
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
        if (!value) return showError('Please enter your email.');
        if (!EMAIL_PATTERN.test(value)) return showError('That email isn\'t valid. Example: name@example.com');
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
      // data-countdown="daily": تا پایان امروز (نیمه‌شب) و هر روز از نو
      if (timer.dataset.countdown === 'daily') { const d = new Date(); d.setHours(24, 0, 0, 0); end = d.getTime(); }
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
    document.documentElement.classList.add('reveal-ready');
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
          const map = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last };
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
        announce('All items in this look were added to your cart');
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
    params.forEach((value, key) => { if (!['sort', 'sale', 'page', 'q'].includes(key) && value) urlTags.push(value); });
    // جستجو از فرم هدر: shop.html?q=پالتو ؛ در نام، دسته، برند و رنگ محصول جستجو می‌شود
    const normalizeFa = (text) => String(text || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[\u200c\u200f\u200e]/g, ' ').replace(/\s+/g, ' ').trim();
    const urlQuery = normalizeFa(params.get('q'));
    const queryWords = urlQuery ? urlQuery.split(' ') : [];
    document.querySelectorAll('input[name="q"]').forEach((input) => { if (params.get('q')) input.value = params.get('q'); });
    const urlSale = params.get('sale') === '1';
    if (sortSelect && params.get('sort') && [...sortSelect.options].some((o) => o.value === params.get('sort'))) sortSelect.value = params.get('sort');
    if (queryWords.length) {
      const title = document.querySelector('.shop-head .section-title, .sh-title');
      if (title) title.textContent = `Search results: “${params.get('q').trim()}»`;
      const head = document.querySelector('.shop-head-count, .sh-sub');
      if (head && !head.querySelector('[data-clear-url]')) head.insertAdjacentHTML('beforeend', ' · <a href="shop.html" data-clear-url>Show all products</a>');
    } else if ((urlTags.length && hasTags) || urlSale || params.get('sort')) {
      const q = location.search;
      // عنوان صفحه: نام همان دسته از روی لینک‌های منو (به‌جز «مشاهده‌ی همه»)، یا از فهرست data-filter-labels
      let labels = {};
      try { labels = JSON.parse((document.getElementById('filter-labels') || {}).textContent || '{}'); } catch (e) { labels = {}; }
      const names = [...document.querySelectorAll('a[href]')]
        .filter((a) => a.getAttribute('href').endsWith(`shop.html${q}`))
        .map((a) => (a.querySelector('strong, span') || a).textContent.trim().split('\n')[0].trim())
        .filter((t) => t && !t.startsWith('View'));
      const label = labels[q.replace(/^\?/, '')] || names.sort((a, b) => a.length - b.length)[0];
      const title = document.querySelector('.shop-head .section-title, .sh-title');
      if (title && label) title.textContent = label;
      const head = document.querySelector('.shop-head-count, .sh-sub');
      if (head && !head.querySelector('[data-clear-url]')) head.insertAdjacentHTML('beforeend', ' · <a href="shop.html" data-clear-url>Show all products</a>');
    }

    // اگر دسته‌ی نشانی صفحه در درخت دسته‌بندی کناری هست، همان گزینه تیک بخورد و شاخه‌اش باز شود (قابل برداشتن توسط کاربر)
    const tree = document.querySelector('[data-filter="tag"]');
    if (tree && hasTags) {
      for (let i = urlTags.length - 1; i >= 0; i--) {
        const box = tree.querySelector(`input[value="${CSS.escape(urlTags[i])}"]`);
        if (!box) continue;
        box.checked = true;
        for (let d = box.closest('details'); d; d = d.parentElement.closest('details')) d.open = true;
        urlTags.splice(i, 1);
      }
    }

    const checkedValues = (name) => Array.from(document.querySelectorAll(`[data-filter="${name}"] input:checked`)).map((i) => i.value);

    const priceBounds = priceBox ? { min: parseInt(priceBox.dataset.min, 10), max: parseInt(priceBox.dataset.max, 10) } : null;
    // بازه‌ی قیمت انتخاب‌شده (منبع اصلی؛ اسلایدرها و کادرهای عددی فقط آن را نشان می‌دهند)
    const priceState = priceBounds ? { lo: priceBounds.min, hi: priceBounds.max } : null;
    const currentPriceRange = () => [priceState.lo, priceState.hi];
    const parsePrice = (text) => parseInt(String(text).replace(/[۰-۹]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, (d) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[^\d]/g, ''), 10);

    const matches = (card) => {
      const cats = checkedValues('cat');
      const brands = checkedValues('brand');
      const colors = checkedValues('color');
      const sizes = checkedValues('size');
      if (cats.length && !cats.includes(card.dataset.cat)) return false;
      // دسته‌بندی درختی کنار فروشگاه (برچسب‌های data-tags؛ هر کدام از گزینه‌های تیک‌خورده کافی است)
      const tags = checkedValues('tag');
      if (tags.length && !tags.some((t) => (card.dataset.tags || '').split('|').includes(t))) return false;
      if (urlTags.length && hasTags && !urlTags.every((t) => (card.dataset.tags || '').split('|').includes(t))) return false;
      if (urlSale && !(card.dataset.badges || '').split('|').includes('sale')) return false;
      if (queryWords.length) {
        const text = normalizeFa([card.dataset.productName, card.dataset.cat, card.dataset.brand, (card.dataset.colors || '').replace(/\|/g, ' ')].join(' '));
        if (!queryWords.every((w) => text.includes(w))) return false;
      }
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
      let html = btn('Previous', 'prev', page === 1 ? 'disabled aria-label="Previous page"' : 'aria-label="Previous page"');
      // صفحه‌ی اول و آخر، و دو صفحه‌ی اطراف صفحه‌ی فعلی؛ بقیه با «…»
      let last = 0;
      for (let i = 1; i <= pages; i++) {
        if (i !== 1 && i !== pages && Math.abs(i - page) > 1) continue;
        if (i - last > 1) html += '<span class="pagination-gap" aria-hidden="true">…</span>';
        html += btn(toFa(i), i, i === page ? 'aria-current="page"' : `aria-label="Page ${toFa(i)}"`);
        last = i;
      }
      html += btn('Next', 'next', page === pages ? 'disabled aria-label="Next page"' : 'aria-label="Next page"');
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

    document.querySelectorAll('[data-filter] input').forEach((input) =>
      input.addEventListener('change', () => {
        page = 1;
        render();
      })
    );
    if (sortSelect) sortSelect.addEventListener('change', () => { page = 1; render(); });

    // قیمت: اسلایدرها و کادرهای عددی (با جداکننده‌ی فارسی) همیشه با هم هماهنگ‌اند
    function setPriceRange(lo, hi, changed) {
      if (!priceBox) return;
      lo = Number.isFinite(lo) ? lo : priceBounds.min;
      hi = Number.isFinite(hi) ? hi : priceBounds.max;
      lo = Math.min(Math.max(lo, priceBounds.min), priceBounds.max);
      hi = Math.min(Math.max(hi, priceBounds.min), priceBounds.max);
      if (lo > hi) {
        if (changed === 'min') hi = lo;
        else lo = hi;
      }
      priceState.lo = lo;
      priceState.hi = hi;
      sliderMin.value = lo;
      sliderMax.value = hi;
      priceMinInput.value = formatPrice(lo);
      priceMaxInput.value = formatPrice(hi);
      const range = priceBounds.max - priceBounds.min || 1;
      priceBox.style.setProperty('--p1', `${((lo - priceBounds.min) / range) * 100}%`);
      priceBox.style.setProperty('--p2', `${((hi - priceBounds.min) / range) * 100}%`);
    }

    if (priceBox) {
      sliderMin.addEventListener('input', () => { setPriceRange(parseInt(sliderMin.value, 10), priceState.hi, 'min'); page = 1; render(); });
      sliderMax.addEventListener('input', () => { setPriceRange(priceState.lo, parseInt(sliderMax.value, 10), 'max'); page = 1; render(); });
      const fromField = (field, which) => {
        const v = parsePrice(field.value);
        if (which === 'min') setPriceRange(v, priceState.hi, 'min');
        else setPriceRange(priceState.lo, v, 'max');
        page = 1;
        render();
      };
      priceMinInput.addEventListener('change', () => fromField(priceMinInput, 'min'));
      priceMaxInput.addEventListener('change', () => fromField(priceMaxInput, 'max'));
      [priceMinInput, priceMaxInput].forEach((field) => {
        field.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); field.dispatchEvent(new Event('change')); } });
        field.addEventListener('focus', () => field.select());
      });
      setPriceRange(priceBounds.min, priceBounds.max);
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
        // جستجو یا فیلتر نشانی فعال است: برگشت به همه‌ی محصولات
        if (queryWords.length || (urlTags.length && hasTags) || urlSale) {
          location.href = 'shop.html';
          return;
        }
        document.querySelectorAll('[data-filter] input:checked').forEach((input) => (input.checked = false));
        page = 1;
        if (priceBox) setPriceRange(priceBounds.min, priceBounds.max);
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
          priceBox.innerHTML = `${sale ? `<del><span class="sr-only">Previous price: </span>${priceHtml(price)}</del>` : ''}<span><span class="price-now">${priceHtml(sale || price)}</span> <span class="currency"></span></span>${sale ? `<span class="badge badge-sale">${toFa(Math.round((1 - sale / price) * 100))}% off</span>` : ''}`;
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

  /* ------------------------------------------------------------------------
     ریل کارت‌ها (اسلایدر افقی): [data-rail] با .rail-track و دکمه‌های [data-rail-prev] / [data-rail-next]
     با data-rail-auto="5000" خودکار و در حلقه‌ی بی‌پایان جلو می‌رود؛ بعد از آخرین کارت به اولی برمی‌گردد.
     با نگه داشتن ماوس یا فوکوس متوقف می‌شود و در حالت «کاهش حرکت» خودکار نمی‌چرخد.
     ------------------------------------------------------------------------ */
  function initRails() {
    document.querySelectorAll('[data-rail]').forEach((rail) => {
      const track = rail.querySelector('.rail-track');
      if (!track) return;
      const items = () => Array.from(track.children);
      const rtl = getComputedStyle(track).direction === 'rtl';
      const pos = () => Math.abs(track.scrollLeft);
      const max = () => track.scrollWidth - track.clientWidth;
      const step = () => { const first = items()[0]; if (!first) return track.clientWidth; const gap = parseFloat(getComputedStyle(track).columnGap) || 0; return first.getBoundingClientRect().width + gap; };
      const go = (dir) => {
        let target;
        if (dir > 0) target = pos() >= max() - 4 ? 0 : Math.min(max(), pos() + step());
        else target = pos() <= 4 ? max() : Math.max(0, pos() - step());
        track.scrollTo({ left: rtl ? -target : target, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      };
      const next = rail.querySelector('[data-rail-next]');
      const prev = rail.querySelector('[data-rail-prev]');
      if (next) next.addEventListener('click', () => { go(1); play(); });
      if (prev) prev.addEventListener('click', () => { go(-1); play(); });
      let timer = null;
      const delay = parseInt(rail.dataset.railAuto, 10);
      const stop = () => timer && (clearInterval(timer), (timer = null));
      const play = () => { stop(); if (!delay || prefersReducedMotion()) return; timer = setInterval(() => go(1), delay); };
      rail.addEventListener('mouseenter', stop);
      rail.addEventListener('mouseleave', play);
      rail.addEventListener('focusin', stop);
      rail.addEventListener('focusout', play);
      track.addEventListener('pointerdown', stop);
      play();
    });
  }


  /* ------------------------------------------------------------------------
     صفحه‌ی ورود: جابه‌جایی بین ورود، ثبت‌نام و بازیابی رمز؛ نمایش/پنهان کردن رمز عبور
     ------------------------------------------------------------------------ */
  function initAuth() {
    const panels = Array.from(document.querySelectorAll('[data-auth-panel]'));
    if (!panels.length) return;
    const tabs = Array.from(document.querySelectorAll('.au-tab'));
    const go = (name) => {
      panels.forEach((p) => (p.hidden = p.dataset.authPanel !== name));
      tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.authGo === name || (name === 'forgot' && t.dataset.authGo === 'login'))));
      const panel = panels.find((p) => p.dataset.authPanel === name);
      if (panel) {
        const form = panel.querySelector('form');
        const done = panel.querySelector('[data-auth-success]');
        if (form) form.hidden = false;
        if (done) done.hidden = true;
        const first = panel.querySelector('input');
        if (first) first.focus({ preventScroll: true });
      }
    };
    document.querySelectorAll('[data-auth-go]').forEach((b) => b.addEventListener('click', () => go(b.dataset.authGo)));
    panels.forEach((panel) => {
      const form = panel.querySelector('form');
      const done = panel.querySelector('[data-auth-success]');
      if (form && done) form.addEventListener('mahtab:valid-submit', () => { form.hidden = true; done.hidden = false; done.focus(); });
    });
    document.querySelectorAll('[data-pass-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = btn.parentElement.querySelector('input');
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        btn.setAttribute('aria-pressed', String(show));
      });
    });
    if (location.hash === '#register') go('register');
    if (location.hash === '#forgot') go('forgot');
  }


  // دکمه‌ی پسندیدن نظرها (فقط نمایشی)
  function initCommentLikes() {
    document.querySelectorAll('.cm-like').forEach((b) => b.addEventListener('click', () => {
      const on = b.getAttribute('aria-pressed') !== 'true';
      b.setAttribute('aria-pressed', String(on));
      const node = Array.from(b.childNodes).reverse().find((n) => n.nodeType === 3 && n.textContent.trim());
      if (node) { const n = parseInt(toEn(node.textContent.trim()), 10) + (on ? 1 : -1); node.textContent = ' ' + toFa(n); }
    }));
  }


  /* ------------------------------------------------------------------------
     حرکت تصاویر با اسکرول (پارالاکس): [data-parallax="سرعت"]؛ مثبت = پایین، منفی = بالا
     در حالت «کاهش حرکت» غیرفعال است.
     ------------------------------------------------------------------------ */
  function initParallax() {
    const els = Array.from(document.querySelectorAll('[data-parallax]'));
    if (!els.length || prefersReducedMotion()) return;
    let ticking = false;
    const update = () => {
      ticking = false;
      const vh = window.innerHeight;
      els.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const shift = (r.top + r.height / 2 - vh / 2) * parseFloat(el.dataset.parallax);
        el.style.transform = `translate3d(0, ${shift.toFixed(1)}px, 0)`;
      });
    };
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    update();
  }

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
    women: { sizes: ['S', 'M', 'L', 'XL', 'XXL'], nums: ['36', '38', '40', '42', '44'], chest: [86, 90, 96, 102, 108], waist: [68, 72, 78, 84, 90], hip: [94, 98, 104, 110, 116] },
    men: { sizes: ['S', 'M', 'L', 'XL', 'XXL'], nums: ['46', '48', '50', '52', '54'], chest: [94, 100, 106, 112, 118], waist: [82, 88, 94, 100, 106] },
    kids: { sizes: ['2 yrs', '4 yrs', '6 yrs', '8 yrs', '10 yrs'], height: [92, 104, 116, 128, 140] },
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
        cell.textContent = toFa(vals.join(' – ')).replace(/\./g, '.');
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
        result.textContent = 'Please enter all measurements in centimeters.';
        return;
      }
      result.className = 'sg-result';
      if (index >= chart.sizes.length) {
        result.innerHTML = '<strong>Your measurements are larger than the biggest size in the chart.</strong><span>For loose-fit or custom styles, please contact our advisors.</span>';
        return;
      }
      const size = chart.sizes[index];
      const num = chart.nums ? ` (EU size ${chart.nums[index]})` : '';
      const tip = who() === 'kids' ? 'Kids grow fast; if they are close to the next size, go up.' : 'For slim-fit styles, consider one size up as well.';
      result.innerHTML = `<span>Your recommended size</span><strong>${escapeHtml(size)}</strong><span>${num ? escapeHtml(num.trim()) + ' · ' : ''}${tip}</span>`;
    });
  }


  /* ------------------------------------------------------------------------
     پیشنهادهای جست‌وجو: با تایپ در هر کادر جست‌وجو، محصولات مرتبط زیر آن نمایش داده می‌شوند.
     فهرست محصولات (assets/js/search-<دمو>.js) فقط بار اول تایپ بارگذاری می‌شود.
     ------------------------------------------------------------------------ */
  const normalizeSearch = (text) => String(text || '').toLowerCase().replace(/ي/g, 'ی').replace(/ك/g, 'ک').replace(/[‌‏‎]/g, ' ').replace(/\s+/g, ' ').trim();
  let searchIndexPromise = null;
  const loadSearchIndex = () => {
    if (!searchIndexPromise) {
      searchIndexPromise = new Promise((resolve) => {
        const script = document.createElement('script');
        script.src = `${ASSETS}js/search-${DEMO}.js`;
        script.onload = () => resolve((window.MAHTAB_SEARCH || []).map((item) => ({ ...item, t: normalizeSearch(`${item.n} ${item.c} ${item.b} ${item.k}`) })));
        script.onerror = () => resolve([]);
        document.head.appendChild(script);
      });
    }
    return searchIndexPromise;
  };

  function initSearchSuggest() {
    document.querySelectorAll('form[role="search"]').forEach((form, formIndex) => {
      const input = form.querySelector('input[name="q"]');
      if (!input) return;
      const box = document.createElement('div');
      box.className = 'search-suggest';
      box.id = `search-suggest-${formIndex}`;
      box.setAttribute('role', 'listbox');
      box.hidden = true;
      form.appendChild(box);
      form.classList.add('has-suggest');
      input.setAttribute('role', 'combobox');
      input.setAttribute('aria-autocomplete', 'list');
      input.setAttribute('aria-controls', box.id);
      input.setAttribute('aria-expanded', 'false');
      let active = -1;
      let timer = null;

      const close = () => {
        box.hidden = true;
        active = -1;
        input.setAttribute('aria-expanded', 'false');
        input.removeAttribute('aria-activedescendant');
      };
      const options = () => Array.from(box.querySelectorAll('[role="option"]'));
      const highlight = (index) => {
        const list = options();
        list.forEach((el, i) => el.classList.toggle('is-active', i === index));
        active = index;
        if (list[index]) input.setAttribute('aria-activedescendant', list[index].id);
        else input.removeAttribute('aria-activedescendant');
      };

      const show = async () => {
        const q = normalizeSearch(input.value);
        if (q.length < 2) return close();
        const index = await loadSearchIndex();
        const words = q.split(' ');
        const found = index.filter((item) => words.every((w) => item.t.includes(w)));
        const all = `${form.getAttribute('action') || 'shop.html'}?q=${encodeURIComponent(input.value.trim())}`;
        if (!found.length) {
          box.innerHTML = `<p class="search-suggest-empty">No products match “${escapeHtml(input.value.trim())}”. Try a category or color, e.g. “coat” or “black”.</p>`;
        } else {
          box.innerHTML = found.slice(0, 6).map((item, i) => `<a role="option" id="${box.id}-o${i}" class="search-suggest-item" href="${item.u}">
  <img src="${ASSETS}${item.i}" alt="" width="48" height="64" loading="lazy">
  <span class="search-suggest-text"><strong>${escapeHtml(item.n)}</strong><small>${escapeHtml(item.c)}${item.b ? ` · ${escapeHtml(item.b)}` : ''}</small></span>
  <span class="search-suggest-price">${item.o ? `<del>$${formatPrice(item.o)}</del>` : ''}$${formatPrice(item.p)}</span>
</a>`).join('') + `<a class="search-suggest-all" href="${all}">Show all ${toFa(found.length)} results for “${escapeHtml(input.value.trim())}» <svg class="icon" aria-hidden="true"><use href="#i-arrow"/></svg></a>`;
        }
        box.hidden = false;
        active = -1;
        input.setAttribute('aria-expanded', 'true');
      };

      input.addEventListener('input', () => {
        clearTimeout(timer);
        timer = setTimeout(show, 120);
      });
      input.addEventListener('focus', () => { loadSearchIndex(); if (input.value.trim().length >= 2) show(); });
      input.addEventListener('keydown', (event) => {
        if (box.hidden) return;
        const list = options();
        if (event.key === 'ArrowDown') { event.preventDefault(); highlight(Math.min(list.length - 1, active + 1)); }
        else if (event.key === 'ArrowUp') { event.preventDefault(); highlight(Math.max(-1, active - 1)); }
        else if (event.key === 'Enter' && list[active]) { event.preventDefault(); list[active].click(); }
        else if (event.key === 'Escape') { event.stopPropagation(); close(); }
      });
      document.addEventListener('click', (event) => { if (!form.contains(event.target)) close(); });
    });
  }


  /* ------------------------------------------------------------------------
     مجله: فیلتر مقاله‌ها بر اساس دسته (دکمه‌های بالای صفحه)
     ------------------------------------------------------------------------ */
  function initBlogFilter() {
    const bar = document.querySelector('[data-blog-filter]');
    if (!bar) return;
    const items = Array.from(document.querySelectorAll('[data-blog-item]'));
    const empty = document.querySelector('[data-blog-empty]');
    bar.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-blog-cat]');
      if (!btn) return;
      const cat = btn.dataset.blogCat;
      bar.querySelectorAll('[data-blog-cat]').forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      let shown = 0;
      items.forEach((item) => {
        const on = !cat || item.dataset.cat === cat;
        item.hidden = !on;
        if (on) shown++;
      });
      if (empty) empty.hidden = shown !== 0;
    });
  }


  /* ------------------------------------------------------------------------
     صفحه‌های راهنما (قوانین، حریم خصوصی، سوالات): فهرست بخش‌ها از روی تیترها
     ------------------------------------------------------------------------ */
  function initDocToc() {
    const doc = document.querySelector('[data-doc]');
    const toc = document.querySelector('[data-doc-toc]');
    if (!doc || !toc) return;
    const heads = Array.from(doc.querySelectorAll('h2'));
    if (heads.length < 3) return;
    toc.querySelector('ol').innerHTML = heads.map((h, i) => {
      if (!h.id) h.id = `doc-${i + 1}`;
      return `<li><a href="#${h.id}">${escapeHtml(h.textContent.trim())}</a></li>`;
    }).join('');
    toc.hidden = false;
    // صفحه‌های قوانین: بخش‌ها آکاردئونی‌اند؛ با رفتن به یک بخش، همان باز می‌شود
    const openFor = (id) => { const h = id && document.getElementById(id); const d = h && h.closest('details'); if (d) d.open = true; };
    toc.addEventListener('click', (e) => { const a = e.target.closest('a[href^="#"]'); if (a) openFor(a.getAttribute('href').slice(1)); });
    openFor(location.hash.slice(1));
    window.addEventListener('hashchange', () => openFor(location.hash.slice(1)));
  }


  /* ------------------------------------------------------------------------
     لوک‌بوک: کلیک یا رفتن ماوس روی نقطه‌ی عکس، ردیف همان محصول را برجسته می‌کند
     (بدون پرش صفحه؛ فقط اگر ردیف دیده نمی‌شود، آرام کمی اسکرول می‌شود)
     ------------------------------------------------------------------------ */
  function initHotspots() {
    document.querySelectorAll('.hotspot[href^="#"]').forEach((spot) => {
      const target = () => document.getElementById(spot.getAttribute('href').slice(1));
      const activate = (scroll) => {
        const item = target();
        if (!item) return;
        const scope = spot.closest('section') || document;
        scope.querySelectorAll('.hotspot.is-active, .look-item.is-active').forEach((el) => el.classList.remove('is-active'));
        scope.querySelectorAll('.hs.is-open').forEach((el) => el.classList.remove('is-open'));
        spot.classList.add('is-active');
        item.classList.add('is-active');
        const hs = spot.closest('.hs');
        if (hs) {
          hs.classList.add('is-open');
          // کارت محصول به سمتی باز می‌شود که جا دارد
          const card = hs.querySelector('.hs-card');
          const box = hs.parentElement.getBoundingClientRect();
          const r = hs.getBoundingClientRect();
          const rtl = document.dir === 'rtl' || document.documentElement.dir === 'rtl';
          const roomBefore = rtl ? r.left - box.left : box.right - r.right;
          card.classList.toggle('to-end', roomBefore < 270);
        }
        if (scroll) {
          const r = item.getBoundingClientRect();
          if (r.top < 80 || r.bottom > window.innerHeight) item.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'nearest' });
        }
      };
      spot.addEventListener('click', (event) => { event.preventDefault(); activate(true); });
      spot.addEventListener('mouseenter', () => activate(false));
      spot.addEventListener('focus', () => activate(false));
    });
    // کلیک بیرون از نقطه‌ها، کارت باز را می‌بندد
    document.addEventListener('click', (event) => {
      if (event.target.closest('.hs')) return;
      document.querySelectorAll('.hs.is-open').forEach((el) => el.classList.remove('is-open'));
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
            error.textContent = bad ? (field.tagName === 'TEXTAREA' ? 'Please write a little more in your review.' : 'Please enter your name.') : '';
          }
          if (bad) invalid = true;
        });
        if (invalid) {
          fields.find((f) => f.getAttribute('aria-invalid') === 'true').focus();
          return;
        }
        // با action واقعی (مثلاً سرویس فرم آنلاین) نظر به همان آدرس ارسال می‌شود
        if (hasRealAction(form)) {
          form.submit();
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
     بعد از اعتبارسنجی موفق، اگر فرم action واقعی داشته باشد ارسال می‌شود؛ وگرنه رویداد mahtab:valid-submit روی خود فرم ارسال می‌شود؛
     ثبت واقعی داده (ارسال به سرور یا ذخیره‌ی محلی) در هر صفحه جداگانه انجام می‌شود.
     ------------------------------------------------------------------------ */
  function initFormValidation() {
    const errorOf = (field) => document.getElementById(`${field.id}-error`) || (field.closest('.field') && field.closest('.field').querySelector('[data-field-error]'));

    const check = (field) => {
      const value = field.type === 'checkbox' ? field.checked : field.value.trim();
      const labelEl = field.form.querySelector(`label[for="${field.id}"]`);
      const name = labelEl ? labelEl.textContent.replace('*', '').trim() : 'This field';

      if (field.required && (field.type === 'checkbox' ? !value : value === '')) {
        return field.tagName === 'SELECT' ? `${name} is required.` : `${name} is required.`;
      }
      if (value === '' || value === false) return '';
      if (field.type === 'email' && !EMAIL_PATTERN.test(value)) return 'That email isn\'t valid. Example: name@example.com';
      if (field.hasAttribute('data-phone') && !/^\+?\d{7,15}$/.test(toEn(value).replace(/[\s()-]/g, ''))) {
        return 'Please enter a valid phone number (7–15 digits).';
      }
      const min = parseInt(field.dataset.min || '0', 10);
      if (min && value.length < min) return `${name} must be at least ${toFa(min)} characters.`;
      if (field.dataset.match) {
        const other = document.getElementById(field.dataset.match);
        if (other && value !== other.value.trim()) return 'Doesn\'t match the value entered.';
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
        // فرم‌هایی که action واقعی دارند (مثلاً فرم تماس متصل به سرویس فرم آنلاین) بعد از اعتبارسنجی واقعاً ارسال می‌شوند
        if (hasRealAction(form)) {
          form.submit();
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
    { id: 'a1', title: 'Home', receiver: 'Maryam Rezaei', phone: '09120000000', postal: '1456789012', full: '12 Maple Street, Apt 3, Springfield', isDefault: true },
    { id: 'a2', title: 'Work', receiver: 'Maryam Rezaei', phone: '09350000000', postal: '1987654321', full: '400 Sunrise Avenue, Floor 4, Suite 12, Springfield', isDefault: false },
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
      formTitle.textContent = address ? 'Edit address' : 'New address';
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
  ${a.isDefault ? '<span class="badge badge-soft address-default">Default</span>' : ''}
  <h3>${escapeHtml(a.title)}</h3>
  <p>${escapeHtml(a.receiver)}</p>
  <p>${escapeHtml(a.full)}</p>
  <p>Postal code: <span class="num">${toFa(a.postal)}</span></p>
  <p dir="ltr" class="address-phone">${escapeHtml(a.phone)}</p>
  <div class="address-actions">
    <button type="button" data-address-edit="${a.id}">Edit</button>
    <button type="button" data-address-delete="${a.id}">Delete</button>
    ${a.isDefault ? '' : `<button type="button" data-address-default="${a.id}">Set as default</button>`}
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
        announce('Address deleted');
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
      announce('Address saved');
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
      <div class="price"><span><span class="price-now">${priceHtml(sale || price)}</span> <span class="currency"></span></span></div>
      <button type="button" class="btn btn-sm p-add" data-add-to-cart>${'<svg class="icon" aria-hidden="true"><use href="#i-bag"/></svg>'} <span data-cart-label>Add to cart</span></button>
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
        .map((p) => simpleProductCard(p, `<button type="button" class="p-tool" data-wish-remove="${p.id}" aria-label="Remove ${escapeHtml(p.name)} from wishlist">${'<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'}</button>`))
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
      announce('Removed from wishlist');
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
      { label: 'Price', get: (p) => `<strong class="compare-price">${priceHtml(p.salePrice || p.finalPrice || p.price)}</strong>` },
      { label: 'Rating', get: (p) => (p.rating ? `<span class="compare-rate"><svg class="icon" aria-hidden="true"><use href="#i-star"/></svg>${toFa(p.rating)}</span> <small>(${toFa(p.reviews || 0)} reviews)</small>` : '—') },
      { label: 'Category', get: (p) => escapeHtml(p.category || '—') },
      { label: 'Brand', get: (p) => escapeHtml(p.brand || '—') },
      { label: 'Colors', get: (p) => (p.colors ? `<span class="compare-swatches">${p.colors.map((c) => `<span title="${escapeHtml(c.name)}"><i style="background:${c.hex}"></i>${escapeHtml(c.name)}</span>`).join('')}</span>` : '—') },
      { label: 'Sizes', get: (p) => (p.sizes ? `<span class="compare-chips">${p.sizes.map((z) => `<span>${escapeHtml(z)}</span>`).join('')}</span>` : '—') },
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
      const head = `<tr><th scope="col" class="compare-row-label"><span class="sr-only">Feature</span></th>${items
        .map(
          (p) => `<th scope="col">
  <button type="button" class="icon-btn compare-remove" data-compare-remove="${p.id}" aria-label="Remove ${escapeHtml(p.name)} from compare">${'<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'}</button>
  <a class="compare-card" href="product-${p.image}.html"><img src="${ASSETS}images/${p.__demo}/products/${p.image}.${p.imageExt || 'svg'}" alt="" width="720" height="960" loading="lazy"><span>${escapeHtml(p.name)}</span></a>
</th>`
        )
        .join('')}</tr>`;
      const rows = ROWS.map(
        (row) => `<tr><th scope="row">${row.label}</th>${items.map((p) => `<td>${row.get(p)}</td>`).join('')}</tr>`
      ).join('');
      const addRow = `<tr><th scope="row"><span class="sr-only">Add to cart</span></th>${items
        .map(
          (p) =>
            `<td data-product data-product-id="${p.id}" data-product-name="${escapeHtml(p.name)}" data-product-price="${p.salePrice || p.finalPrice || p.price}" data-product-image="${ASSETS}images/${p.__demo}/products/${p.image}.${p.imageExt || 'svg'}"><button type="button" class="btn btn-sm btn-primary" data-add-to-cart><span data-cart-label>Add to cart</span></button></td>`
        )
        .join('')}</tr>`;
      table.style.setProperty('--cols', items.length);
      table.dataset.cols = items.length;
      table.innerHTML = `<caption class="sr-only">Feature comparison of the selected products</caption><thead>${head}</thead><tbody>${rows}${addRow}</tbody>`;
      // کارت‌ها هر بار از نو ساخته می‌شوند؛ دکمه‌ی «افزودن به سبد» باید دوباره فعال شود
      rebindAddToCart(table);
    };

    table.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-compare-remove]');
      if (!btn) return;
      const ids = store.read('compare', []).filter((id) => id !== btn.dataset.compareRemove);
      store.write('compare', ids);
      announce('removed from compare');
      render();
    });

    render();
  }

  /* ------------------------------------------------------------------------
     صفحه‌ی سبد خرید (نمای کامل، همان داده‌ی سبد کشویی)
     ------------------------------------------------------------------------ */
  const FREE_SHIPPING_FROM = 100;
  const SHIPPING_COST = 12;

  function cartItemRow(item) {
    return `<li class="cart-item cart-page-item" data-id="${escapeHtml(item.id)}">
  <img class="cart-thumb" src="${escapeHtml(itemImage(item.image))}" onerror="if(!this.dataset.retry){this.dataset.retry=1;this.src=this.src.replace(/[.](svg|jpg|png)$/,'.webp')}else{this.style.visibility='hidden'}" width="90" height="90" alt="">
  <div class="cart-info">
    <a class="cart-name" href="${productUrl(item)}">${escapeHtml(item.name)}</a>
    ${item.variant ? `<p class="cart-variant">${escapeHtml(item.variant)}</p>` : ''}
    <p class="cart-price">${priceHtml(item.price)} <span class="currency"></span></p>
    <div class="qty" role="group" aria-label="Quantity of ${escapeHtml(item.name)}">
      <button type="button" data-qty="1" aria-label="Increase quantity">${'<svg class="icon" aria-hidden="true"><use href="#i-plus"/></svg>'}</button>
      <span>${toFa(item.qty)}</span>
      <button type="button" data-qty="-1" aria-label="Decrease quantity">${'<svg class="icon" aria-hidden="true"><use href="#i-minus"/></svg>'}</button>
    </div>
  </div>
  <p class="cart-page-line-total">${priceHtml(item.price * item.qty)} <span class="currency"></span></p>
  <button type="button" class="cart-remove" data-remove aria-label="Remove ${escapeHtml(item.name)} from cart">${'<svg class="icon" aria-hidden="true"><use href="#i-close"/></svg>'}</button>
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
      subtotalEl.innerHTML = `${priceHtml(subtotal)} <span class="currency"></span>`;
      shippingEl.innerHTML = shipping === 0 ? 'Free' : `${priceHtml(shipping)} <span class="currency"></span>`;
      totalEl.innerHTML = `${priceHtml(subtotal + shipping)} <span class="currency"></span>`;
      if (noteEl) {
        const remain = FREE_SHIPPING_FROM - subtotal;
        noteEl.textContent = remain > 0 ? `Spend $${formatPrice(remain)} more to get free shipping.` : 'This order ships free.';
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
          announce(`${item.name} removed from cart`);
        } else return;
        cartStore.write(items);
        document.dispatchEvent(new CustomEvent('mahtab:cart-render'));
        render();
      });

    document.addEventListener('mahtab:cart-render', render);
    window.addEventListener('storage', (event) => {
      if (event.key === store.key('cart')) render();
    });

    // کد تخفیف: فقط نمایشی (کد MAHTAB10 را به‌عنوان نمونه می‌پذیرد)
    const couponForm = document.querySelector('[data-coupon-form]');
    if (couponForm) {
      couponForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const input = couponForm.querySelector('input');
        const error = document.querySelector('[data-coupon-error]');
        const code = input.value.trim().toUpperCase();
        if (code === 'MAHTAB10') {
          error.hidden = true;
          announce('Discount code applied');
          input.value = '';
        } else {
          error.textContent = 'Invalid discount code.';
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
      subtotalEl.innerHTML = `${priceHtml(subtotal)} <span class="currency"></span>`;
      shippingEl.innerHTML = shipping === 0 ? 'Free' : `${priceHtml(shipping)} <span class="currency"></span>`;
      totalEl.innerHTML = `${priceHtml(subtotal + shipping)} <span class="currency"></span>`;
    };

    document.querySelectorAll('input[name="shipping"]').forEach((input) => input.addEventListener('change', render));
    render();

    if (form) {
      form.addEventListener('mahtab:valid-submit', () => {
        // ثبت سفارش: در فروشگاه واقعی اینجا به درگاه پرداخت یا سرور وصل می‌شود
        const orderNumber = `10${toFa(Math.floor(500 + Math.random() * 499))}`;
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
      number = sessionStorage.getItem(`mahtab-${document.documentElement.dataset.demo}-last-order`) || '10500';
    } catch (e) {
      number = '10500';
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
  initAuth();
  initParallax();
  initCommentLikes();
  initRails();
  initReviews();
  initSizeGuide();
  initSearchSuggest();
  initBlogFilter();
  initDocToc();
  initHotspots();
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
