let coinFlipContext = null;
let coinFlipRunning = false;

function openCoinFlipModal(context = '') {
  coinFlipContext = context;
  coinFlipRunning = false;

  const sub = document.getElementById('coinflip-sub');
  const coin = document.getElementById('coinflip-coin');
  const result = document.getElementById('coinflip-result');

  if (sub) sub.textContent = context ? `Münzwurf für ${context}` : 'Wer beginnt?';
  if (coin) coin.textContent = '🪙';
  if (result) result.textContent = '';

  document.getElementById('coinflip-modal')?.classList.remove('hidden');
}

function closeCoinFlipModal() {
  if (coinFlipRunning) return;
  document.getElementById('coinflip-modal')?.classList.add('hidden');
}

function runCoinFlip() {
  if (coinFlipRunning) return;

  coinFlipRunning = true;

  const coin = document.getElementById('coinflip-coin');
  const result = document.getElementById('coinflip-result');

  if (result) result.textContent = 'Die Münze fliegt...';

  let ticks = 0;
     const frames = [
      getGroupEmoji('T1'),
      getGroupEmoji('T2')
    ];

  const timer = setInterval(() => {
    ticks++;

    if (coin) {
      coin.textContent = frames[ticks % 2];
      coin.style.transform =
        `rotate(${ticks * 180}deg) scale(${1 + (ticks % 2) * 0.08})`;
    }

    if (ticks >= 14) {
      clearInterval(timer);

      const winner = Math.random() < 0.5 ? 'T1' : 'T2';

      if (coin) {
        coin.textContent = '🪙';
        coin.style.transform = '';
      }

      if (result) {
        result.textContent =
        `${getGroupEmoji(winner)} ${getGroupLabel(winner)} beginnt`;
      }

      coinFlipRunning = false;
    }
  }, 90);
}
