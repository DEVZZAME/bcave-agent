'use strict';

// ---------- helpers ----------
const $ = (sel) => document.querySelector(sel);
const el = (tag, cls, html) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (html != null) n.innerHTML = html;
  return n;
};
const esc = (s) =>
  String(s == null ? '' : s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );

async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...opts,
  });
  if (res.status === 401) {
    window.location.href = '/login';
    throw new Error('unauthorized');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || '요청 실패');
  return data;
}

let ME = null;
let DEPARTMENTS = [];

// ---------- boot ----------
(async function boot() {
  try {
    const { user } = await api('/api/auth/me');
    ME = user;
  } catch {
    window.location.href = '/login';
    return;
  }
  $('#app').style.display = 'grid';
  renderUserChip();
  setupNav();
  setupSearch();
  setupDocs();
  $('#logoutBtn').addEventListener('click', logout);
  $('#modalBg').addEventListener('click', (e) => {
    if (e.target.id === 'modalBg') closeModal();
  });

  const dres = await api('/api/auth/departments');
  DEPARTMENTS = dres.departments || [];

  loadHome();
})();

function renderUserChip() {
  $('#userAvatar').textContent = ME.name ? ME.name[0] : '?';
  $('#userName').textContent = ME.name;
  $('#userDept').textContent = ME.departmentName || '부서 미지정';
  $('#welcomeTitle').textContent = `안녕하세요, ${ME.name}님 👋`;
}

async function logout() {
  await api('/api/auth/logout', { method: 'POST' });
  window.location.href = '/login';
}

// ---------- navigation ----------
function setupNav() {
  document.querySelectorAll('.nav-item[data-view]').forEach((btn) => {
    btn.addEventListener('click', () => switchView(btn.dataset.view));
  });
}
function switchView(view) {
  document.querySelectorAll('.nav-item[data-view]').forEach((b) =>
    b.classList.toggle('active', b.dataset.view === view)
  );
  document.querySelectorAll('.view').forEach((v) =>
    v.classList.toggle('active', v.id === 'view-' + view)
  );
  if (view === 'home') loadHome();
  if (view === 'docs') loadDocs();
  if (view === 'onboarding') loadOnboarding();
}

// ---------- HOME ----------
async function loadHome() {
  try {
    const stats = await api('/api/knowledge/stats');
    const cards = [
      { label: '전체 문서', value: stats.docCount, coral: false },
      { label: '구성원', value: stats.userCount, coral: false },
      { label: '내 부서', value: ME.departmentName || '-', coral: true, small: true },
    ];
    $('#statCards').innerHTML = '';
    cards.forEach((c) => {
      const card = el('div', 'card stat');
      card.innerHTML = `<div class="label">${esc(c.label)}</div>
        <div class="value ${c.coral ? 'coral' : ''}" style="${c.small ? 'font-size:22px' : ''}">${esc(c.value)}</div>`;
      $('#statCards').appendChild(card);
    });

    // dept stats
    $('#deptStats').innerHTML = stats.byDept
      .map(
        (d) =>
          `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--line);">
            <span>${esc(d.department)}</span><b>${d.count}건</b></div>`
      )
      .join('');

    // popular
    const pop = await api('/api/knowledge/popular');
    $('#popularDocs').innerHTML = '';
    pop.documents.forEach((d) => {
      const row = el('div', 'doc-row');
      row.innerHTML = `<div class="dt">${esc(d.title)}</div>
        <div class="dm"><span class="tag">${esc(d.category || '일반')}</span>
        <span class="tag dept">${esc(d.department_name || '전사 공용')}</span> · 조회 ${d.views}</div>`;
      row.addEventListener('click', () => openDoc(d.id));
      $('#popularDocs').appendChild(row);
    });
  } catch (e) {
    console.error(e);
  }

  // onboarding summary
  try {
    const ob = await api('/api/onboarding');
    $('#homeOnboarding').innerHTML = `
      <div class="progress-bar"><div style="width:${ob.percent}%"></div></div>
      <div class="progress-meta"><span><b>${ob.done}</b> / ${ob.total} 완료</span><b>${ob.percent}%</b></div>
      <div style="margin-top:12px;">
        <button class="btn ghost" style="width:auto;padding:8px 16px;" onclick="switchView('onboarding')">온보딩 이어서 하기 →</button>
      </div>`;
  } catch (e) {
    $('#homeOnboarding').innerHTML = '<div class="empty">온보딩 정보를 불러오지 못했습니다.</div>';
  }
}

// ---------- SEARCH ----------
const SUGGESTIONS = [
  '연차는 어떻게 신청하나요?',
  '법인카드 정산 방법',
  '브랜드 컬러와 로고 규칙',
  '서버 장애가 나면 어떻게 대응하나요?',
  'SNS 콘텐츠 발행 규칙',
  '개발 환경은 어떻게 세팅하나요?',
];

function setupSearch() {
  const chips = $('#suggestChips');
  SUGGESTIONS.forEach((s) => {
    const c = el('button', 'chip', esc(s));
    c.addEventListener('click', () => {
      $('#searchInput').value = s;
      doSearch();
    });
    chips.appendChild(c);
  });
  $('#searchBtn').addEventListener('click', doSearch);
  $('#searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch();
  });
}

async function doSearch() {
  const query = $('#searchInput').value.trim();
  if (!query) return;
  const box = $('#searchResult');
  box.innerHTML = '<div class="loading"><div class="spinner"></div>사내 문서를 검색하고 있어요...</div>';
  try {
    const r = await api('/api/knowledge/search', {
      method: 'POST',
      body: JSON.stringify({ query }),
    });
    const modelLabel = r.usedModel === 'offline' ? 'Threadly AI (오프라인)' : `Claude · ${esc(r.usedModel)}`;
    let html = `<div class="card answer-card">
      <div class="ai-badge">✨ ${modelLabel}</div>
      <div class="answer-text">${esc(r.answer)}</div>`;
    if (r.sources && r.sources.length) {
      html += '<div class="sources"><h4>참고 문서</h4>';
      r.sources.forEach((s) => {
        html += `<div class="source-item" data-id="${s.id}">
          <div><div class="t">${esc(s.title)}</div>
          <div class="m"><span class="tag">${esc(s.category || '일반')}</span>
          <span class="tag dept">${esc(s.department)}</span></div></div>
          <div style="color:var(--muted);font-size:12px;">관련도 ${s.score}</div></div>`;
      });
      html += '</div>';
    }
    html += '</div>';
    box.innerHTML = html;
    box.querySelectorAll('.source-item').forEach((item) =>
      item.addEventListener('click', () => openDoc(Number(item.dataset.id)))
    );
  } catch (e) {
    box.innerHTML = `<div class="empty">검색 중 오류가 발생했습니다: ${esc(e.message)}</div>`;
  }
}

// ---------- DOCS ----------
function setupDocs() {
  $('#newDocBtn').addEventListener('click', openNewDocModal);
  ['filterDept', 'filterCat', 'filterQ'].forEach((id) => {
    const node = $('#' + id);
    node.addEventListener(id === 'filterQ' ? 'input' : 'change', loadDocs);
  });
}

let docsInited = false;
async function loadDocs() {
  if (!docsInited) {
    const sel = $('#filterDept');
    DEPARTMENTS.forEach((d) => {
      const o = el('option');
      o.value = d.id;
      o.textContent = d.name;
      sel.appendChild(o);
    });
    ['정책', '가이드', '프로세스', '온보딩', 'FAQ', '일반'].forEach((c) => {
      const o = el('option');
      o.value = c;
      o.textContent = c;
      $('#filterCat').appendChild(o);
    });
    docsInited = true;
  }
  const params = new URLSearchParams();
  if ($('#filterDept').value) params.set('department', $('#filterDept').value);
  if ($('#filterCat').value) params.set('category', $('#filterCat').value);
  if ($('#filterQ').value.trim()) params.set('q', $('#filterQ').value.trim());

  const list = $('#docList');
  list.innerHTML = '<div class="loading"><div class="spinner"></div>불러오는 중...</div>';
  try {
    const { documents } = await api('/api/knowledge/documents?' + params.toString());
    if (!documents.length) {
      list.innerHTML = '<div class="empty">조건에 맞는 문서가 없습니다.</div>';
      return;
    }
    list.innerHTML = '';
    documents.forEach((d) => {
      const row = el('div', 'doc-row');
      const tags = (d.tags || '')
        .split(',')
        .filter(Boolean)
        .slice(0, 4)
        .map((t) => `<span class="tag">#${esc(t.trim())}</span>`)
        .join(' ');
      row.innerHTML = `<div class="dt">${esc(d.title)}</div>
        <div class="ds">${esc(d.summary || '')}</div>
        <div class="dm"><span class="tag">${esc(d.category || '일반')}</span>
        <span class="tag dept">${esc(d.department_name || '전사 공용')}</span> ${tags}
        · 작성자 ${esc(d.author_name || '-')} · 조회 ${d.views}</div>`;
      row.addEventListener('click', () => openDoc(d.id));
      list.appendChild(row);
    });
  } catch (e) {
    list.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

async function openDoc(id) {
  try {
    const { document: d } = await api('/api/knowledge/documents/' + id);
    const box = $('#modalBox');
    const tags = (d.tags || '')
      .split(',')
      .filter(Boolean)
      .map((t) => `<span class="tag">#${esc(t.trim())}</span>`)
      .join(' ');
    box.innerHTML = `
      <button class="close-x" onclick="closeModal()">×</button>
      <h2>${esc(d.title)}</h2>
      <div class="modal-meta">
        <span class="tag">${esc(d.category || '일반')}</span>
        <span class="tag dept">${esc(d.department_name || '전사 공용')}</span>
        · 작성자 ${esc(d.author_name || '-')} · 조회 ${d.views} · 수정 ${esc((d.updated_at || '').slice(0, 10))}
      </div>
      <div class="modal-content">${esc(d.content)}</div>
      <div style="margin-top:16px;">${tags}</div>`;
    $('#modalBg').classList.add('show');
  } catch (e) {
    alert(e.message);
  }
}

function openNewDocModal() {
  const box = $('#modalBox');
  const deptOpts = DEPARTMENTS.map(
    (d) => `<option value="${d.id}" ${d.id === ME.departmentId ? 'selected' : ''}>${esc(d.name)}</option>`
  ).join('');
  box.innerHTML = `
    <button class="close-x" onclick="closeModal()">×</button>
    <h2>새 문서 등록</h2>
    <div class="modal-meta">지식베이스에 문서를 추가합니다.</div>
    <div class="field"><label>제목</label><input id="nd-title" placeholder="문서 제목" /></div>
    <div class="field"><label>카테고리</label>
      <select id="nd-cat">
        <option>정책</option><option>가이드</option><option>프로세스</option>
        <option>온보딩</option><option>FAQ</option><option selected>일반</option>
      </select></div>
    <div class="field"><label>부서 (비우면 전사 공용)</label>
      <select id="nd-dept"><option value="">전사 공용</option>${deptOpts}</select></div>
    <div class="field"><label>태그 (쉼표로 구분)</label><input id="nd-tags" placeholder="예: 휴가, 근태" /></div>
    <div class="field"><label>내용</label>
      <textarea id="nd-content" rows="8" style="width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font-family:inherit;font-size:15px;"></textarea></div>
    <div id="nd-alert" class="alert error"></div>
    <button class="btn coral" id="nd-save">저장</button>`;
  $('#modalBg').classList.add('show');
  $('#nd-save').addEventListener('click', saveNewDoc);
}

async function saveNewDoc() {
  const alertBox = $('#nd-alert');
  const title = $('#nd-title').value.trim();
  const content = $('#nd-content').value.trim();
  if (!title || !content) {
    alertBox.textContent = '제목과 내용은 필수입니다.';
    alertBox.className = 'alert error show';
    return;
  }
  try {
    await api('/api/knowledge/documents', {
      method: 'POST',
      body: JSON.stringify({
        title,
        content,
        category: $('#nd-cat').value,
        departmentId: $('#nd-dept').value || null,
        tags: $('#nd-tags').value,
      }),
    });
    closeModal();
    switchView('docs');
    loadDocs();
  } catch (e) {
    alertBox.textContent = e.message;
    alertBox.className = 'alert error show';
  }
}

function closeModal() {
  $('#modalBg').classList.remove('show');
}

// ---------- ONBOARDING ----------
async function loadOnboarding() {
  const prog = $('#obProgress');
  const groupsBox = $('#obGroups');
  groupsBox.innerHTML = '<div class="loading"><div class="spinner"></div>불러오는 중...</div>';
  try {
    const ob = await api('/api/onboarding');
    prog.innerHTML = `
      <div style="font-weight:700;font-size:16px;margin-bottom:10px;">전체 진행률</div>
      <div class="progress-bar"><div style="width:${ob.percent}%"></div></div>
      <div class="progress-meta"><span><b>${ob.done}</b> / ${ob.total} 항목 완료</span><b>${ob.percent}%</b></div>`;

    groupsBox.innerHTML = '';
    const order = ['계정/환경', '실무', '교육', '문화', '복지', '기타'];
    const keys = Object.keys(ob.groups).sort(
      (a, b) => (order.indexOf(a) + 99) % 100 - ((order.indexOf(b) + 99) % 100)
    );
    keys.forEach((key) => {
      const group = el('div', 'ob-group');
      group.innerHTML = `<h3>${esc(key)}</h3>`;
      ob.groups[key].forEach((t) => {
        const task = el('div', 'task');
        task.innerHTML = `
          <div class="checkbox ${t.done ? 'done' : ''}" data-id="${t.id}">${t.done ? '✓' : ''}</div>
          <div class="body">
            <div class="tt ${t.done ? 'done' : ''}">${esc(t.title)}
              ${t.is_common ? '<span class="common-badge">전사 공통</span>' : ''}</div>
            <div class="td">${esc(t.description || '')}</div>
          </div>`;
        task.querySelector('.checkbox').addEventListener('click', () => toggleTask(t.id));
        group.appendChild(task);
      });
      groupsBox.appendChild(group);
    });
  } catch (e) {
    groupsBox.innerHTML = `<div class="empty">${esc(e.message)}</div>`;
  }
}

async function toggleTask(taskId) {
  try {
    await api('/api/onboarding/toggle', {
      method: 'POST',
      body: JSON.stringify({ taskId }),
    });
    loadOnboarding();
  } catch (e) {
    alert(e.message);
  }
}

// expose for inline handlers
window.switchView = switchView;
window.closeModal = closeModal;
