const ICONS = ['gift','star','trophy','crown','gem','diamond','coins','dollar-sign','sparkles','award','medal','ticket','rocket','zap','flame','heart','percent','party-popper','clover','dice-5'];
const SECTOR_COLORS = ['oklch(0.65 0.22 20)','oklch(0.68 0.20 40)','oklch(0.74 0.18 80)','oklch(0.68 0.18 155)','oklch(0.64 0.12 190)','oklch(0.58 0.14 250)'];
const DEFAULT_BONUSES = [
  {id:'1',name:'Скидка 10%',icon:'percent'},{id:'2',name:'Фриспины',icon:'sparkles'},
  {id:'3',name:'Бонус 500₽',icon:'coins'},{id:'4',name:'Призовой билет',icon:'ticket'},
  {id:'5',name:'Удвоение',icon:'zap'},{id:'6',name:'Джекпот',icon:'crown'},
  {id:'7',name:'Кэшбэк',icon:'diamond'},{id:'8',name:'Секретный приз',icon:'gift'},
];
const STORAGE_KEY = 'roulette_bonuses';
const NUM_BULBS = 18;

let bonuses = [];
let isSpinning = false;
let editingId = null;
let selectedIcon = null;
let confettiFrame = null;
let bulbRadius = 0;
let bulbElements = [];
let prevFocus = null;

function loadBonuses() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) throw Error();
    const data = JSON.parse(raw);
    if (!Array.isArray(data) || !data.length) throw Error();
    const valid = data.filter(b => b && typeof b.id=='string' && typeof b.name=='string' && typeof b.icon=='string');
    if (!valid.length) throw Error();
    bonuses = valid;
  } catch { bonuses = structuredClone(DEFAULT_BONUSES) }
}
function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(bonuses)) }

function assignColor(i, n) {
  const c = SECTOR_COLORS[i % SECTOR_COLORS.length];
  return (n > SECTOR_COLORS.length && i === n-1 && c === SECTOR_COLORS[0])
    ? SECTOR_COLORS[(i+1) % SECTOR_COLORS.length]
    : c;
}

function renderWheel() {
  const disc = document.getElementById('wheelDisc');
  const labelContainer = document.getElementById('labelContainer');
  labelContainer.innerHTML = '';
  const n = bonuses.length;
  if (!n) {
    disc.style.background = 'oklch(0.20 0.04 290)';
    document.querySelector('.wheel-container').classList.remove('wheel-container--dense');
    updateSpinButton();
    return;
  }
  const sectorAngle = 360 / n;
  const parts = [];
  for (let i = 0; i < n; i++) {
    const c = assignColor(i, n);
    parts.push(`${c} ${i*sectorAngle}deg ${(i+1)*sectorAngle}deg`);
  }
  disc.style.background = `conic-gradient(from 0deg, ${parts.join(', ')})`;

  const radius = document.querySelector('.wheel-container').offsetWidth * 0.38;
  for (let i = 0; i < n; i++) {
    const mid = i * sectorAngle + sectorAngle / 2;
    const midRad = mid * Math.PI / 180;
    const flip = mid > 90 && mid < 270;
    const label = document.createElement('div');
    label.className = 'wheel-label';
    label.style.left = `calc(50% + ${radius * Math.sin(midRad)}px)`;
    label.style.top = `calc(50% - ${radius * Math.cos(midRad)}px)`;
    label.style.transform = `translate(-50%,-50%) rotate(${flip ? mid + 180 : mid}deg)`;
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', bonuses[i].icon);
    const name = document.createElement('span');
    name.textContent = bonuses[i].name;
    label.append(icon, name);
    labelContainer.appendChild(label);
  }
  document.querySelector('.wheel-container').classList.toggle('wheel-container--dense', n >= 12);
  lucide.createIcons();
  repositionBulbs();
  updateSpinButton();
}

function initBulbs() {
  const container = document.getElementById('bulbContainer');
  bulbRadius = container.getBoundingClientRect().width / 2 + 2;
  for (let i = 0; i < NUM_BULBS; i++) {
    const bulb = document.createElement('div');
    bulb.className = 'wheel-bulb';
    bulb.style.transform = `rotate(${i/NUM_BULBS*360-90}deg) translateX(${bulbRadius}px)`;
    bulb.style.animationDelay = `${i*0.08}s`;
    container.appendChild(bulb);
    bulbElements.push(bulb);
  }
}

function repositionBulbs() {
  const container = document.getElementById('bulbContainer');
  if (!container) return;
  const newRadius = container.getBoundingClientRect().width / 2 + 2;
  if (newRadius === bulbRadius) return;
  bulbRadius = newRadius;
  bulbElements.forEach((bulb, i) => {
    bulb.style.transform = `rotate(${i/NUM_BULBS*360-90}deg) translateX(${bulbRadius}px)`;
  });
}

function spin() {
  if (isSpinning || bonuses.length < 2) return;
  isSpinning = true;
  const btn = document.getElementById('spinBtn');
  btn.disabled = true;
  btn.textContent = 'Вращаем…';
  const disc = document.getElementById('wheelDisc');
  const angle = Math.random() * 360;
  disc.style.transition = 'none';
  disc.style.transform = 'rotate(0deg)';
  void disc.offsetHeight;
  disc.style.transition = 'transform 5s cubic-bezier(0.16,1,0.3,1)';
  disc.style.transform = `rotate(${5*360+angle}deg)`;
  disc.dataset.rotation = 5*360+angle;
}

function onSpinEnd(e) {
  if (e.propertyName !== 'transform' || !isSpinning) return;
  const n = bonuses.length;
  if (n < 2) { isSpinning = false; updateSpinButton(); return }
  const total = parseFloat(e.target.dataset.rotation) || 0;
  const idx = Math.min(Math.floor(((360-(total%360))%360)/(360/n)), n-1);
  showResult(bonuses[idx]);
  isSpinning = false;
  updateSpinButton();
}

function showResult(b) {
  document.getElementById('resultIcon').setAttribute('data-lucide', b.icon);
  document.getElementById('resultName').textContent = b.name;
  lucide.createIcons();
  document.getElementById('resultOverlay').hidden = false;
  fireConfetti();
}
function hideResult() {
  document.getElementById('resultOverlay').hidden = true;
  stopConfetti();
}

function fireConfetti() {
  const canvas = document.getElementById('confettiCanvas');
  const ctx = canvas.getContext('2d');
  canvas.width = innerWidth;
  canvas.height = innerHeight;
  const particles = [];
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: Math.random()*canvas.width, y: -20-Math.random()*canvas.height*0.4,
      vx: (Math.random()-0.5)*8, vy: Math.random()*3+1.5,
      size: Math.random()*5+3,
      color: SECTOR_COLORS[Math.floor(Math.random()*SECTOR_COLORS.length)],
      rotation: Math.random()*360, rotSpeed: (Math.random()-0.5)*12, opacity: 1,
    });
  }
  function animate() {
    ctx.clearRect(0,0,canvas.width,canvas.height);
    let alive = false;
    for (const p of particles) {
      p.x += p.vx;
      p.vy += 0.15;
      p.y += p.vy;
      p.vx *= 0.99;
      p.rotation += p.rotSpeed;
      if (p.y > canvas.height+20) p.opacity -= 0.02;
      if (p.opacity <= 0) continue;
      alive = true;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation*Math.PI/180);
      ctx.globalAlpha = Math.max(0, p.opacity);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.size/2, -p.size/2, p.size, p.size*0.6);
      ctx.restore();
    }
    if (alive) confettiFrame = requestAnimationFrame(animate);
  }
  confettiFrame = requestAnimationFrame(animate);
}
function stopConfetti() {
  if (confettiFrame) { cancelAnimationFrame(confettiFrame); confettiFrame = null }
  const ctx = document.getElementById('confettiCanvas').getContext('2d');
  ctx.clearRect(0,0,ctx.canvas.width,ctx.canvas.height);
}

function renderList() {
  const list = document.getElementById('bonusList');
  const empty = document.getElementById('emptyState');
  list.innerHTML = '';
  if (!bonuses.length) { empty.hidden = false; updateSpinButton(); return }
  empty.hidden = true;
  for (const b of bonuses) {
    const item = document.createElement('div');
    item.className = 'bonus-item';
    const wrap = document.createElement('div');
    wrap.className = 'bonus-item-icon';
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', b.icon);
    wrap.appendChild(icon);
    const name = document.createElement('span');
    name.className = 'bonus-item-name';
    name.textContent = b.name;
    const actions = document.createElement('div');
    actions.className = 'bonus-item-actions';
    const ed = document.createElement('button');
    ed.className = 'bonus-item-btn';
    ed.setAttribute('aria-label', 'Редактировать');
    ed.innerHTML = '<i data-lucide="pencil" width="14" height="14"></i>';
    ed.addEventListener('click', () => openModal(b.id));
    const del = document.createElement('button');
    del.className = 'bonus-item-btn bonus-item-btn--danger';
    del.setAttribute('aria-label', 'Удалить');
    del.innerHTML = '<i data-lucide="trash-2" width="14" height="14"></i>';
    del.addEventListener('click', () => deleteBonus(b.id));
    actions.append(ed, del);
    item.append(wrap, name, actions);
    list.appendChild(item);
  }
  lucide.createIcons();
  updateSpinButton();
}

function saveBonus(id, name, icon) {
  if (isSpinning) return;
  const trimmed = name.trim();
  if (id) {
    const idx = bonuses.findIndex(b => b.id === id);
    if (idx === -1) return;
    bonuses[idx] = {...bonuses[idx], name: trimmed, icon};
  } else {
    bonuses.push({id: Date.now().toString(36)+Math.random().toString(36).slice(2,6), name: trimmed, icon});
  }
  save();
  renderWheel();
  renderList();
}

function addBonus(name, icon) { saveBonus(null, name, icon) }
function editBonus(id, name, icon) { saveBonus(id, name, icon) }

function deleteBonus(id) {
  if (isSpinning) return;
  document.getElementById('confirmOverlay').hidden = false;
  document.getElementById('confirmOverlay').dataset.bonusId = id;
}

function confirmDelete() {
  const id = document.getElementById('confirmOverlay').dataset.bonusId;
  if (!id) return;
  bonuses = bonuses.filter(b => b.id !== id);
  save();
  renderWheel();
  renderList();
  closeConfirm();
}

function closeConfirm() {
  document.getElementById('confirmOverlay').hidden = true;
}

function updateSpinButton() {
  const btn = document.getElementById('spinBtn');
  btn.disabled = bonuses.length < 2 || isSpinning;
  btn.textContent = bonuses.length < 2 ? 'Нужно минимум 2 бонуса' : isSpinning ? 'Вращаем…' : 'Крутить';
}

function openModal(id) {
  if (isSpinning) return;
  editingId = id ?? null;
  selectedIcon = null;
  const title = document.getElementById('modalTitle');
  const input = document.getElementById('modalName');
  if (editingId) {
    const b = bonuses.find(x => x.id === editingId);
    if (!b) return;
    title.textContent = 'Редактировать бонус';
    input.value = b.name;
    selectedIcon = b.icon;
  } else {
    title.textContent = 'Добавить бонус';
    input.value = '';
    selectedIcon = ICONS[0];
  }
  renderIconGrid();
  prevFocus = document.activeElement;
  document.getElementById('modalOverlay').hidden = false;
  input.focus();
  input.setSelectionRange(input.value.length, input.value.length);
  updateSaveButton();
}
function closeModal() {
  document.getElementById('modalOverlay').hidden = true;
  if (prevFocus && prevFocus.focus) prevFocus.focus();
  prevFocus = null;
  editingId = null;
  selectedIcon = null;
}

function renderIconGrid() {
  const grid = document.getElementById('iconGrid');
  grid.innerHTML = ICONS.map(n =>
    `<button class="icon-option${n===selectedIcon?' icon-option--selected':''}" data-icon="${n}" aria-label="${n}"><i data-lucide="${n}"></i></button>`
  ).join('');
  grid.onclick = e => {
    const btn = e.target.closest('.icon-option');
    if (!btn) return;
    grid.querySelector('.icon-option--selected')?.classList.remove('icon-option--selected');
    btn.classList.add('icon-option--selected');
    selectedIcon = btn.dataset.icon;
    updateSaveButton();
  };
  lucide.createIcons();
}

function updateSaveButton() {
  document.getElementById('modalSave').disabled = !document.getElementById('modalName').value.trim() || !selectedIcon;
}
function saveFromModal() {
  const name = document.getElementById('modalName').value.trim();
  if (!name || !selectedIcon) return;
  saveBonus(editingId, name, selectedIcon);
  closeModal();
}

window.addEventListener('error', function(e) {
  if (e.target.tagName === 'SCRIPT' && e.target.src && e.target.src.includes('lucide')) {
    console.warn('lucide CDN failed to load. Icons will not be displayed.');
    document.querySelectorAll('[data-lucide]').forEach(el => {
      el.style.display = 'none';
    });
  }
}, true);

document.addEventListener('DOMContentLoaded', () => {
  loadBonuses();
  initBulbs();
  renderWheel();
  renderList();

  document.getElementById('spinBtn').addEventListener('click', spin);
  document.getElementById('wheelDisc').addEventListener('transitionend', onSpinEnd);
  document.getElementById('closeResult').addEventListener('click', hideResult);
  document.getElementById('spinAgain').addEventListener('click', () => { hideResult(); spin() });
  document.getElementById('resultOverlay').addEventListener('click', function(e) { if (e.target===this) hideResult() });
  document.getElementById('addBtn').addEventListener('click', () => openModal(null));
  document.getElementById('modalClose').addEventListener('click', closeModal);
  document.getElementById('modalCancel').addEventListener('click', closeModal);
  document.getElementById('modalSave').addEventListener('click', saveFromModal);
  document.getElementById('modalName').addEventListener('keydown', e => { if (e.key==='Enter') saveFromModal() });
  document.getElementById('modalName').addEventListener('input', updateSaveButton);
  document.getElementById('modalOverlay').addEventListener('click', function(e) { if (e.target===this) closeModal() });
  document.getElementById('confirmYes').addEventListener('click', confirmDelete);
  document.getElementById('confirmNo').addEventListener('click', closeConfirm);
  document.getElementById('confirmOverlay').addEventListener('click', function(e) { if (e.target === this) closeConfirm() });
  let resizeTimeout;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeTimeout);
    resizeTimeout = requestAnimationFrame(() => {
      if (!document.getElementById('resultOverlay').hidden) { stopConfetti(); fireConfetti() }
      if (!isSpinning) { renderWheel(); renderList() }
    });
  });
});
