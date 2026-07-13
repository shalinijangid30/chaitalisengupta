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
  // copy scrolls past, then docks diagonally onto the marquee's anchored
  // first slot and stays there as the rest of the portfolio trains in and
  // scrolls past it. Reversible: scrolling back up undocks it and it
  // resumes following the cursor. Fine-pointer only.
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
      const DOCK_MS = 2142;
      const HOME_WIDTH = 240;

      // Glued to the right edge — only the vertical position follows the
      // cursor. The offset is captured from the photo's starting position
      // so it stays anchored the same distance from the right edge.
      const glueOffsetFromRight = window.innerWidth - parseFloat(followPhoto.style.left || window.innerWidth * 0.876);
      let targetY = parseFloat(followPhoto.style.top) || window.innerHeight / 3;
      let currentY = targetY;
      let following = true;
      let anchored = false;
      let dockTimer = null;

      window.addEventListener('mousemove', (e) => {
        targetY = e.clientY;
      });

      const tick = () => {
        if (following) {
          currentY += (targetY - currentY) * 0.14;
          followPhoto.style.left = window.innerWidth - glueOffsetFromRight + 'px';
          followPhoto.style.top = currentY + 'px';
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);

      const dockForward = () => {
        following = false;
        anchored = true;
        clearTimeout(dockTimer);

        const rect = portfolioMarqueeAnchor.getBoundingClientRect();
        followPhoto.classList.remove('is-anchored');
        followPhoto.classList.add('is-following', 'is-docking');
        followPhoto.style.left = rect.left + rect.width / 2 + 'px';
        followPhoto.style.top = rect.top + rect.height / 2 + 'px';
        followPhoto.style.width = rect.width + 'px';

        // Reveal the marquee row right away so it never stays invisible
        // waiting on the diagonal-dock animation to finish.
        portfolioMarquee.classList.add('is-visible');

        dockTimer = setTimeout(() => {
          followPhoto.classList.remove('is-following', 'is-docking');
          followPhoto.classList.add('is-anchored');
          followPhoto.style.left = '';
          followPhoto.style.top = '';
          followPhoto.style.width = '';
          portfolioMarqueeAnchor.appendChild(followPhoto);
          portfolioMarquee.classList.add('is-scrolling');
        }, DOCK_MS);
      };

      const dockBack = () => {
        anchored = false;
        clearTimeout(dockTimer);
        portfolioMarquee.classList.remove('is-visible', 'is-scrolling');

        // Leave the anchor slot while still visually in place, then let the
        // fixed-position transition slide it back up to the cursor.
        const rect = followPhoto.getBoundingClientRect();
        document.body.appendChild(followPhoto);
        followPhoto.classList.remove('is-anchored');
        followPhoto.classList.add('is-following');
        followPhoto.style.left = rect.left + rect.width / 2 + 'px';
        followPhoto.style.top = rect.top + rect.height / 2 + 'px';
        followPhoto.style.width = rect.width + 'px';

        requestAnimationFrame(() => {
          followPhoto.classList.add('is-docking');
          followPhoto.style.left = window.innerWidth - glueOffsetFromRight + 'px';
          followPhoto.style.top = currentY + 'px';
          followPhoto.style.width = HOME_WIDTH + 'px';
        });

        dockTimer = setTimeout(() => {
          followPhoto.classList.remove('is-docking');
          followPhoto.style.width = '';
          following = true;
        }, DOCK_MS);
      };

      const dockObserver = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !anchored) {
              dockForward();
            } else if (!entry.isIntersecting && anchored) {
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
