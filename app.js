// ===== Tabs =====
const $$ = (s, r=document)=>Array.from(r.querySelectorAll(s));
const $  = id=>document.getElementById(id);

function setActiveTab(tab){
  $$('.nav-link').forEach(a=>a.classList.toggle('active', a.dataset.tab===tab));
  $$('.tab').forEach(s=>s.classList.toggle('active', s.id===tab));
}
$$('.nav-link').forEach(a=>a.addEventListener('click',e=>{
  e.preventDefault(); const tab=a.dataset.tab;
  history.replaceState(null,'',`#${tab}`); setActiveTab(tab);
}));
window.addEventListener('load',()=>setActiveTab((location.hash||'#calc').slice(1)));

// ===== Firebase (dán config của bạn vào đây) =====
const firebaseConfig = {
apiKey: "AIzaSyDF4YK414BcnwNbxOxFXUMrJIlj6Kwsr6Q",
authDomain: "ancombayoi.firebaseapp.com",
projectId: "ancombayoi",
storageBucket: "ancombayoi.firebasestorage.app",
messagingSenderId: "902949856979",
appId: "1:902949856979:web:b39c718a90fe97cfb0d626",
measurementId: "G-QHDXHG5WV8"
}
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.3/firebase-app.js";
import {
  getFirestore, collection, addDoc, getDocs, getDoc, setDoc,
  query, orderBy, serverTimestamp, doc, updateDoc, deleteDoc
} from "https://www.gstatic.com/firebasejs/10.12.3/firebase-firestore.js";

const app = initializeApp(firebaseConfig);
const db  = getFirestore(app);
const lunchesCol = collection(db,'lunches');
const rosterDoc  = doc(db,'meta','roster');

// ===== Utils =====
const VND = new Intl.NumberFormat('vi-VN',{style:'currency',currency:'VND',maximumFractionDigits:0});
const fmt = n => VND.format(Math.round(Number(n||0)));
const todayISO = ()=>new Date().toISOString().slice(0,10);
const uniqueId = ()=>Math.random().toString(36).slice(2);

// ===== DOM =====
const dateInput=$("dateInput"), collectorInput=$("collectorInput"), totalInput=$("totalInput");
const rosterChecklist=$("rosterChecklist"), quickAddName=$("quickAddName"), addQuickBtn=$("addQuickBtn");
const quickNamesWrap=$("quickNamesWrap"), prepareBtn=$("prepareBtn"), clearBtn=$("clearBtn");
const preview=$("preview"), numPeopleOut=$("numPeopleOut"), perPersonOut=$("perPersonOut");
const participantsEditor=$("participantsEditor"), saveBtn=$("saveBtn"), cancelEditBtn=$("cancelEditBtn");
const editBadge=$("editBadge"), formTitle=$("formTitle");

const historyBody=$("historyBody"), totalTrips=$("totalTrips"), totalAmount=$("totalAmount");
// Dom wheel
['winner','winnerOverlay','winnerName','wheelSpinner','wheelCanvas'].forEach(id=>{
  if(!$(`${id}`)) console.error('Missing DOM element:', id);
});
  
// Overlay filter
const appRoot=$("appRoot"), openFilterBtn=$("openFilterBtn"), filterOverlay=$("filterOverlay");
const closeFilterBtn=$("closeFilterBtn"), filterName=$("filterName"), filterFrom=$("filterFrom"), filterTo=$("filterTo");
const applyFilterBtn=$("applyFilterBtn"), resetFilterBtn=$("resetFilterBtn");

// Settings
const settingsList=$("settingsList"), newNameInput=$("newNameInput"), addNameBtn=$("addNameBtn");
const saveSettingsBtn=$("saveSettingsBtn"), resetDefaultBtn=$("resetDefaultBtn");

// Wheel
// Wheel
const spinsTbody = $("spinsTbody");
const wheelChecklist=$("wheelChecklist");
const spinBtn = $("spinBtn");
const resetWheelBtn = $("resetWheelBtn");
const wheelSpinner = $("wheelSpinner");   // <— đổi: lấy wrapper mới
const wheelCanvas  = $("wheelCanvas");
const winnerEl     = $("winner");

// Popup winner
const winnerOverlay = $("winnerOverlay");
const winnerNameEl  = $("winnerName");
const closeWinnerBtn= $("closeWinnerBtn");
//Wheel
function getWheelPool(){
  return Array
    .from(wheelChecklist.querySelectorAll('input[type="checkbox"]:checked'))
    .map(cb => cb.getAttribute('data-name'))
    .filter(Boolean);
}

// Vẽ bánh xe: chia đều theo pool
function drawWheel(names){
  const ctx = wheelCanvas.getContext('2d');
  const W = wheelCanvas.width, H = wheelCanvas.height;
  const cx = W/2, cy = H/2, r = Math.min(cx, cy);
  ctx.clearRect(0,0,W,H);

  if (!names.length){
    // khung mặc định
    ctx.beginPath(); ctx.arc(cx,cy,r-3,0,Math.PI*2);
    ctx.fillStyle = '#f3f7f9'; ctx.fill();
    ctx.strokeStyle = '#d9e5ea'; ctx.lineWidth = 6; ctx.stroke();
    return;
  }

  const n = names.length;
  const slice = 2*Math.PI / n;
  for (let i=0;i<n;i++){
    const start = i*slice, end = start + slice;

    // màu lát: HSL theo index để đa dạng
    const hue = Math.round(360*(i/n));
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r-3,start,end);
    ctx.closePath();
    ctx.fillStyle = `hsl(${hue}deg 70% 90%)`;
    ctx.fill();
    ctx.strokeStyle = '#d9e5ea';
    ctx.lineWidth = 2;
    ctx.stroke();

    // chữ tên
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(start + slice/2);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#102a43';
    ctx.font = '14px system-ui';
    ctx.fillText(names[i], (r*0.62), 5);
    ctx.restore();
  }

  // viền ngoài
  ctx.beginPath();
  ctx.arc(cx,cy,r-3,0,Math.PI*2);
  ctx.lineWidth = 6;
  ctx.strokeStyle = '#d9e5ea';
  ctx.stroke();
}

// const wheelDisk=$("wheelDisk"), winnerEl=$("winner");

// ===== State =====
let editingDocId=null, currentParticipants=[], roster=[], quickNames=[];
const DEFAULT_ROSTER=['A','B','C','D','E','F','G','H','I'];
dateInput.value=todayISO();

// ===== Roster =====
async function ensureRoster(){
  const snap=await getDoc(rosterDoc);
  if(!snap.exists()){ await setDoc(rosterDoc,{names:DEFAULT_ROSTER,updatedAt:serverTimestamp()}); return DEFAULT_ROSTER; }
  const data=snap.data(); return Array.isArray(data.names)?data.names:DEFAULT_ROSTER
};

function renderSettingsList(){
  settingsList.innerHTML='';
  roster.forEach((name,idx)=>{
    const row=document.createElement('div');
    row.className='participant-row';
    row.innerHTML=`<input type="text" value="${name}" data-idx="${idx}" class="set-name" />
                   <button class="btn ghost" data-del="${idx}">X</button>`;
    settingsList.appendChild(row);
  });
  settingsList.querySelectorAll('.set-name').forEach(inp=>{
    inp.addEventListener('input',e=>{
      const i=Number(e.target.getAttribute('data-idx')); roster[i]=e.target.value; renderWheelChecklist();
    });
  });
  settingsList.querySelectorAll('[data-del]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      const i=Number(btn.getAttribute('data-del')); roster.splice(i,1);
      renderSettingsList(); renderRosterChecklist();
    });
  });
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

  // Đồng bộ checklist của tab "Vòng quay"
  if (typeof renderWheelChecklist === 'function') {
    renderWheelChecklist();
  }
}
addNameBtn.addEventListener('click',()=>{
  const v=(newNameInput.value||'').trim(); if(!v) return;
  roster.push(v); newNameInput.value='';
  renderSettingsList(); renderRosterChecklist();
});
resetDefaultBtn.addEventListener('click',()=>{
  if(!confirm('Khôi phục danh sách mặc định A→I?')) return;
  roster=[...DEFAULT_ROSTER];
  renderSettingsList(); renderRosterChecklist();
});
saveSettingsBtn.addEventListener('click',async()=>{
  const clean=roster.map(n=>(n||'').trim()).filter(Boolean);
  await setDoc(rosterDoc,{names:clean,updatedAt:serverTimestamp()});
  roster=clean;
  renderSettingsList(); renderRosterChecklist();
  alert('Đã lưu danh sách.');
});

// ===== Quick names =====
addQuickBtn.addEventListener('click',()=>{
  const v=(quickAddName.value||'').trim(); if(!v) return;
  quickNames.push(v); quickAddName.value=''; renderQuickNames();
});
function renderQuickNames(){
  quickNamesWrap.innerHTML='';
  quickNames.forEach((n,i)=>{
    const row=document.createElement('div'); row.className='participant-row';
    row.innerHTML=`<span>${n}</span> <button class="btn ghost" data-qdel="${i}">X</button>`;
    quickNamesWrap.appendChild(row);
  });
  $$('#quickNamesWrap [data-qdel]').forEach(btn=>{
    btn.addEventListener('click',()=>{ const i=Number(btn.getAttribute('data-qdel')); quickNames.splice(i,1); renderQuickNames(); });
  });
}

// ===== Participants calc =====
function buildParticipantsArray(names){ return names.map(name=>({id:uniqueId(),name,paid:false})); }
function calcPerPerson(total,ps){ const n=Math.max(1,ps.length); return Number(total||0)/n; }
function renderParticipantsEditor(){
  participantsEditor.innerHTML='';
  currentParticipants.forEach((p,idx)=>{
    const row=document.createElement('div'); row.className='participant-row';
    row.innerHTML=`
      <input type="checkbox" ${p.paid?'checked':''} data-idx="${idx}" class="paid-toggle" title="Đánh dấu đã trả" />
      <input type="text" value="${p.name}" data-idx="${idx}" class="name-edit" />
      <button class="btn ghost" data-idx="${idx}" title="Xóa">X</button>`;
    participantsEditor.appendChild(row);
  });
  $$('#participantsEditor .paid-toggle').forEach(cb=>{
    cb.addEventListener('change',e=>{ const i=Number(e.target.getAttribute('data-idx')); currentParticipants[i].paid=e.target.checked; });
  });
  $$('#participantsEditor .name-edit').forEach(inp=>{
    inp.addEventListener('input',e=>{ const i=Number(e.target.getAttribute('data-idx')); currentParticipants[i].name=e.target.value; });
  });
  $$('#participantsEditor button').forEach(btn=>{
    btn.addEventListener('click',e=>{ const i=Number(btn.getAttribute('data-idx')); currentParticipants.splice(i,1); refreshPreviewTotals(); renderParticipantsEditor(); });
  });
}
function refreshPreviewTotals(){ const per=calcPerPerson(totalInput.value,currentParticipants); numPeopleOut.textContent=currentParticipants.length; perPersonOut.textContent=fmt(per); }
function setFormModeEditing(b){ editBadge.classList.toggle('hidden',!b); formTitle.textContent=b?'Chỉnh sửa lần đi lấy':'Tạo lần đi lấy mới'; cancelEditBtn.classList.toggle('hidden',!b); }

$("prepareBtn").addEventListener('click',()=>{
  const checked=Array.from(rosterChecklist.querySelectorAll('input[type="checkbox"]:checked')).map(cb=>cb.getAttribute('data-name'));
  const names=[...checked,...quickNames];
  if(names.length===0){ alert('Chọn ít nhất 1 người ăn.'); return; }
  if(!totalInput.value || Number(totalInput.value)<=0){ alert('Nhập tổng tiền hợp lệ.'); return; }
  if(!dateInput.value){ alert('Chọn ngày.'); return; }

  const next=buildParticipantsArray(names);
  if(editingDocId && currentParticipants.length){ next.forEach((n,i)=>{ if(currentParticipants[i]) n.paid=currentParticipants[i].paid; }); }
  currentParticipants=next; renderParticipantsEditor(); refreshPreviewTotals(); preview.classList.remove('hidden');
});
clearBtn.addEventListener('click',()=>{
  dateInput.value=todayISO(); collectorInput.value=''; totalInput.value='';
  quickNames=[]; renderQuickNames(); rosterChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
  currentParticipants=[]; preview.classList.add('hidden'); setFormModeEditing(false); editingDocId=null;
});
cancelEditBtn.addEventListener('click',()=>clearBtn.click());

// Save to Firestore
async function saveLunch(){
  const date=dateInput.value, collector=(collectorInput.value||'').trim(), total=Number(totalInput.value||0);
  const participants=currentParticipants.map(p=>({id:p.id||uniqueId(),name:(p.name||'').trim(),paid:!!p.paid}));
  const perPerson=calcPerPerson(total,participants);
  if(!date || !collector || !total || participants.length===0){ alert('Vui lòng điền đầy đủ.'); return; }
  const payload={date,collector,total,numPeople:participants.length,perPerson,participants,updatedAt:serverTimestamp()};
  try{
    if(editingDocId){ await updateDoc(doc(db,'lunches',editingDocId),payload); }
    else{ await addDoc(lunchesCol,{...payload,createdAt:serverTimestamp()}); }
    clearBtn.click(); await loadHistory(); alert('Đã lưu.');
  }catch(err){ console.error(err); alert('Lỗi lưu Firestore.'); }
}
saveBtn.addEventListener('click',saveLunch);

// ===== History + Filter overlay =====
function renderHistory(rows){
  historyBody.innerHTML=''; let sum=0;
  rows.forEach(({id,data})=>{
    sum+=Number(data.total||0);
    const paidCount=(data.participants||[]).filter(p=>p.paid).length;
    const tr=document.createElement('tr');
    const peopleList=(data.participants||[]).map((p,idx)=>`
      <label class="participant-row" style="gap:6px">
        <input type="checkbox" ${p.paid?'checked':''} data-doc="${id}" data-idx="${idx}" class="history-paid" />
        <span>${p.name}</span>
      </label>`).join('');
    tr.innerHTML=`
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
  totalTrips.textContent=rows.length; totalAmount.textContent=fmt(sum);

  $$('.history-paid').forEach(cb=>{
    cb.addEventListener('change',async e=>{
      const docId=e.target.getAttribute('data-doc'); const idx=Number(e.target.getAttribute('data-idx'));
      try{
        const all=await getDocs(query(lunchesCol));
        let targetRef=null,targetData=null;
        all.forEach(d=>{ if(d.id===docId){ targetRef=d.ref; targetData=d.data(); } });
        if(!targetRef) return;
        targetData.participants[idx].paid=e.target.checked;
        await updateDoc(targetRef,{participants:targetData.participants,updatedAt:serverTimestamp()});
        await loadHistory(false);
      }catch(err){ console.error(err); alert('Không cập nhật được checkbox.'); }
    });
  });
  $$('[data-edit]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const id=btn.getAttribute('data-edit');
      const all=await getDocs(query(lunchesCol)); let target=null,targetId=null;
      all.forEach(d=>{ if(d.id===id){ target=d.data(); targetId=d.id; } });
      if(!target) return;
      dateInput.value=target.date; collectorInput.value=target.collector; totalInput.value=target.total;
      rosterChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb=>cb.checked=false);
      quickNames=[]; renderQuickNames();
      currentParticipants=(target.participants||[]).map(p=>({id:p.id||uniqueId(),name:p.name,paid:!!p.paid}));
      setFormModeEditing(true); editingDocId=targetId; renderParticipantsEditor(); refreshPreviewTotals(); preview.classList.remove('hidden');
      window.scrollTo({top:0,behavior:'smooth'});
    });
  });
  $$('[data-del]').forEach(btn=>{
    btn.addEventListener('click',async()=>{
      const id=btn.getAttribute('data-del'); if(!confirm('Xóa bản ghi này?')) return;
      try{ await deleteDoc(doc(db,'lunches',id)); await loadHistory(); }catch(err){ console.error(err); alert('Xóa thất bại.'); }
    });
  });
}

async function loadHistory(){
  try{
    const snap=await getDocs(query(lunchesCol,orderBy('date','desc')));
    let rows=snap.docs.map(d=>({id:d.id,data:d.data()}));
    const nameKey=(filterName.value||'').trim().toLowerCase();
    const from=filterFrom.value, to=filterTo.value;
    if(nameKey) rows=rows.filter(r=>(r.data.participants||[]).some(p=>(p.name||'').toLowerCase().includes(nameKey)));
    if(from) rows=rows.filter(r=>r.data.date>=from);
    if(to) rows=rows.filter(r=>r.data.date<=to);
    renderHistory(rows);
  }catch(err){ console.error(err); alert('Không tải được lịch sử.'); }
}

// Overlay open/close + blur
openFilterBtn.addEventListener('click',()=>{ filterOverlay.classList.remove('hidden'); appRoot.classList.add('blur-bg'); });
closeFilterBtn.addEventListener('click',()=>{ filterOverlay.classList.add('hidden'); appRoot.classList.remove('blur-bg'); });
applyFilterBtn.addEventListener('click',()=>{ loadHistory(); closeFilterBtn.click(); });
resetFilterBtn.addEventListener('click',()=>{ filterName.value=''; filterFrom.value=''; filterTo.value=''; loadHistory(); });

// ===== Wheel =====
const spinsCol = collection(db, 'spins'); // <— thêm dòng này

function renderWheelChecklist() {
  wheelChecklist.innerHTML = '';
  roster.forEach((name, idx) => {
    const item = document.createElement('label');
    item.className = 'check-item';
    item.innerHTML = `<input type="checkbox" id="wh_${idx}" data-name="${name}" checked><span>${name}</span>`;
    wheelChecklist.appendChild(item);
  });

  // vẽ lần đầu & cập nhật khi tick đổi
  drawWheel(getWheelPool());
  wheelChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb=>{
    cb.addEventListener('change', ()=> drawWheel(getWheelPool()));
  });
}
resetWheelBtn.addEventListener('click', () => {
  wheelChecklist.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
  winnerEl.textContent = 'Người trúng: —';

  // reset góc và bỏ easing
  wheelSpinner.style.transition = 'transform 8s cubic-bezier(0.1, 0.9, 0.3, 1)';
  wheelSpinner.style.transform  = 'rotate(0deg)';
  // force reflow
  // eslint-disable-next-line no-unused-expressions
  wheelSpinner.offsetHeight;

  drawWheel(getWheelPool());
});


spinBtn.addEventListener('click', async () => {
  const pool = getWheelPool();
  if (pool.length < 2) { alert('Chọn ít nhất 2 người để quay.'); return; }

  // 1) Chọn người thắng NGẪU NHIÊN (tỉ lệ đều nhau)
  const winnerIndex = Math.floor(Math.random() * pool.length);

  // 2) Tính góc dừng đúng tâm lát NGAY DƯỚI KIM
  //    - 0° của bánh là hướng bên phải (3h)
  //    - Kim ở đỉnh (12h) = 270°
  const degPer        = 360 / pool.length;
  const centerOfSlice = winnerIndex * degPer + degPer / 2;

  // 3) Tránh rơi ngay biên lát: thêm jitter nhỏ nằm gọn trong lát
  const jitterMax     = degPer * 0.25;                 // ±25% bề rộng lát
  const jitter        = (Math.random() * 2 - 1) * jitterMax;
  const targetAngle   = centerOfSlice + jitter;        // vẫn nằm trong lát

  // 4) Tổng góc quay: nhiều vòng + căn sao cho targetAngle -> 12h (270°)
  const spins    = 6;                                  // số vòng
  const totalDeg = spins * 360 + (270 - targetAngle);  // 270° = đỉnh

  // 5) Quay với tốc độ đều (linear) để không chậm ở cuối
  wheelSpinner.style.transition = 'none';
  // force reflow
  // eslint-disable-next-line no-unused-expressions
  wheelSpinner.offsetHeight;
  wheelSpinner.style.transition = 'transform 8s cubic-bezier(0.1, 0.9, 0.3, 1)';
  wheelSpinner.style.transform  = `rotate(${totalDeg}deg)`;

  // chờ kết thúc animation
  setTimeout(async () => {
    const winner = pool[winnerIndex];
      if (winnerEl)      winnerEl.textContent = `Người trúng: ${winner} 🎉`;
  if (winnerNameEl)  winnerNameEl.textContent = winner;
  if (winnerOverlay) winnerOverlay.classList.remove('hidden');
  if (appRoot)       appRoot.classList.add('blur-bg');
 //   winnerEl.textContent = `Người trúng: ${winner} 🎉`;

    // popup chúc mừng
 //   winnerNameEl.textContent = winner;
  //  winnerOverlay.classList.remove('hidden');
   // appRoot.classList.add('blur-bg');

    // lưu lịch sử quay
    try{
      await addDoc(spinsCol, {
        at: serverTimestamp(),
        candidates: pool,
        count: pool.length,
        winner: winner
      });

      await loadSpinHistory();
    }catch(err){
      console.error('Lỗi lưu lịch sử quay:', err);
    }
  }, 8000); // khớp với thời gian transition
});

closeWinnerBtn.addEventListener('click', ()=>{
  winnerOverlay.classList.add('hidden');
  appRoot.classList.remove('blur-bg');
});
function fmtTime(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  // hiển thị dd/MM HH:mm
  return d.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' });
}

function renderSpinHistory(rows){
  if (!spinsTbody) return;
  spinsTbody.innerHTML = '';
  rows.forEach(r=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="mono">${fmtTime(r.at)}</td>
      <td><b>${r.winner}</b></td>
      <td class="muted">${(r.candidates||[]).join(', ')}</td>
    `;
    spinsTbody.appendChild(tr);
  });
}

async function loadSpinHistory(){
  try{
    const snap = await getDocs(query(spinsCol, orderBy('at','desc')));
    const rows = snap.docs.map(d=>d.data()).slice(0,20); // lấy 20 bản ghi gần nhất
    renderSpinHistory(rows);
  }catch(e){
    console.error('Không tải được lịch sử quay:', e);
  }
}

// ===== Init =====
(async function init(){

  dateInput.value=todayISO();
  roster = await ensureRoster();
  renderRosterChecklist(); renderSettingsList();
  await loadHistory();
    await loadSpinHistory();
})();
