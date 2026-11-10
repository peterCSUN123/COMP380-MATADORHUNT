// Replace your old login.js with this version.
// It supports the original login-card form and a form with id="loginForm".
const form = document.getElementById('loginForm') || document.querySelector('.login-card form');
let message = document.getElementById('loginMessage');
if (!message) {
    message = document.createElement('p');
    message.id = 'loginMessage';
    message.setAttribute('role', 'status');
    form.append(message);
}

form.elements.username.required = true;
form.elements.password.required = true;
form.elements.username.autocomplete = 'username';
form.elements.password.autocomplete = 'current-password';

form.addEventListener('submit', function (event) {
    event.preventDefault();
    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    try {
        const users = JSON.parse(localStorage.getItem('matadorUsers') || '[]');
        if (!Array.isArray(users)) throw new Error('Invalid saved account data.');
        const user = users.find(account =>
            typeof account?.username === 'string' &&
            account.username.toLowerCase() === username.toLowerCase() &&
            account.password === password
        );
        if (!user) {
            message.textContent = 'Incorrect username or password.';
            return;
        }
        sessionStorage.setItem('currentUser', user.username);
        window.location.href = 'hunt.html';
    } catch (error) {
        message.textContent = 'Could not sign in. Check your browser storage.';
        console.error(error);
    }
});

document.querySelector('.site-header .login')?.addEventListener('click', () => {
    form.elements.username.focus();
});
