// If already logged in, skip straight to the dashboard
if (auth.isLoggedIn()) {
  window.location.href = 'index.html';
}

const tabLogin = document.getElementById('tabLogin');
const tabSignup = document.getElementById('tabSignup');
const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const authError = document.getElementById('authError');

function showError(message) {
  authError.textContent = message;
  authError.classList.add('show');
}

function clearError() {
  authError.classList.remove('show');
  authError.textContent = '';
}

tabLogin.addEventListener('click', () => {
  tabLogin.classList.add('active');
  tabSignup.classList.remove('active');
  loginForm.style.display = 'block';
  signupForm.style.display = 'none';
  clearError();
});

tabSignup.addEventListener('click', () => {
  tabSignup.classList.add('active');
  tabLogin.classList.remove('active');
  signupForm.style.display = 'block';
  loginForm.style.display = 'none';
  clearError();
});

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const submitBtn = document.getElementById('loginSubmit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Logging in…';

  try {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;

    const data = await apiRequest('/auth/login', { method: 'POST', body: { email, password } });
    auth.setSession(data.token, data.user);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Log in';
  }
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearError();

  const submitBtn = document.getElementById('signupSubmit');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Creating account…';

  try {
    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;

    const data = await apiRequest('/auth/signup', { method: 'POST', body: { name, email, password } });
    auth.setSession(data.token, data.user);
    window.location.href = 'index.html';
  } catch (err) {
    showError(err.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create account';
  }
});
