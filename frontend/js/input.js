// file:// 에서 열 때는 Flask 서버 절대 URL 사용, 서버에서 열 때는 상대 URL 사용
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';

// ===== 유저 아바타 & 드롭다운 =====
const _userRaw  = sessionStorage.getItem('user') || '{}';
const _userObj  = (() => { try { return JSON.parse(_userRaw); } catch { return { email: _userRaw }; } })();
const _email    = _userObj.email || '';
const _namePart = (_userObj.name || _email.split('@')[0]);
const _initials = _namePart.slice(0, 2).toUpperCase();

(function () {
  const avatarInitials = document.querySelector('.avatar-initials');
  if (avatarInitials) avatarInitials.textContent = _initials;

  const nameEl  = document.getElementById('dropdownName');
  const emailEl = document.getElementById('dropdownEmail');
  if (nameEl)  nameEl.textContent  = _namePart;
  if (emailEl) emailEl.textContent = _email;

  const btn      = document.getElementById('avatarBtn');
  const dropdown = document.getElementById('avatarDropdown');
  if (!btn || !dropdown) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });

  document.addEventListener('click', () => {
    dropdown.classList.remove('open');
  });
})();

// ===== 내 정보 모달 =====
(function () {
  const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:5000' : '';
  const modal    = document.getElementById('myInfoModal');
  const openBtn  = document.getElementById('myInfoBtn');
  const closeBtn = document.getElementById('myInfoClose');
  const form     = document.getElementById('myInfoForm');
  const saveMsg  = document.getElementById('infoSaveMsg');
  if (!modal || !openBtn) return;

  function openModal() {
    // 현재 데이터 채우기
    document.getElementById('infoAvatar').textContent       = _initials;
    document.getElementById('infoEmail').textContent        = _email;
    document.getElementById('info-email-display').value     = _email;
    document.getElementById('info-name').value              = _userObj.name       || '';
    document.getElementById('info-company').value           = _userObj.company    || '';
    document.getElementById('info-department').value        = _userObj.department || '';
    document.getElementById('info-phone').value             = _userObj.phone      || '';
    saveMsg.textContent = '';
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    // 드롭다운 닫기
    document.getElementById('avatarDropdown').classList.remove('open');
  }

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openModal);
  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const updated = {
      name:       document.getElementById('info-name').value.trim(),
      company:    document.getElementById('info-company').value.trim(),
      department: document.getElementById('info-department').value.trim(),
      phone:      document.getElementById('info-phone').value.trim(),
    };
    try {
      const res = await fetch(`${API_BASE}/api/auth/me?email=${encodeURIComponent(_email)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });
      if (!res.ok) throw new Error();
      // sessionStorage 갱신
      const newUser = { ..._userObj, ...updated };
      sessionStorage.setItem('user', JSON.stringify(newUser));
      saveMsg.textContent = '✓ 저장되었습니다.';
      // 드롭다운 이름 갱신
      const nameEl = document.getElementById('dropdownName');
      if (nameEl) nameEl.textContent = updated.name || _email.split('@')[0];
      const avatarInitials = document.querySelector('.avatar-initials');
      const newInitials = (updated.name || _email.split('@')[0]).slice(0, 2).toUpperCase();
      if (avatarInitials) avatarInitials.textContent = newInitials;
      document.getElementById('infoAvatar').textContent = newInitials;
    } catch {
      saveMsg.style.color = '#e53935';
      saveMsg.textContent = '저장에 실패했습니다.';
    }
  });
})();

// ===== 데이터 형식 모달 =====
(function () {
  const btn     = document.getElementById('dataFormatBtn');
  const modal   = document.getElementById('dataFormatModal');
  const closeBtn = document.getElementById('modalClose');
  if (!btn || !modal) return;

  btn.addEventListener('click', () => {
    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  });

  function closeModal() {
    modal.style.display = 'none';
    document.body.style.overflow = '';
  }

  closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeModal();
  });
})();

// ===== 기준월 / 결산월 옵션 생성 =====
function populateMonths(selectId) {
  const select = document.getElementById(selectId);
  const now = new Date();
  for (let i = 0; i < 24; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = `${d.getFullYear()}년 ${d.getMonth() + 1}월`;
    const option = document.createElement('option');
    option.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    option.textContent = label;
    select.appendChild(option);
  }
}

populateMonths('baseMonth');
populateMonths('closingMonth');

// ===== 파일 업로드 =====
function setupUpload(inputId, labelId, boxId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  const box   = document.getElementById(boxId);

  input.addEventListener('change', () => {
    if (input.files.length > 0) {
      label.textContent = input.files[0].name;
      label.classList.add('upload-filename');
    }
  });

  box.addEventListener('dragover', (e) => {
    e.preventDefault();
    box.classList.add('dragover');
  });

  box.addEventListener('dragleave', () => {
    box.classList.remove('dragover');
  });

  box.addEventListener('drop', (e) => {
    e.preventDefault();
    box.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) {
      const dt = new DataTransfer();
      dt.items.add(file);
      input.files = dt.files;
      label.textContent = file.name;
      label.classList.add('upload-filename');
    }
  });
}

setupUpload('journalFile', 'journalLabel', 'journalBox');
setupUpload('trialFile',   'trialLabel',   'trialBox');

// ===== 가공하기 버튼 =====
const processBtn = document.getElementById('processBtn');

processBtn.addEventListener('click', async () => {
  const baseMonth    = document.getElementById('baseMonth').value;
  const closingMonth = document.getElementById('closingMonth').value;
  const company      = document.getElementById('company').value;
  const jeFiles      = document.getElementById('journalFile').files;
  const tbFiles      = document.getElementById('trialFile').files;

  if (!baseMonth)      { alert('기준월을 선택해주세요.');       return; }
  if (!closingMonth)   { alert('결산월을 선택해주세요.');       return; }
  if (!company)        { alert('회사명을 선택해주세요.');       return; }
  if (!jeFiles.length) { alert('분개장 파일을 업로드해주세요.'); return; }
  if (!tbFiles.length) { alert('시산표 파일을 업로드해주세요.'); return; }

  processBtn.disabled    = true;
  processBtn.textContent = '처리 중…';

  // 로딩 오버레이 표시
  const overlay = document.getElementById('loadingOverlay');
  overlay.style.display = 'flex';

  const formData = new FormData();
  formData.append('journalFile', jeFiles[0]);
  formData.append('trialFile',   tbFiles[0]);
  formData.append('baseMonth',   baseMonth);
  formData.append('company',     company);

  try {
    const res = await fetch(API_BASE + '/api/upload', { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`서버 오류 ${res.status}`);
    const data = await res.json();
    window.location.href = `output.html?from=process&year=${data.year}&month=${data.month}`;
  } catch (err) {
    overlay.style.display = 'none';
    alert('파일 업로드에 실패했습니다.\n서버(서버시작.bat)가 실행 중인지 확인해주세요.\n\n' + err.message);
    processBtn.disabled    = false;
    processBtn.textContent = '가공하기';
  }
});
