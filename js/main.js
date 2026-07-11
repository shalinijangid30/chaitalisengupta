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
