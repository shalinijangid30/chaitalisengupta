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
  // right edge of the viewport and holds its initial aligned offset below
  // the About heading as the copy scrolls past (clamped so it never rises
  // above the heading or drops below the consult button). It then simply
  // holds that position while the user keeps scrolling — the portfolio
  // section scrolls up toward it like any normal content. Only once the
  // marquee's anchor slot has physically scrolled up to meet the photo's
  // height does it shift left onto the anchored slot, while the rest of
  // the portfolio opens one card at a time and the marquee starts
  // scrolling behind it — the carousel reads as sliding in under the
  // photo, never dropping down to meet it. Reversible: scrolling back up
  // shifts it right, closes the marquee, then hands control back to
  // scroll tracking for the trip back up. Fine-pointer only.
  const followPhoto = document.getElementById('follow-photo');
  const portfolioEntryTrigger = document.getElementById('portfolio-entry-trigger');
  const portfolioMarquee = document.getElementById('portfolio-marquee');
  const portfolioMarqueeAnchor = document.getElementById('portfolio-marquee-anchor');

  if (followPhoto && portfolioEntryTrigger && portfolioMarquee && portfolioMarqueeAnchor) {
    const canFollowCursor =
      !prefersReducedMotion &&
      'IntersectionObserver' in window &&
      window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    // Lets the fallback observer below check whether the cursor
    // choreography has taken charge of the marquee reveal.
    let choreographyEngaged = () => false;

    if (!canFollowCursor) {
      followPhoto.remove();
      portfolioMarquee.classList.add('is-visible', 'is-scrolling');
    } else {
      const SETTLE_EPSILON = 0.5;
      const LERP = 0.14; // pace for the follow hold and the vertical drop
      const DOCK_LERP = 0.07; // slower, gentler pace easing into the anchor slot
      const REVEAL_COUNT = 9; // unique cards; loop duplicates follow via is-scrolling

      // The photo's glued column matches the 3rd marquee card exactly —
      // same X center, same width — so when it eventually docks, it's
      // already living on the marquee's own grid.
      const marqueeCards = Array.from(portfolioMarquee.querySelectorAll('.portfolio-marquee-card'));
      const thirdCard = marqueeCards[2];

      const glueColumn = () => {
        const r = thirdCard.getBoundingClientRect();
        // A card not yet opened sits 24px left of its resting spot.
        const comp =
          thirdCard.classList.contains('is-open') ||
          portfolioMarquee.classList.contains('is-scrolling')
            ? 0
            : 24;
        return { x: r.left + comp + r.width / 2, w: r.width };
      };

      // The photo holds its initial aligned Y for the entire wait phase —
      // it does not track scroll at all — so it reads as pinned in place
      // while the page (and eventually the carousel) scrolls underneath
      // it. The only live bound left is a safety floor: never above the
      // "About Chaitali" heading, in case initialY is ever computed above it.
      const aboutHeading = document.querySelector('.page-header');

      const clampFollowY = (y) => {
        const half = followPhoto.getBoundingClientRect().height / 2 || 150;
        if (aboutHeading) y = Math.max(y, aboutHeading.getBoundingClientRect().top + half);
        return y;
      };

      // Opens one card of space for every stretch of leftward travel:
      // the further the photo has moved along -x, the more slots open.
      const openCardsByProgress = (anchorRect) => {
        const rightEnd = glueColumn().x;
        const leftEnd = anchorRect.left + anchorRect.width / 2;
        const span = rightEnd - leftEnd;
        const p = span > 0 ? Math.min(Math.max((rightEnd - currentX) / span, 0), 1) : 1;
        marqueeCards.forEach((card, i) => {
          card.classList.toggle('is-open', i < p * REVEAL_COUNT);
        });
      };

      // Everything moves through one lerp loop — X, Y, and width all
      // glide toward their current targets at the same constant pace,
      // so the photo never changes speed between sections and never
      // "drops": it is always mid-glide toward wherever it belongs.
      const col = glueColumn();
      let currentX = col.x;
      let currentY = parseFloat(followPhoto.style.top) || window.innerHeight / 3;
      let currentW = col.w;

      // The photo's initial aligned Y, held fixed from here on — it no
      // longer tracks any live input. clampFollowY's live heading/button
      // rects are what let it respond to scroll: as the page moves, those
      // bounds slide past this fixed value and pin the photo to whichever
      // one it has reached, instead of it drifting indefinitely.
      const initialY = currentY;

      // Modes: follow → dockingY → dockingX → anchored → returningX → follow
      let mode = 'follow';
      choreographyEngaged = () => mode !== 'follow';

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
            targetY = clampFollowY(initialY);
            // The photo just holds this position — no target-chasing —
            // while the user scrolls normally. Only once the anchor slot
            // has physically scrolled up to the photo's own height does
            // the leftward dock begin, so it never lurches toward a
            // carousel that isn't even in the viewport yet.
            if (anchorRect.top <= currentY) {
              mode = 'dockingY';
              portfolioMarquee.classList.add('is-visible');
            }
          } else if (mode === 'dockingY') {
            // Keep gliding straight down the glued column — past the
            // anchor's top edge — until the photo's own base reaches the
            // marquee's base line, like it's settling onto the shelf
            // before it slides in.
            const c = glueColumn();
            targetX = c.x;
            targetW = c.w;
            const half = (currentW * 1.25) / 2; // aspect-ratio 4/5
            targetY = anchorRect.bottom - half;
            if (Math.abs(targetY - currentY) < SETTLE_EPSILON) mode = 'dockingX';
          } else if (mode === 'dockingX') {
            // Straight left onto the anchor slot, easing in at a slower,
            // gentler pace than the drop above; every stretch of leftward
            // travel opens another card of space behind it.
            // is-scrolling isn't added until settleInAnchor() — it forces
            // every card to full opacity, which would otherwise short-
            // circuit this one-by-one reveal and make the whole carousel
            // pop in at once instead of easing in behind the photo.
            targetX = anchorRect.left + anchorRect.width / 2;
            targetW = anchorRect.width;
            targetY = anchorRect.top + anchorRect.height / 2;
            openCardsByProgress(anchorRect);
            if (
              Math.abs(targetX - currentX) < SETTLE_EPSILON &&
              Math.abs(targetY - currentY) < SETTLE_EPSILON &&
              Math.abs(targetW - currentW) < SETTLE_EPSILON
            ) {
              settleInAnchor();
            }
          } else if (mode === 'returningX') {
            // Straight right, back to the glued column — the cards
            // close one by one as the space they had is taken back.
            const c = glueColumn();
            targetX = c.x;
            targetW = c.w;
            openCardsByProgress(anchorRect);
            if (Math.abs(targetX - currentX) < SETTLE_EPSILON) mode = 'follow';
          }

          const rate = mode === 'dockingX' ? DOCK_LERP : LERP;
          currentX += (targetX - currentX) * rate;
          currentY += (targetY - currentY) * rate;
          currentW += (targetW - currentW) * rate;
          // settleInAnchor() may have just switched to 'anchored' above —
          // it already clears these inline styles so the CSS .is-anchored
          // rule (inset: 0) can take over; don't stomp on that here.
          if (mode !== 'anchored') {
            followPhoto.style.left = currentX + 'px';
            followPhoto.style.top = currentY + 'px';
            followPhoto.style.width = currentW + 'px';
          }
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

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

      // The forward dock is now triggered physically (see tick() above),
      // not by scroll position of a trigger element. This observer only
      // handles the reverse trip: undocking when the visitor scrolls
      // back up past the dock zone.
      const dockObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (
              !entry.isIntersecting &&
              mode !== 'follow' &&
              mode !== 'returningX' &&
              entry.boundingClientRect.top > 0
            ) {
              // Undock only when the trigger drops below the dock zone —
              // i.e. the visitor scrolled back up. Scrolling deeper down
              // (trigger exiting past the top) keeps the photo anchored.
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
    // It stands down whenever the choreography has taken charge, so it
    // can never force the cards open mid-glide.
    const marqueeFallbackObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setTimeout(() => {
              if (!choreographyEngaged() && !portfolioMarquee.classList.contains('is-scrolling')) {
                portfolioMarquee.classList.add('is-visible', 'is-scrolling');
              }
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
