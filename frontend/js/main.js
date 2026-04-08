// ===== User Avatar =====
const avatarInitials = document.getElementById('avatarInitials');
const userName = ''; // 추후 로그인 정보 연동 시 여기에 이름 설정

if (userName) {
  const initials = userName
    .split(' ')
    .map(word => word[0])
    .join('')
    .slice(0, 2);
  avatarInitials.textContent = initials;
}

// ===== Start Button =====
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', () => {
  window.location.href = '/input';
});
