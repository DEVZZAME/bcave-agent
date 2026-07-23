// Redirect straight to the dashboard if already signed in.
fetch('/api/auth/me', { credentials: 'same-origin' })
  .then((r) => { if (r.ok) window.location.href = '/dashboard'; })
  .catch(() => {});

const tabs = document.querySelectorAll('.tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

tabs.forEach((tab) => {
  tab.addEventListener('click', () => {
    tabs.forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    loginForm.classList.toggle('hidden', !isLogin);
    signupForm.classList.toggle('hidden', isLogin);
  });
});

function showMsg(el, text, ok = false) {
  el.textContent = text;
  el.className = 'form-msg ' + (ok ? 'ok' : 'error') + (text ? ' show' : '');
}

async function submit(url, body, msgEl, btn) {
  btn.disabled = true;
  btn.dataset.label = btn.textContent;
  btn.textContent = '잠시만 기다려 주세요…';
  showMsg(msgEl, '');
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '문제가 발생했습니다. 다시 시도해 주세요.');
    window.location.href = '/dashboard';
  } catch (err) {
    showMsg(msgEl, err.message);
    btn.disabled = false;
    btn.textContent = btn.dataset.label;
  }
}

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(loginForm);
  submit('/api/auth/login', {
    email: f.get('email'),
    password: f.get('password'),
  }, document.getElementById('login-msg'), loginForm.querySelector('button[type=submit]'));
});

signupForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const f = new FormData(signupForm);
  submit('/api/auth/signup', {
    name: f.get('name'),
    email: f.get('email'),
    password: f.get('password'),
  }, document.getElementById('signup-msg'), signupForm.querySelector('button[type=submit]'));
});
