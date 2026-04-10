const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';

// ===== 비밀번호 토글 =====
const togglePw      = document.getElementById('togglePw');
const passwordInput = document.getElementById('password');
const iconHide      = document.getElementById('iconHide');
const iconShow      = document.getElementById('iconShow');

if (togglePw) {
  togglePw.addEventListener('click', () => {
    const isHidden = passwordInput.type === 'password';
    passwordInput.type = isHidden ? 'text' : 'password';
    iconHide.style.display = isHidden ? '' : 'none';
    iconShow.style.display = isHidden ? 'none' : '';
  });
}

// ===== 로그인 / 회원가입 전환 =====
const loginBox       = document.getElementById('loginBox');
const registerBox    = document.getElementById('registerBox');
const showRegisterBtn = document.getElementById('showRegisterBtn');
const showLoginBtn   = document.getElementById('showLoginBtn');

if (showRegisterBtn) {
  showRegisterBtn.addEventListener('click', () => {
    loginBox.style.display = 'none';
    registerBox.style.display = '';
  });
}
if (showLoginBtn) {
  showLoginBtn.addEventListener('click', () => {
    registerBox.style.display = 'none';
    loginBox.style.display = '';
  });
}

// ===== 로그인 =====
const loginForm  = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.textContent = '';
  const email    = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const res = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json();
      loginError.textContent = err.detail || '로그인에 실패했습니다.';
      return;
    }
    const user = await res.json();
    sessionStorage.setItem('user', JSON.stringify(user));
    window.location.href = 'input.html';
  } catch {
    loginError.textContent = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
  }
});

// ===== 회원가입 =====
const registerForm  = document.getElementById('registerForm');
const registerError = document.getElementById('registerError');

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.textContent = '';
  const email      = document.getElementById('reg-email').value.trim();
  const password   = document.getElementById('reg-password').value;
  const name       = document.getElementById('reg-name').value.trim();
  const company    = document.getElementById('reg-company').value.trim();
  const department = document.getElementById('reg-department').value.trim();
  const phone      = document.getElementById('reg-phone').value.trim();

  if (password.length < 6) {
    registerError.textContent = '비밀번호는 6자 이상이어야 합니다.';
    return;
  }

  try {
    const res = await fetch(API_BASE + '/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name, company, department, phone }),
    });
    if (!res.ok) {
      const err = await res.json();
      registerError.textContent = err.detail || '회원가입에 실패했습니다.';
      return;
    }
    // 가입 후 자동 로그인
    const loginRes = await fetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const user = await loginRes.json();
    sessionStorage.setItem('user', JSON.stringify(user));
    window.location.href = 'input.html';
  } catch {
    registerError.textContent = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.';
  }
});

// ===== 비밀번호 찾기 =====
const forgotBtn = document.getElementById('forgotBtn');
if (forgotBtn) {
  forgotBtn.addEventListener('click', (e) => {
    e.preventDefault();
    alert('비밀번호 재설정은 관리자(kr_easyview@pwc.com)에게 문의해주세요.');
  });
}
