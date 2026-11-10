(() => {
  const mobileMQ = window.matchMedia('(max-width: 820px)');
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  /* ---------- Mobile menu ---------- */
  const menu = $('#mobile-menu');
  const openBtn = $('.menu-btn');
  if (menu && openBtn) {
    const closeBtn = $('.menu-close', menu);
    const openMenu = () => {
      menu.hidden = false;
      document.body.classList.add('menu-open');
      openBtn.setAttribute('aria-expanded', 'true');
      closeBtn.focus();
    };
    const closeMenu = () => {
      menu.hidden = true;
      document.body.classList.remove('menu-open');
      openBtn.setAttribute('aria-expanded', 'false');
      openBtn.focus();
    };
    openBtn.addEventListener('click', openMenu);
    closeBtn.addEventListener('click', closeMenu);
    $$('a', menu).forEach(a => a.addEventListener('click', () => { if (!menu.hidden) closeMenu(); }));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && !menu.hidden) closeMenu(); });
    mobileMQ.addEventListener('change', e => { if (!e.matches && !menu.hidden) closeMenu(); });
  }

  /* ---------- Sticky nav ---------- */
  const mainNav = $('.hero .nav');
  if (mainNav) {
    const spacer = document.createElement('div');
    spacer.className = 'nav-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    mainNav.after(spacer);
    const wrap = mainNav.parentElement;
    const update = () => {
      // where the nav would sit if it weren't pinned
      const naturalTop = wrap.getBoundingClientRect().top + parseFloat(getComputedStyle(wrap).paddingTop);
      const stickAt = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-top')) || 16;
      const stuck = naturalTop <= stickAt;
      if (stuck !== mainNav.classList.contains('is-stuck')) {
        if (stuck) spacer.style.height = mainNav.offsetHeight + 'px';
        mainNav.classList.toggle('is-stuck', stuck);
        spacer.classList.toggle('on', stuck);
      }
    };
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', () => {
      if (mainNav.classList.contains('is-stuck')) {
        // re-measure the full-size nav; no transition, so the shrink animation doesn't skew the reading
        const navParts = [mainNav, ...$$('*', mainNav)];
        navParts.forEach(el => { el.style.transition = 'none'; });
        mainNav.classList.remove('is-stuck');
        spacer.style.height = mainNav.offsetHeight + 'px';
        mainNav.classList.add('is-stuck');
        mainNav.offsetHeight; // flush before transitions come back
        navParts.forEach(el => { el.style.transition = ''; });
      }
      update();
    });
    update();
  }

  /* ---------- Benefits marquee (home) ---------- */
  const pills = [
    ['No Add Sugar', 'peach'],
    ['High Fiber', 'pink'],
    ['Different Flavors', 'blue'],
    ['Affordable Price', 'mint'],
  ];
  $$('[data-pills]').forEach(track => {
    const offset = Number(track.dataset.offset || 0);
    const seq = [];
    for (let i = 0; i < 8; i++) seq.push(pills[(i + offset) % pills.length]);
    const html = seq.map(([t, c]) => `<span class="pill ${c}">${t}</span>`).join('');
    // two identical halves so translateX(-50%) loops seamlessly
    track.innerHTML = html + html.replace(/class="pill/g, 'aria-hidden="true" class="pill');
  });

  /* ---------- Flavor carousel (home) ---------- */
  const carViewport = $('.car-viewport');
  if (carViewport) {
    const track = $('.car-track');
    const originals = [...track.children];
    // desktop shows 3 at once; clones fill the slot that slides in
    originals.forEach(el => {
      const c = el.cloneNode(true);
      c.classList.add('clone');
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });

    let busy = false;
    const DURATION = 450;
    const EASE = 'cubic-bezier(.22,.8,.3,1)';
    const stepPx = () => {
      const t = track.children[0];
      return t.getBoundingClientRect().width + parseFloat(getComputedStyle(t).marginRight);
    };

    const slide = dir => {
      if (busy || mobileMQ.matches) return;
      busy = true;
      const step = stepPx();
      if (dir > 0) {
        track.style.transition = `transform ${DURATION}ms ${EASE}`;
        track.style.transform = `translateX(${-step}px)`;
        setTimeout(() => {
          track.style.transition = 'none';
          track.appendChild(track.firstElementChild);
          track.style.transform = 'translateX(0)';
          busy = false;
        }, DURATION);
      } else {
        track.style.transition = 'none';
        track.insertBefore(track.lastElementChild, track.firstElementChild);
        track.style.transform = `translateX(${-step}px)`;
        track.getBoundingClientRect(); // flush
        track.style.transition = `transform ${DURATION}ms ${EASE}`;
        track.style.transform = 'translateX(0)';
        setTimeout(() => { busy = false; }, DURATION);
      }
    };
    $('.car-arrow.next').addEventListener('click', () => slide(1));
    $('.car-arrow.prev').addEventListener('click', () => slide(-1));

    // mobile: native swipe + dots
    const dots = $$('.car-dots button');
    const realSlides = () => [...track.children].filter(el => !el.classList.contains('clone'));
    const setDot = i => dots.forEach((d, j) => d.classList.toggle('active', i === j));
    const restoreOrder = () => {
      originals.forEach(el => track.appendChild(el));
      $$('.clone', track).forEach(el => track.appendChild(el));
      track.style.transform = '';
    };
    mobileMQ.addEventListener('change', () => { restoreOrder(); carViewport.scrollLeft = 0; setDot(0); });
    if (mobileMQ.matches) restoreOrder();

    carViewport.addEventListener('scroll', () => {
      if (!mobileMQ.matches) return;
      const slides = realSlides();
      const i = Math.round(carViewport.scrollLeft / slides[0].offsetWidth);
      setDot(Math.max(0, Math.min(slides.length - 1, i)));
    }, { passive: true });

    dots.forEach((d, i) => d.addEventListener('click', () => {
      carViewport.scrollTo({ left: i * realSlides()[0].offsetWidth, behavior: 'smooth' });
    }));
  }

  /* ---------- Team carousel (about) ---------- */
  const teamTrack = $('.team-track');
  if (teamTrack) {
    const cards = $$('.t-card', teamTrack);
    const prev = $('.team-arrow.prev');
    const next = $('.team-arrow.next');
    const dotsWrap = $('.team-dots');
    const step = () => cards[0].offsetWidth + parseFloat(getComputedStyle(teamTrack).columnGap || 0);

    cards.forEach((_, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', `Show team member ${i + 1}`);
      b.addEventListener('click', () => cards[i].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
      dotsWrap.appendChild(b);
    });
    const dots = $$('button', dotsWrap);

    const update = () => {
      const max = teamTrack.scrollWidth - teamTrack.clientWidth;
      prev.disabled = teamTrack.scrollLeft <= 2;
      next.disabled = teamTrack.scrollLeft >= max - 2;
      // active dot = card whose centre is closest to the track's centre
      const mid = teamTrack.getBoundingClientRect().left + teamTrack.clientWidth / 2;
      let best = 0, bestDist = Infinity;
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) { bestDist = d; best = i; }
      });
      dots.forEach((d, i) => d.classList.toggle('active', i === best));
    };
    prev.addEventListener('click', () => teamTrack.scrollBy({ left: -step(), behavior: 'smooth' }));
    next.addEventListener('click', () => teamTrack.scrollBy({ left: step(), behavior: 'smooth' }));
    teamTrack.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  /* ---------- FAQ: one open question per card ---------- */
  $$('[data-accordion]').forEach(card => {
    const items = $$('.faq-item', card);
    items.forEach(item => {
      const btn = $('button', item);
      btn.addEventListener('click', () => {
        const willOpen = !item.classList.contains('open');
        items.forEach(other => {
          other.classList.remove('open');
          $('button', other).setAttribute('aria-expanded', 'false');
        });
        if (willOpen) {
          item.classList.add('open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  });

  /* ---------- Footer accordions (mobile only) ---------- */
  $$('.f-col .acc').forEach(btn => {
    btn.addEventListener('click', () => {
      if (!mobileMQ.matches) return;
      const col = btn.closest('.f-col');
      const open = col.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
  });

  /* ---------- Newsletter ---------- */
  const form = $('.nl-form');
  if (form) {
    const msg = $('.nl-msg', form);
    form.addEventListener('submit', e => {
      e.preventDefault();
      const input = $('input', form);
      const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value.trim());
      msg.classList.toggle('error', !ok);
      msg.textContent = ok
        ? 'You’re on the list! Watch your inbox for new flavors.'
        : 'Please enter a valid email address.';
      if (ok) input.value = '';
      else input.focus();
    });
  }

  /* ---------- Flavor detail pop-up (ice-creams) ---------- */
  $$('dialog.popup').forEach(dialog => {
    let opener = null;
    const open = btn => {
      opener = btn;
      dialog.dispatchEvent(new CustomEvent('popup:open', { detail: { opener: btn } }));
      dialog.showModal();
      dialog.scrollTop = 0;
      document.body.classList.add('popup-open');
    };
    const cleanup = () => {
      if (!document.body.classList.contains('popup-open')) return;
      document.body.classList.remove('popup-open');
      if (opener) opener.focus();
    };
    const close = () => { if (dialog.open) dialog.close(); cleanup(); };
    $$(`[data-popup-open="${dialog.id}"]`).forEach(btn => btn.addEventListener('click', () => open(btn)));
    $$('[data-popup-close]', dialog).forEach(btn => btn.addEventListener('click', close));
    // the dialog fills the screen; a click on it (not on the card) is a click on the overlay
    dialog.addEventListener('click', e => { if (e.target === dialog) close(); });
    dialog.addEventListener('cancel', e => { e.preventDefault(); close(); }); // Esc
    dialog.addEventListener('close', cleanup); // any other route
  });

  /* ---------- Job cards: Read more / Show less (career) ---------- */
  const jobs = $$('.job');
  if (jobs.length) {
    const setLabel = job => {
      const btn = $('.job-toggle', job);
      const open = job.classList.contains('open');
      btn.setAttribute('aria-expanded', String(open));
      $('span', btn).textContent = open ? 'Show less' : 'Read more';
    };
    // the toggle always shows (as in Figma), even where the text already fits in three lines
    jobs.forEach(job => {
      $('.job-toggle', job).addEventListener('click', () => {
        job.classList.toggle('open');
        setLabel(job);
      });
      setLabel(job);
    });
  }

  /* ---------- Apply form (career) ---------- */
  const apply = $('#apply-popup');
  if (apply) {
    const form = $('.apply-form', apply);
    const formStep = $('[data-step="form"]', apply);
    const doneStep = $('[data-step="done"]', apply);
    const title = $('[data-job-title]', apply);
    const role = $('#ap-role', apply);
    const fileInput = $('#ap-cv', apply);
    const fileName = $('[data-file-name]', apply);

    const resetFile = () => { fileName.textContent = 'Choose a file'; fileName.classList.remove('has-file'); };
    apply.addEventListener('popup:open', e => {
      const job = e.detail.opener.dataset.job || role.options[0].value;
      form.reset();
      resetFile();
      $$('.field.invalid', form).forEach(f => f.classList.remove('invalid'));
      role.value = job;
      title.textContent = job;
      formStep.hidden = false;
      doneStep.hidden = true;
    });
    role.addEventListener('change', () => { title.textContent = role.value; });
    fileInput.addEventListener('change', () => {
      const f = fileInput.files[0];
      if (f) { fileName.textContent = f.name; fileName.classList.add('has-file'); } else resetFile();
    });

    const checks = {
      'ap-name': v => v.length > 1,
      'ap-phone': v => /^(\+?88)?01[3-9]\d{8}$/.test(v.replace(/[\s-]/g, '')),
      'ap-email': v => v === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
    };
    const validate = id => {
      const input = $('#' + id, form);
      const ok = checks[id](input.value.trim());
      input.closest('.field').classList.toggle('invalid', !ok);
      input.setAttribute('aria-invalid', String(!ok));
      return ok;
    };
    Object.keys(checks).forEach(id => {
      const input = $('#' + id, form);
      const err = $(`.field-error[data-for="${id}"]`, form);
      err.id = id + '-err';
      input.setAttribute('aria-describedby', err.id);
      input.addEventListener('input', () => { if (input.closest('.field').classList.contains('invalid')) validate(id); });
    });

    form.addEventListener('submit', e => {
      e.preventDefault();
      const bad = Object.keys(checks).filter(id => !validate(id));
      if (bad.length) { $('#' + bad[0], form).focus(); return; }
      const first = $('#ap-name', form).value.trim().split(/\s+/)[0];
      $('[data-done-name]', apply).textContent = first ? ', ' + first : '';
      $('[data-done-job]', apply).textContent = role.value;
      formStep.hidden = true;
      doneStep.hidden = false;
      apply.scrollTop = 0;
      $('h2', doneStep).focus();
    });
  }

  /* ---------- Back to top ---------- */
  const toTop = $('.to-top');
  if (toTop) toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();
