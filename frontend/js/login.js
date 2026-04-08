// ===== Password Visibility Toggle =====
const togglePw = document.getElementById('togglePw');
const passwordInput = document.getElementById('password');
const iconHide = document.getElementById('iconHide');
const iconShow = document.getElementById('iconShow');

togglePw.addEventListener('click', () => {
  const isHidden = passwordInput.type === 'password';
  passwordInput.type = isHidden ? 'text' : 'password';
  // 비밀번호 보임: 슬래시 눈 표시 / 비밀번호 숨김: 열린 눈 표시
  iconHide.style.display = isHidden ? '' : 'none';
  iconShow.style.display = isHidden ? 'none' : '';
});

const loginForm = document.getElementById('loginForm');
const registerBtn = document.getElementById('registerBtn');
const forgotBtn = document.getElementById('forgotBtn');

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  if (!email || !password) return;

  // 추후 실제 인증 API 연동
  // 현재는 이메일/비밀번호 형식 검증 후 Input 페이지로 이동
  if (!email.includes('@')) {
    alert('올바른 이메일 형식을 입력해주세요.');
    return;
  }
  if (password.length < 4) {
    alert('비밀번호를 입력해주세요.');
    return;
  }

  sessionStorage.setItem('user', email);
  window.location.href = 'input.html';
});

registerBtn.addEventListener('click', () => {
  // 추후 회원가입 페이지로 이동
  // window.location.href = 'register.html';
  console.log('등록하기 클릭됨');
});

forgotBtn.addEventListener('click', (e) => {
  e.preventDefault();
  // 추후 비밀번호 재설정 페이지로 이동
  // window.location.href = 'reset-password.html';
  console.log('비밀번호 찾기 클릭됨');
});
