// Reveal titles as they scroll into view — runs first so a later
// script error can't leave headings stuck invisible.
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('in-view');
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('h1, h2').forEach(el => revealObserver.observe(el));

// Mobile nav toggle
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

navToggle.addEventListener('click', () => {
  const isOpen = navLinks.classList.toggle('open');
  navToggle.setAttribute('aria-expanded', isOpen);
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
    navToggle.setAttribute('aria-expanded', 'false');
  });
});

// UGC work grid filtering
const filterBar = document.getElementById('filterBar');
const workCards = document.querySelectorAll('.work-card');

if (filterBar) {
  filterBar.addEventListener('click', (e) => {
    const btn = e.target.closest('.filter-btn');
    if (!btn) return;

    filterBar.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    const filter = btn.dataset.filter;

    workCards.forEach(card => {
      const matches = filter === 'all' || card.dataset.category === filter;
      card.classList.toggle('hidden', !matches);
    });
  });
}

// Contact form — submits to /api/brief (see api/brief.js)
const contactForm = document.querySelector('.contact-form');
if (contactForm) {
  const submitBtn = contactForm.querySelector('button[type="submit"]');
  const originalBtnText = submitBtn.textContent;

  contactForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Clear any previous error states
    contactForm.querySelectorAll('.field-error').forEach(el => el.remove());
    contactForm.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));

    const formData = Object.fromEntries(new FormData(contactForm));

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending...';

    try {
      const res = await fetch('/api/brief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success) {
        contactForm.reset();
        submitBtn.textContent = 'Sent! ✓';
        setTimeout(() => { submitBtn.textContent = originalBtnText; }, 3000);
      } else if (data.errors) {
        // Show inline errors under each invalid field
        Object.entries(data.errors).forEach(([field, message]) => {
          const input = contactForm.querySelector(`[name="${field}"]`);
          if (input) {
            input.classList.add('has-error');
            const errEl = document.createElement('span');
            errEl.className = 'field-error';
            errEl.textContent = message;
            input.insertAdjacentElement('afterend', errEl);
          }
        });
        submitBtn.textContent = originalBtnText;
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      alert('Something went wrong sending your brief — please try emailing ugcnaveini@gmail.com directly.');
      submitBtn.textContent = originalBtnText;
    } finally {
      submitBtn.disabled = false;
    }
  });
}