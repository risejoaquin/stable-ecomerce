(() => {
  const link = document.getElementById('selfcare-brand-fonts');
  if (!link) return;

  const activate = () => {
    link.media = 'all';
  };

  if (link.sheet) {
    activate();
    return;
  }

  link.addEventListener('load', activate, { once: true });
})();
