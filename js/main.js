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

  // About + Portfolio hand-off — the About photo is glued to the right
  // edge of the viewport, its vertical position a direct (unlerped)
  // function of scroll: it holds its aligned offset below the About
  // heading as the copy scrolls past, clamped so it never rises above
  // the heading. Once the pinned dock stage further down starts
  // sticking, further scroll drives its horizontal dock onto the
  // marquee's anchored first slot 1:1 with scroll distance — the rest
  // of the page holds still while that plays out. Fully reversible:
  // scrolling back up runs the exact same position mapping backwards,
  // automatically, since everything here is a pure function of the
  // live scroll-derived geometry rather than a stateful animation.
  const followPhoto = document.getElementById('follow-photo');
  const portfolioMarquee = document.getElementById('portfolio-marquee');
  const portfolioMarqueeAnchor = document.getElementById('portfolio-marquee-anchor');
  const portfolioDockSpacer = document.getElementById('portfolio-dock-spacer');
  const portfolioDockStage = document.getElementById('portfolio-dock-stage');

  if (followPhoto && portfolioMarquee && portfolioMarqueeAnchor && portfolioDockSpacer && portfolioDockStage) {
    if (prefersReducedMotion) {
      followPhoto.remove();
      portfolioMarquee.classList.add('is-playing');
    } else {
      const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

      const marqueeCards = Array.from(portfolioMarquee.querySelectorAll('.portfolio-marquee-card'));
      const thirdCard = marqueeCards[2];
      const portfolioMarqueeViewport = portfolioMarquee.querySelector('.portfolio-marquee-viewport');
      const portfolioMarqueeTrack = portfolioMarquee.querySelector('.portfolio-marquee-track');
      const aboutHeading = document.querySelector('.page-header');

      // The photo's glued column matches the 3rd marquee card exactly —
      // same X center, same width — so when it eventually docks, it's
      // already living on the marquee's own grid.
      const glueColumn = () => {
        const r = thirdCard.getBoundingClientRect();
        return { x: r.left + r.width / 2, w: r.width };
      };

      const anchorTarget = () => {
        const r = portfolioMarqueeAnchor.getBoundingClientRect();
        return { x: r.left + r.width / 2, w: r.width, y: r.top + r.height / 2 };
      };

      // The photo starts at its initial aligned Y and moves straight down
      // 1:1 with scroll distance, reaching dockedY (the row's vertical
      // center once the stage is pinned — window.innerHeight / 2, since
      // the stage is a top:0/100vh flex container with align-items:
      // center) exactly as the dock stage begins sticking, for a seamless
      // hand-off into the horizontal phase. Floor: never above the
      // "About Chaitali" heading, as a safety clamp only.
      const initialY = parseFloat(followPhoto.style.top) || window.innerHeight / 3;
      const dockedY = () => window.innerHeight / 2;
      const clampFollowY = (y) => {
        const half = followPhoto.getBoundingClientRect().height / 2 || 150;
        if (aboutHeading) y = Math.max(y, aboutHeading.getBoundingClientRect().top + half);
        return y;
      };

      // Invariant distance (in document coordinates) from the page's
      // current-load scroll position to where the dock spacer begins —
      // i.e. how far the user scrolls during the vertical phase. Valid
      // at any scroll position since spacerRect.top + scrollY reconstructs
      // the spacer's fixed document offset regardless of current scroll.
      let verticalTravelPx = 1;
      const measureVerticalTravel = () => {
        const spacerRect = portfolioDockSpacer.getBoundingClientRect();
        verticalTravelPx = Math.max(1, spacerRect.top + window.scrollY);
      };

      // Single shared pace for the marquee's post-dock autoplay — the
      // only place in this feature where "speed" (as opposed to a
      // scroll-locked position) applies, since the dock/undock phase
      // below is 1:1 with scroll distance, not time.
      const DOCK_SPEED_PX_PER_MS = 0.067;

      const sizeMarqueeDuration = () => {
        const trackHalfWidth = portfolioMarqueeTrack.scrollWidth / 2;
        const durationMs = trackHalfWidth / DOCK_SPEED_PX_PER_MS;
        portfolioDockStage.style.setProperty('--marquee-duration', (durationMs / 1000) + 's');
      };

      // The spacer reserves 100vh (for the sticky pin) plus the real
      // horizontal travel distance (for the scroll-jacked dock), so
      // pinProgress below reaches exactly 1 right as the stage would
      // naturally un-stick — no extra bookkeeping needed to release it.
      const sizeDockSpacer = () => {
        const travelPx = Math.abs(anchorTarget().x - glueColumn().x);
        portfolioDockSpacer.style.height = (window.innerHeight + travelPx) + 'px';
      };

      let phase = 'vertical'; // 'vertical' | 'horizontal' | 'docked'

      const undockToFixed = () => {
        const rect = followPhoto.getBoundingClientRect();
        document.body.appendChild(followPhoto);
        followPhoto.classList.remove('is-anchored');
        followPhoto.classList.add('is-following');
        followPhoto.style.left = (rect.left + rect.width / 2) + 'px';
        followPhoto.style.top = (rect.top + rect.height / 2) + 'px';
        followPhoto.style.width = rect.width + 'px';
        portfolioMarquee.classList.remove('is-playing');
      };

      const dockIntoAnchor = () => {
        followPhoto.classList.remove('is-following');
        followPhoto.classList.add('is-anchored');
        followPhoto.style.left = '';
        followPhoto.style.top = '';
        followPhoto.style.width = '';
        portfolioMarqueeAnchor.appendChild(followPhoto);
        portfolioMarquee.classList.add('is-playing');
        // The CSS .is-playing rule takes the viewport the rest of the
        // way to fully revealed; drop the inline clip so it can.
        portfolioMarqueeViewport.style.clipPath = '';
      };

      const update = () => {
        const spacerRect = portfolioDockSpacer.getBoundingClientRect();
        const scrollableDistance = portfolioDockSpacer.offsetHeight - window.innerHeight;
        const pinProgress = scrollableDistance > 0 ? clamp(-spacerRect.top / scrollableDistance, 0, 1) : 0;

        if (spacerRect.top > 0) {
          // Vertical phase: page scrolls normally; Y is a direct (no
          // easing) linear map from initialY to dockedY over
          // verticalTravelPx, so the photo visibly moves down 1:1 with
          // scroll and arrives at dockedY exactly as the stage sticks.
          if (phase === 'docked') undockToFixed();
          phase = 'vertical';
          const verticalProgress = clamp(1 - spacerRect.top / verticalTravelPx, 0, 1);
          const y = initialY + (dockedY() - initialY) * verticalProgress;
          const glue = glueColumn();
          followPhoto.style.left = glue.x + 'px';
          followPhoto.style.top = clampFollowY(y) + 'px';
          followPhoto.style.width = glue.w + 'px';
        } else if (pinProgress < 1) {
          // Horizontal phase: the stage is pinned; pinProgress is a
          // direct read of how far scrolled through the reserved
          // distance, so X/width and the carousel reveal below are
          // both driven by the same value — trivially in lockstep.
          if (phase === 'docked') undockToFixed();
          phase = 'horizontal';
          const glue = glueColumn();
          const anchor = anchorTarget();
          followPhoto.style.left = (glue.x + (anchor.x - glue.x) * pinProgress) + 'px';
          followPhoto.style.top = anchor.y + 'px';
          followPhoto.style.width = (glue.w + (anchor.w - glue.w) * pinProgress) + 'px';
          portfolioMarqueeViewport.style.clipPath = `inset(0 ${100 - pinProgress * 100}% 0 0)`;
        } else {
          // Docked: fully revealed, marquee autoplays until pinProgress
          // drops back below 1 (the instant the user scrolls back up).
          if (phase !== 'docked') dockIntoAnchor();
          phase = 'docked';
        }
      };

      // Called directly on scroll — not rAF-batched — so the position is
      // set synchronously with the scroll event itself: zero deferred-
      // frame lag, the most literal reading of "lockstep with scrolling".
      // update() only reads already-committed layout (getBoundingClientRect)
      // and writes inline styles, so it's cheap enough per scroll event
      // not to need batching.
      sizeMarqueeDuration();
      sizeDockSpacer();
      measureVerticalTravel();
      update();
      window.addEventListener('scroll', update, { passive: true });
      window.addEventListener('resize', () => {
        sizeMarqueeDuration();
        sizeDockSpacer();
        measureVerticalTravel();
        update();
      });
      window.addEventListener('load', () => {
        sizeDockSpacer();
        measureVerticalTravel();
        update();
      });
    }
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
