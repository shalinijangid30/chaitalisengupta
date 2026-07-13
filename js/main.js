(() => {
  const navToggle = document.getElementById('nav-toggle');
  const mainNav = document.getElementById('main-nav');

  navToggle.addEventListener('click', () => {
    const isOpen = mainNav.classList.toggle('is-open');
    navToggle.setAttribute('aria-expanded', String(isOpen));
  });

  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => {
      mainNav.classList.remove('is-open');
      navToggle.setAttribute('aria-expanded', 'false');
    });
  });

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const revealEls = document.querySelectorAll('.reveal, .train-left, .train-right');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealEls.forEach((el) => el.classList.add('is-visible'));
  } else {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    revealEls.forEach((el) => observer.observe(el));
  }

  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // About + Portfolio hand-off — the first About photo is glued to the
  // right edge of the viewport and tracks the cursor vertically while the
  // copy scrolls past. On reaching the trigger it keeps using that very
  // same cursor-follow glide — just re-aimed at the marquee's baseline
  // instead of the live cursor — so the descent never "drops" or changes
  // pace. Once it settles on the baseline it shifts straight left onto
  // the marquee's anchored slot, while the rest of the portfolio opens
  // one card at a time behind it. Reversible: scrolling back up shifts it
  // right, closes the marquee, then hands control back to live cursor
  // tracking for the trip back up. Fine-pointer only.
  const followPhoto = document.getElementById('follow-photo');
  const portfolioEntryTrigger = document.getElementById('portfolio-entry-trigger');
  const portfolioMarquee = document.getElementById('portfolio-marquee');
  const portfolioMarqueeAnchor = document.getElementById('portfolio-marquee-anchor');

  if (followPhoto && portfolioEntryTrigger && portfolioMarquee && portfolioMarqueeAnchor) {
    const canFollowCursor =
      !prefersReducedMotion &&
      'IntersectionObserver' in window &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    if (!canFollowCursor) {
      followPhoto.remove();
      portfolioMarquee.classList.add('is-visible', 'is-scrolling');
    } else {
      const SETTLE_EPSILON = 0.5;
      const LERP = 0.14; // one shared pace for every phase, every axis

      // The photo's glued column matches the 3rd marquee card exactly —
      // same X center, same width — so when it eventually docks, it's
      // already living on the marquee's own grid.
      const thirdCard = portfolioMarquee.querySelectorAll('.portfolio-marquee-card')[2];

      const glueColumn = () => {
        const r = thirdCard.getBoundingClientRect();
        // Cards not yet revealed sit 24px left of their resting spot.
        const comp = portfolioMarquee.classList.contains('is-visible') ? 0 : 24;
        return { x: r.left + comp + r.width / 2, w: r.width };
      };

      // Everything moves through one lerp loop — X, Y, and width all
      // glide toward their current targets at the same constant pace,
      // so the photo never changes speed between sections and never
      // "drops": it is always mid-glide toward wherever it belongs.
      const col = glueColumn();
      let currentX = col.x;
      let currentY = parseFloat(followPhoto.style.top) || window.innerHeight / 3;
      let currentW = col.w;
      let cursorY = currentY;

      // Modes: follow → dockingY → dockingX → anchored → returningX → follow
      let mode = 'follow';

      window.addEventListener('mousemove', (e) => {
        cursorY = e.clientY;
      });

      const settleInAnchor = () => {
        mode = 'anchored';
        followPhoto.classList.remove('is-following');
        followPhoto.classList.add('is-anchored');
        followPhoto.style.left = '';
        followPhoto.style.top = '';
        followPhoto.style.width = '';
        portfolioMarqueeAnchor.appendChild(followPhoto);
        portfolioMarquee.classList.add('is-scrolling');
      };

      const tick = () => {
        if (mode !== 'anchored') {
          let targetX = currentX;
          let targetY = currentY;
          let targetW = currentW;
          const anchorRect = portfolioMarqueeAnchor.getBoundingClientRect();

          if (mode === 'follow') {
            const c = glueColumn();
            targetX = c.x;
            targetW = c.w;
            targetY = cursorY;
          } else if (mode === 'dockingY') {
            // Straight down the glued column to the marquee's baseline.
            const c = glueColumn();
            targetX = c.x;
            targetW = c.w;
            targetY = anchorRect.top + anchorRect.height / 2;
            if (Math.abs(targetY - currentY) < SETTLE_EPSILON) mode = 'dockingX';
          } else if (mode === 'dockingX') {
            // Straight left onto the anchor slot while the cards open.
            portfolioMarquee.classList.add('is-visible');
            targetX = anchorRect.left + anchorRect.width / 2;
            targetW = anchorRect.width;
            targetY = anchorRect.top + anchorRect.height / 2;
            if (
              Math.abs(targetX - currentX) < SETTLE_EPSILON &&
              Math.abs(targetY - currentY) < SETTLE_EPSILON
            ) {
              settleInAnchor();
            }
          } else if (mode === 'returningX') {
            // Straight right, back to the glued column, marquee closing.
            const c = glueColumn();
            targetX = c.x;
            targetW = c.w;
            if (Math.abs(targetX - currentX) < SETTLE_EPSILON) mode = 'follow';
          }

          currentX += (targetX - currentX) * LERP;
          currentY += (targetY - currentY) * LERP;
          currentW += (targetW - currentW) * LERP;
          followPhoto.style.left = currentX + 'px';
          followPhoto.style.top = currentY + 'px';
          followPhoto.style.width = currentW + 'px';
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      const dockForward = () => {
        if (mode === 'anchored') return;
        mode = 'dockingY';
      };

      const dockBack = () => {
        if (mode === 'anchored') {
          // Leave the anchor slot while still visually in place.
          const rect = followPhoto.getBoundingClientRect();
          document.body.appendChild(followPhoto);
          followPhoto.classList.remove('is-anchored');
          followPhoto.classList.add('is-following');
          currentX = rect.left + rect.width / 2;
          currentY = rect.top + rect.height / 2;
          currentW = rect.width;
          followPhoto.style.left = currentX + 'px';
          followPhoto.style.top = currentY + 'px';
          followPhoto.style.width = currentW + 'px';
        }
        portfolioMarquee.classList.remove('is-visible', 'is-scrolling');
        mode = 'returningX';
      };

      const dockObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              if (mode === 'follow' || mode === 'returningX') dockForward();
            } else if (mode !== 'follow' && mode !== 'returningX') {
              dockBack();
            }
          });
        },
        { threshold: 0, rootMargin: '0px 0px -35% 0px' }
      );
      dockObserver.observe(portfolioEntryTrigger);
    }

    // Safety net — guarantees the marquee reveals once it scrolls into
    // view even if the cursor-follow/dock sequence above never fires.
    // Waits out the normal dock duration first so it never races ahead
    // of (or visibly duplicates) that choreography in the working case.
    const marqueeFallbackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              portfolioMarquee.classList.add('is-visible', 'is-scrolling');
            }, 2200);
            marqueeFallbackObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    marqueeFallbackObserver.observe(portfolioMarquee);
  }

  // Custom round cursor — fine pointer only, disabled under reduced motion.
  const canUseCustomCursor =
    window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (canUseCustomCursor) {
    const dot = document.createElement('div');
    dot.className = 'cursor-dot is-hidden';
    document.body.appendChild(dot);

    let targetX = 0, targetY = 0;
    let currentX = 0, currentY = 0;
    let hasMoved = false;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!hasMoved) {
        hasMoved = true;
        currentX = targetX;
        currentY = targetY;
        dot.classList.remove('is-hidden');
      }
    });

    document.addEventListener('mouseleave', () => dot.classList.add('is-hidden'));
    document.addEventListener('mouseenter', () => dot.classList.remove('is-hidden'));

    const ease = prefersReducedMotion ? 1 : 0.22;

    const tick = () => {
      currentX += (targetX - currentX) * ease;
      currentY += (targetY - currentY) * ease;
      dot.style.transform = `translate3d(${currentX}px, ${currentY}px, 0)`;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  // Typewriter headline — types character-by-character with randomized
  // speed, then stops (cursor keeps blinking via CSS, no erase/loop).
  // The visible span is aria-hidden; a sibling .sr-only span carries the
  // real text for screen readers.
  const typewriterEl = document.getElementById('typewriter-text');
  if (typewriterEl) {
    const fullText = (typewriterEl.getAttribute('data-text') || '').split('\\n');

    const renderFull = () => {
      typewriterEl.textContent = '';
      fullText.forEach((line, i) => {
        typewriterEl.appendChild(document.createTextNode(line));
        if (i < fullText.length - 1) typewriterEl.appendChild(document.createElement('br'));
      });
    };

    if (prefersReducedMotion) {
      renderFull();
    } else {
      typewriterEl.textContent = '';
      let lineIndex = 0;
      let charIndex = 0;
      let lineNode = document.createTextNode('');
      typewriterEl.appendChild(lineNode);

      const step = () => {
        const line = fullText[lineIndex];
        if (charIndex < line.length) {
          lineNode.textContent += line[charIndex];
          charIndex++;
          setTimeout(step, 45 + Math.random() * 75); // randomized keystroke delay
        } else if (lineIndex < fullText.length - 1) {
          lineIndex++;
          charIndex = 0;
          typewriterEl.appendChild(document.createElement('br'));
          lineNode = document.createTextNode('');
          typewriterEl.appendChild(lineNode);
          setTimeout(step, 250); // brief pause at the line break
        }
        // else: done — leave the text in place, cursor keeps blinking.
      };
      step();
    }
  }
})();
