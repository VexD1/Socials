// The glasses send directional gestures as arrow keys and selection as Enter.
// Keep the service links as ordinary same-tab links so system Back can return here.
const choices = [...document.querySelectorAll('.choice')];

document.addEventListener('keydown', (event) => {
  const current = choices.indexOf(document.activeElement);
  if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
    event.preventDefault();
    choices[(current + 1 + choices.length) % choices.length].focus();
  } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
    event.preventDefault();
    choices[(current - 1 + choices.length) % choices.length].focus();
  } else if (event.key === 'Enter' && current !== -1) {
    // Glasses activation delivers Enter; explicitly activate the focused link.
    event.preventDefault();
    choices[current].click();
  }
});

// Restore the last selected service when returning with the glasses' Back action.
choices.forEach((choice, index) => choice.addEventListener('click', () => {
  try { sessionStorage.setItem('lastChoice', String(index)); } catch { /* optional */ }
}));
window.addEventListener('pageshow', () => {
  let index = 0;
  try { index = Number(sessionStorage.getItem('lastChoice')) || 0; } catch { /* optional */ }
  if (choices[index]) choices[index].focus();
});
