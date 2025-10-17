
// ============ App Shell (Tabs) ============
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const $ = (id) => document.getElementById(id);

function setActiveTab(tab) {
  $$('.nav-link').forEach(a => a.classList.toggle('active', a.dataset.tab === tab));
  $$('.tab').forEach(s => s.classList.toggle('active', s.id === tab));
}
$$('.nav-link').forEach(a => a.addEventListener('click', (e) => {
  e.preventDefault();
  const tab = a.dataset.tab;
  history.replaceState(null, '', `#${tab}`);
  setActiveTab(tab);
}));
window.addEventListener('load', () => {
  const hash = (location.hash || '#calc').slice(1);
  setActiveTab(hash);
});

// ============ Firebase Config (PASTE YOURS) ============
// 1) Điền cấu hình dự án Firebase của bạn vào đây:
const firebaseConfig = {
  apiKey: "AIzaSyDF4YK414BcnwNbxOxFXUMrJIlj6Kwsr6Q",
  authDomain: "ancombayoi.firebaseapp.com",
  projectId: "ancombayoi",
  storageBucket: "ancombayoi.firebasestorage.app",
  messagingSenderId: "902949856979",
  appId: "1:902949856979:web:b39c718a90fe97cfb0d626",
  measurementId: "G-QHDXHG5WV8"
};

// 2) SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, setDoc, query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

// 3) Firebase init
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const lunchesCol = collection(db, 'lunches');
const rosterDoc = doc(db, 'meta', 'roster');

// Utils
const VND = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 });
const fmt = (n) => VND.format(Math.round(Number(n||0)));
const todayISO = () => new Date().toISOString().slice(0,10);
const uniqueId = () => Math.random().toString(36).slice(2);

// DOM (calc)
const dateInput = $("dateInput");
const collectorInput = $("collectorInput");
const totalInput = $("totalInput");
const rosterChecklist = $("rosterChecklist");
const quickAddName = $("quickAddName");
const addQuickBtn = $("addQuickBtn");
const quickNamesWrap = $("quickNamesWrap");
const prepareBtn = $("prepareBtn");
const clearBtn = $("clearBtn");
const preview = $("preview");
const numPeopleOut = $("numPeopleOut");
const perPersonOut = $("perPersonOut");
const participantsEditor = $("participantsEditor");
const saveBtn = $("saveBtn");
const cancelEditBtn = $("cancelEditBtn");
const editBadge = $("editBadge");
const formTitle = $("formTitle");
const filterName = $("filterName");
const filterFrom = $("filterFrom");
const filterTo = $("filterTo");
const applyFilterBtn = $("applyFilterBtn");
const resetFilterBtn = $("resetFilterBtn");
const totalTrips = $("totalTrips");
const totalAmount = $("totalAmount");
const historyBody = $("historyBody");
// Settings
const settingsList = $("settingsList");
const newNameInput = $("newNameInput");
const addNameBtn = $("addNameBtn");
const saveSettingsBtn = $("saveSettingsBtn");
const resetDefaultBtn = $("resetDefaultBtn");
// Wheel
const wheelChecklist = $("wheelChecklist");
const spinBtn = $("spinBtn");
const resetWheelBtn = $("resetWheelBtn");
const wheelDisk = $("wheelDisk");
const winnerEl = $("winner");

let editingDocId = null;
let currentParticipants = [];
let roster = [];
let quickNames = [];
const DEFAULT_ROSTER = ['A','B','C','D','E','F','G','H','I'];

dateInput.value = todayISO();

// Roster helpers
async function ensureRoster() {
  const snap = await getDoc(rosterDoc);
  if (!snap.exists()) {
    await setDoc(rosterDoc, { names: DEFAULT_ROSTER, updatedAt: serverTimestamp() });
    return DEFAULT_ROSTER;
  }
  const data = snap.data();
  return Array.isArray(data.names) ? data.names : DEFAULT_ROSTER;
}
function renderRosterChecklist() {
  rosterChecklist.innerHTML = '';
  roster.forEach((name, idx) => {
    const id = `ro_${idx}`;
    const item = document.createElement('label');
    item.className = 'check-item';
    item.innerHTML = `<input type="checkbox" id="${id}" data-name="${name}"><span>${name}</span>`;
    rosterChecklist.appendChild(item);
  });
  // wheel checklist same roster
  renderWheelChecklist();
}
function renderSettingsList() {
  settingsList.innerHTML = '';
  roster.forEach((name, idx) => {
    const row = document.createElement('div');
    row.className = 'participant-row';
    row.innerHTML = `<input type="text" value="${name}" data-idx="${idx}" class="set-name" />
                     <button class="btn ghost" data-del="${idx}">X</button>`;
    settingsList.appendChild(row);
  });
  settingsList.querySelectorAll('.set-name').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = Number(e.target.getAttribute('data-idx'));
      roster[i] = e.target.value;
      renderWheelChecklist(); // reflect live
    });
  });
  settingsList.querySelectorAll('[data-del]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-del'));
      roster.splice(i,1);
      renderSettingsList();
      renderRosterChecklist();
    });
  });
}
addNameBtn.addEventListener('click', () => {
  const v = (newNameInput.value||'').trim();
  if (!v) return;
  roster.push(v);
  newNameInput.value = '';
  renderSettingsList();
  renderRosterChecklist();
});
resetDefaultBtn.addEventListener('click', async () => {
  if (!confirm('Khôi phục danh sách mặc định A→I?')) return;
  roster = [...DEFAULT_ROSTER];
  renderSettingsList();
  renderRosterChecklist();
});
saveSettingsBtn.addEventListener('click', async () => {
  const clean = roster.map(n => (n||'').trim()).filter(Boolean);
  await setDoc(rosterDoc, { names: clean, updatedAt: serverTimestamp() });
  roster = clean;
  renderSettingsList();
  renderRosterChecklist();
  alert('Đã lưu danh sách.');
});

// Quick names
addQuickBtn.addEventListener('click', () => {
  const v = (quickAddName.value||'').trim();
  if (!v) return;
  quickNames.push(v);
  quickAddName.value = '';
  renderQuickNames();
});
function renderQuickNames() {
  quickNamesWrap.innerHTML = '';
  quickNames.forEach((n, i) => {
    const row = document.createElement('div');
    row.className = 'participant-row';
    row.innerHTML = `<span>${n}</span> <button class="btn ghost" data-qdel="${i}">X</button>`;
    quickNamesWrap.appendChild(row);
  });
  quickNamesWrap.querySelectorAll('[data-qdel]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = Number(btn.getAttribute('data-qdel'));
      quickNames.splice(i,1);
      renderQuickNames();
    });
  });
}

// Participants (calc)
function buildParticipantsArray(names) {
  return names.map(name => ({ id: uniqueId(), name, paid: false }));
}
function calcPerPerson(total, participants) {
  const n = Math.max(1, participants.length);
  return Number(total||0) / n;
}
function renderParticipantsEditor() {
  participantsEditor.innerHTML = '';
  currentParticipants.forEach((p, idx) => {
    const row = document.createElement('div');
    row.className = 'participant-row';
    row.innerHTML = `
      <input type="checkbox" ${p.paid ? 'checked' : ''} data-idx="${idx}" class="paid-toggle" title="Đánh dấu đã trả" />
      <input type="text" value="${p.name}" data-idx="${idx}" class="name-edit" />
      <button class="btn ghost" data-idx="${idx}" title="Xóa" aria-label="Xóa người">X</button>
    `;
    participantsEditor.appendChild(row);
  });
  participantsEditor.querySelectorAll('.paid-toggle').forEach(cb => {
    cb.addEventListener('change', e => {
      const i = Number(e.target.getAttribute('data-idx'));
      currentParticipants[i].paid = e.target.checked;
    });
  });
  participantsEditor.querySelectorAll('.name-edit').forEach(inp => {
    inp.addEventListener('input', e => {
      const i = Number(e.target.getAttribute('data-idx'));
      currentParticipants[i].name = e.target.value;
    });
  });
  participantsEditor.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', e => {
      const i = Number(e.target.getAttribute('data-idx'));
      currentParticipants.splice(i,1);
      refreshPreviewTotals();
      renderParticipantsEditor();
    });
  });
}
function refreshPreviewTotals() {
  const per = calcPerPerson(totalInput.value, currentParticipants);
  numPeopleOut.textContent = currentParticipants.length;
  perPersonOut.textContent = fmt(per);
}
function setFormModeEditing(isEditing) {
  editBadge.classList.toggle('hidden', !isEditing);
  formTitle.textContent = isEditing ? 'Chỉnh sửa lần đi lấy' : 'Tạo lần đi lấy mới';
  cancelEditBtn.classList.toggle('hidden', !isEditing);
}

// Prepare
$("prepareBtn").addEventListener('click', () => {
  const checked = Array.from(rosterChecklist.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.getAttribute('data-name'));
  const names = [...checked, ...quickNames];
  if (names.length === 0) { alert('Chọn ít nhất 1 người ăn.'); return; }
  if (!totalInput.value || Number(totalInput.value) <= 0) { alert('Nhập tổng tiền hợp lệ.'); return; }
  if (!dateInput.value) { alert('Chọn ngày.'); return; }

  const next = buildParticipantsArray(names);
  if (editingDocId && currentParticipants.length) {
    next.forEach((n, i) => { if (currentParticipants[i]) n.paid = currentParticipants[i].paid; });
  }
  currentParticipants = next;
  renderParticipantsEditor();
  refreshPreviewTotals();
  preview.classList.remove('hidden');
});
clearBtn.addEventListener('click', () => {
  dateInput.value = todayISO();
  collectorInput.value = '';
  totalInput.value = '';
  quickNames = [];
  renderQuickNames();
  rosterChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  currentParticipants = [];
  preview.classList.add('hidden');
  setFormModeEditing(false);
  editingDocId = null;
});
cancelEditBtn.addEventListener('click', () => { clearBtn.click(); });

// Save to Firestore
async function saveLunch() {
  const date = dateInput.value;
  const collector = (collectorInput.value||'').trim();
  const total = Number(totalInput.value||0);
  const participants = currentParticipants.map(p => ({ id: p.id||uniqueId(), name: (p.name||'').trim(), paid: !!p.paid }));
  const perPerson = calcPerPerson(total, participants);
  if (!date || !collector || !total || participants.length === 0) { alert('Vui lòng điền đầy đủ.'); return; }
  const payload = { date, collector, total, numPeople: participants.length, perPerson, participants, updatedAt: serverTimestamp() };
  try {
    if (editingDocId) {
      await updateDoc(doc(db, 'lunches', editingDocId), payload);
    } else {
      await addDoc(lunchesCol, { ...payload, createdAt: serverTimestamp() });
    }
    clearBtn.click();
    await loadHistory();
    alert('Đã lưu.');
  } catch (err) { console.error(err); alert('Lỗi lưu Firestore. Kiểm tra cấu hình và rules.'); }
}
saveBtn.addEventListener('click', saveLunch);

// History
function renderHistory(rows) {
  historyBody.innerHTML = '';
  let sum = 0;
  rows.forEach(({ id, data }) => {
    sum += Number(data.total||0);
    const paidCount = (data.participants||[]).filter(p => p.paid).length;
    const tr = document.createElement('tr');
    const peopleList = (data.participants||[]).map((p, idx) => `
      <label class="participant-row" style="gap:6px">
        <input type="checkbox" ${p.paid ? 'checked' : ''} data-doc="${id}" data-idx="${idx}" class="history-paid" />
        <span>${p.name}</span>
      </label>`).join('');
    tr.innerHTML = `
      <td class="mono">${data.date}</td>
      <td>${data.collector}</td>
      <td class="right mono">${fmt(data.total)}</td>
      <td class="right mono">${data.numPeople}</td>
      <td class="right mono">${fmt(data.perPerson)}</td>
      <td>${peopleList}<div class="muted" style="margin-top:6px">Đã trả: ${paidCount}/${data.numPeople}</div></td>
      <td>
        <div class="btns">
          <button class="btn secondary" data-edit="${id}">Sửa</button>
          <button class="btn danger" data-del="${id}">Xóa</button>
        </div>
      </td>`;
    historyBody.appendChild(tr);
  });
  $("totalTrips").textContent = rows.length;
  $("totalAmount").textContent = fmt(sum);

  $$('.history-paid').forEach(cb => {
    cb.addEventListener('change', async (e) => {
      const docId = e.target.getAttribute('data-doc');
      const idx = Number(e.target.getAttribute('data-idx'));
      try {
        const all = await getDocs(query(lunchesCol));
        let targetRef = null; let targetData = null;
        all.forEach(d => { if (d.id === docId) { targetRef = d.ref; targetData = d.data(); } });
        if (!targetRef) return;
        targetData.participants[idx].paid = e.target.checked;
        await updateDoc(targetRef, { participants: targetData.participants, updatedAt: serverTimestamp() });
        await loadHistory(false);
      } catch (err) { console.error(err); alert('Không cập nhật được checkbox.'); }
    });
  });
  $$('[data-edit]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-edit');
      const all = await getDocs(query(lunchesCol));
      let target = null; let targetId = null;
      all.forEach(d => { if (d.id === id) { target = d.data(); targetId = d.id; } });
      if (!target) return;
      dateInput.value = target.date;
      collectorInput.value = target.collector;
      totalInput.value = target.total;
      rosterChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
      quickNames = [];
      renderQuickNames();
      currentParticipants = (target.participants||[]).map(p => ({ id: p.id||uniqueId(), name: p.name, paid: !!p.paid }));
      setFormModeEditing(true);
      editingDocId = targetId;
      renderParticipantsEditor();
      refreshPreviewTotals();
      preview.classList.remove('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
  $$('[data-del]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.getAttribute('data-del');
      if (!confirm('Xóa bản ghi này?')) return;
      try { await deleteDoc(doc(db, 'lunches', id)); await loadHistory(); }
      catch (err) { console.error(err); alert('Xóa thất bại.'); }
    });
  });
}
async function loadHistory(showAlertOnEmpty = true) {
  try {
    const snap = await getDocs(query(lunchesCol, orderBy('date', 'desc')));
    let rows = snap.docs.map(d => ({ id: d.id, data: d.data() }));
    const nameKey = (filterName.value||'').trim().toLowerCase();
    const from = filterFrom.value; const to = filterTo.value;
    if (nameKey) rows = rows.filter(r => (r.data.participants||[]).some(p => (p.name||'').toLowerCase().includes(nameKey)) );
    if (from) rows = rows.filter(r => r.data.date >= from);
    if (to) rows = rows.filter(r => r.data.date <= to);
    renderHistory(rows);
  } catch (err) { console.error(err); alert('Không tải được lịch sử.'); }
}
applyFilterBtn.addEventListener('click', () => loadHistory());
resetFilterBtn.addEventListener('click', () => { filterName.value=''; filterFrom.value=''; filterTo.value=''; loadHistory(); });

// ======== Wheel ========
function renderWheelChecklist() {
  wheelChecklist.innerHTML = '';
  roster.forEach((name, idx) => {
    const id = `wh_${idx}`;
    const item = document.createElement('label');
    item.className = 'check-item';
    item.innerHTML = `<input type="checkbox" id="${id}" data-name="${name}" checked><span>${name}</span>`;
    wheelChecklist.appendChild(item);
  });
}
resetWheelBtn.addEventListener('click', () => {
  wheelChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  winnerEl.textContent = 'Người trúng: —';
  wheelDisk.style.transform = 'rotate(0deg)';
});

spinBtn.addEventListener('click', () => {
  const pool = Array.from(wheelChecklist.querySelectorAll('input[type="checkbox"]:checked')).map(cb => cb.getAttribute('data-name')).filter(Boolean);
  if (pool.length < 2) { alert('Chọn ít nhất 2 người để quay.'); return; }
  // simple spin animation
  const spins = 5 + Math.floor(Math.random()*3);
  const winnerIndex = Math.floor(Math.random()*pool.length);
  const degPer = 360 / pool.length;
  const stopDeg = 360 - winnerIndex * degPer + 2*degPer/3; // offset for pointer
  const totalDeg = spins*360 + stopDeg;
  wheelDisk.style.transform = `rotate(${totalDeg}deg)`;
  // update text after animation
  setTimeout(() => {
    winnerEl.textContent = `Người trúng: ${pool[winnerIndex]} 🎉`;
  }, 3000);
});

// Init
(async function init(){
  dateInput.value = todayISO();
  roster = await ensureRoster();
  renderRosterChecklist();
  renderSettingsList();
  await loadHistory();
})();
