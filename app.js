/* app.js
   Frontend logic for AuraMiner Web App
   - Handles: taps, energy local animation+sync, upgrades, tasks, referrals.
   - Syncs with backend API endpoints for persistence.
*/

/* ====== Configuration ====== */
const API_BASE = ''; // served from same origin; bot Express will serve this app
const urlParams = new URLSearchParams(window.location.search);
const telegramUserId = urlParams.get('user_id') || localStorage.getItem('aura_guest_id') || null;

/* If no user_id from Telegram, create a guest id and persist locally */
let userId = telegramUserId;
if (!userId) {
  // simple guest id
  userId = 'guest_' + (localStorage.getItem('aura_guest_id') || (Date.now().toString(36) + Math.random().toString(36).slice(2,8)));
  localStorage.setItem('aura_guest_id', userId);
}

/* State */
let user = null; // server representation
let localEnergy = 0;
let localMaxEnergy = 1000;
let lastLocalEnergyTick = Date.now();
let regenActive = true;
let localCoinsPerTap = 1;
let localMultitapLevel = 0;

/* DOM references */
const balanceAmount = document.getElementById('balanceAmount');
const energyText = document.getElementById('energyText');
const energyBar = document.getElementById('energyBar');
const crystalBtn = document.getElementById('crystalBtn');
const floatingContainer = document.getElementById('floatingContainer');
const coinsPerTapSpan = document.getElementById('coinsPerTap');
const multitapLevelSpan = document.getElementById('multitapLevel');

const referralLinkInput = document.getElementById('referralLink');
const copyReferral = document.getElementById('copyReferral');
const shareReferral = document.getElementById('shareReferral');
const refStatus = document.getElementById('refStatus');

/* Tab handling */
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    document.querySelectorAll('.tab-section').forEach(s => s.classList.add('hidden'));
    document.getElementById('tab-' + tab).classList.remove('hidden');
  });
});

/* Setup buy buttons */
document.querySelectorAll('.buy-btn').forEach(b => {
  b.addEventListener('click', async (e) => {
    const upgrade = b.dataset.upgrade;
    await buyUpgrade(upgrade);
  });
});

/* Task buttons */
document.querySelectorAll('.task-btn').forEach(b => {
  b.addEventListener('click', async () => {
    const taskId = b.dataset.task;
    b.disabled = true;
    b.textContent = 'Verifying...';
    try {
      const res = await fetch(`/api/task/verify`, {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ userId, taskId })
      });
      const data = await res.json();
      alert(data.message || 'Task verified! Reward credited.');
      await loadUser();
    } catch (err) {
      console.error(err);
      alert('Task verification failed (mock).');
    } finally {
      b.disabled = false;
      b.textContent = 'Verify';
    }
  });
});

/* Copy & share referral */
copyReferral.addEventListener('click', () => {
  referralLinkInput.select();
  document.execCommand('copy');
  copyReferral.textContent = 'Copied';
  setTimeout(()=>copyReferral.textContent='Copy',1200);
});

shareReferral.addEventListener('click', async () => {
  const url = referralLinkInput.value;
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Join AuraMiner', text: 'Get 5,000 AURA when you join!', url });
    } catch (err) { /* user cancelled */ }
  } else {
    referralLinkInput.select();
    document.execCommand('copy');
    alert('Link copied to clipboard');
  }
});

/* Floating + animation helper */
function spawnFloatingPlus(x, y, text = '+1') {
  const el = document.createElement('div');
  el.className = 'floating-plus';
  el.style.left = (x) + 'px';
  el.style.top = (y) + 'px';
  el.textContent = text;
  floatingContainer.appendChild(el);
  setTimeout(()=> el.remove(), 1100);
}

/* Helpers: update DOM from user */
function renderUser() {
  if (!user) return;
  balanceAmount.textContent = Math.floor(user.balance).toLocaleString();
  localEnergy = user.energy;
  localMaxEnergy = user.maxEnergy;
  energyText.textContent = `${Math.floor(localEnergy)} / ${localMaxEnergy}`;
  const pct = Math.max(0, Math.min(100, (localEnergy / localMaxEnergy) * 100));
  energyBar.style.width = pct + '%';
  // coins per tap calculation
  localMultitapLevel = user.multitapLevel || 0;
  localCoinsPerTap = 1 * (1 + localMultitapLevel); // base 1 AURA times (1 + level)
  coinsPerTapSpan.textContent = localCoinsPerTap;
  multitapLevelSpan.textContent = localMultitapLevel;
  // referral link
  const base = `${window.location.origin}${window.location.pathname}`;
  const link = `${base}?ref=${encodeURIComponent(user.id)}${telegramUserId ? `&user_id=${encodeURIComponent(telegramUserId)}` : ''}`;
  referralLinkInput.value = link;
  refStatus.textContent = user.referredBy ? `Referred by ${user.referredBy}` : (user.referredBy === null ? 'None' : user.referredBy);
}

/* Fetch user from server & create if missing */
async function loadUser() {
  try {
    const res = await fetch(`/api/user/${encodeURIComponent(userId)}`);
    user = await res.json();
    renderUser();
  } catch (err) {
    console
