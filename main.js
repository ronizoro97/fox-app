/* FOX — main.js */

// Navbar scroll
(function(){
  const nav = document.getElementById('navbar');
  if (!nav) return;
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 50);
  });
})();

// Scroll fade-in
(function(){
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.08 });
  document.querySelectorAll('.fade-in').forEach(el => obs.observe(el));
})();

// Flash auto dismiss
(function(){
  document.querySelectorAll('.flash').forEach(f => {
    setTimeout(() => {
      f.style.transition = 'opacity .5s';
      f.style.opacity = '0';
      setTimeout(() => f.remove(), 500);
    }, 4000);
  });
})();