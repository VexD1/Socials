const choices = [...document.querySelectorAll('.choice')];
const activity = document.getElementById('activity');
const startUrl = window.location.href;
let opening = false;

function serviceName(button) {
  return button.classList.contains('tiktok') ? 'TikTok' : 'Instagram Reels';
}

// Native buttons let the glasses browser own focus movement and activation.
// This listener is observational only, so it cannot compete with the browser.
choices.forEach(button => {
  button.addEventListener('keydown', event => {
    if (event.key === 'Enter') activity.textContent = `Pinch received for ${serviceName(button)}…`;
  });

  button.addEventListener('click', () => {
    if (opening) return;
    opening = true;
    const name = serviceName(button);
    activity.textContent = `Opening ${name}…`;

    try { window.location.assign(button.dataset.url); }
    catch { activity.textContent = `${name} cannot open here.`; opening = false; }

    setTimeout(() => {
      if (window.location.href === startUrl && document.visibilityState === 'visible') {
        activity.textContent = `${name} cannot open here.`;
        opening = false;
      }
    }, 4500);
  });
});

document.getElementById('test-pinch').addEventListener('click', () => {
  activity.textContent = 'Pinch works in Socials.';
});

window.addEventListener('pageshow', () => {
  opening = false;
  activity.textContent = 'What would you like to watch?';
});
