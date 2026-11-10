// This page uses the same account key as signup.js and login.js.
(function () {
    const game = window.MatadorHunt;
    const byId = id => document.getElementById(id);
    const tabs = Array.from(document.querySelectorAll('[role="tab"]'));
    let currentUsername;
    let selectedId = game.riddles[0].id;
    let user;
    let announcement = null;

    function readUsers() {
        const users = JSON.parse(localStorage.getItem('matadorUsers') || '[]');
        if (!Array.isArray(users)) throw new Error('Saved accounts could not be read.');
        return users;
    }

    function accountIndex(users) {
        return users.findIndex(account => typeof account?.username === 'string' && account.username.toLowerCase() === currentUsername.toLowerCase());
    }

    function readAccount() {
        const users = readUsers();
        const index = accountIndex(users);
        if (index < 0) {
            sessionStorage.removeItem('currentUser');
            window.location.replace('index.html');
            return null;
        }
        return game.prepare(users[index]);
    }

    function fail(error) {
        byId('pageError').textContent = 'Could not read or save your hunt. Check that browser storage is allowed, then refresh. ' + error.message;
        byId('pageError').hidden = false;
        // Keep an older view from appearing to accept unsaved changes.
        byId('huntPage').hidden = true;
        console.error(error);
    }

    function lockText(entry) {
        const minutes = Math.max(1, Math.ceil((entry.lockedUntil - Date.now()) / 60000));
        const hours = Math.floor(minutes / 60);
        return 'Locked · ' + (hours ? hours + 'h ' : '') + (minutes % 60) + 'm left';
    }

    function status(entry) {
        if (entry.solved) return 'Solved · ' + entry.points + ' points';
        if (entry.lockedUntil > Date.now()) return lockText(entry);
        return 'Ready to solve';
    }

    function element(tag, text, className) {
        const node = document.createElement(tag);
        if (text !== undefined) node.textContent = text;
        if (className) node.className = className;
        return node;
    }

    function renderClues() {
        const list = byId('clueList');
        // Keep buttons in place so keyboard focus survives updates.
        if (!list.children.length) {
            game.riddles.forEach((riddle, index) => {
                const button = element('button', undefined, 'clue-button');
                button.type = 'button';
                button.dataset.id = riddle.id;
                button.append(
                    element('span', 'CLUE ' + String(index + 1).padStart(2, '0'), 'eyebrow'),
                    element('strong', riddle.title),
                    element('span', '', 'clue-status')
                );
                button.addEventListener('click', () => {
                    selectedId = riddle.id;
                    announcement = null;
                    byId('answer').value = '';
                    refresh();
                });
                list.append(button);
            });
        }
        Array.from(list.children).forEach(button => {
            const entry = user.huntProgress[button.dataset.id];
            button.setAttribute('aria-pressed', String(button.dataset.id === selectedId));
            button.classList.toggle('solved', entry.solved);
            button.querySelector('.clue-status').textContent = status(entry);
        });
    }

    function row(values) {
        const node = document.createElement('tr');
        values.forEach(value => node.append(element('td', String(value))));
        return node;
    }

    function renderTables() {
        const rows = byId('progressRows');
        rows.replaceChildren();
        game.riddles.forEach(riddle => {
            const entry = user.huntProgress[riddle.id];
            rows.append(row([riddle.title, status(entry), entry.hintsUsed + ' / 3', entry.points]));
        });
        const count = game.solvedCount(user);
        byId('progressLabel').textContent = count + ' of 6 riddles solved · ' + user.score + ' points earned';
        byId('huntProgress').value = count;

        const leaderboard = byId('leaderboardRows');
        leaderboard.replaceChildren();
        const players = readUsers().filter(account => typeof account?.username === 'string');
        const self = accountIndex(players);
        if (self >= 0) players[self] = user;
        players.sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || a.username.localeCompare(b.username));
        players.forEach((player, index) => {
            const node = row([index + 1, player.username, game.solvedCount(player) + ' / 6', Number(player.score) || 0]);
            if (player.username.toLowerCase() === currentUsername.toLowerCase()) node.className = 'current-player';
            leaderboard.append(node);
        });
    }

    function render() {
        const riddle = game.riddles.find(item => item.id === selectedId);
        const entry = user.huntProgress[selectedId];
        const locked = entry.lockedUntil > Date.now();
        byId('playerName').textContent = user.username;
        byId('totalPoints').textContent = user.score;
        byId('solvedBadge').textContent = game.solvedCount(user) + ' of 6 solved';
        byId('clueNumber').textContent = 'CLUE ' + String(game.riddles.indexOf(riddle) + 1).padStart(2, '0');
        byId('riddleTitle').textContent = riddle.title;
        byId('riddleQuestion').textContent = riddle.question;
        byId('hintCount').textContent = entry.hintsUsed + ' / 3';
        byId('hintList').replaceChildren(...riddle.hints.slice(0, entry.hintsUsed).map(hint => element('li', hint)));
        byId('hintList').hidden = entry.hintsUsed === 0;
        byId('revealHint').disabled = entry.solved || locked || entry.hintsUsed >= 3;
        byId('revealHint').textContent = entry.hintsUsed >= 3 ? 'All hints revealed' : 'Reveal next hint';
        byId('answer').disabled = entry.solved || locked;
        byId('submitAnswer').disabled = entry.solved || locked;
        byId('submitAnswer').textContent = entry.solved ? 'Solved' : 'Submit answer';
        byId('attempts').textContent = entry.solved
            ? 'Clue complete · ' + entry.points + ' points earned.'
            : locked ? lockText(entry)
            : (3 - entry.wrongTries) + ' tries left · ' + game.possiblePoints(entry.hintsUsed) + ' possible points';
        const message = byId('answerMessage');
        message.textContent = announcement?.message || '';
        message.className = 'answer-message ' + (announcement?.type || '');
        byId('completedMessage').hidden = game.solvedCount(user) !== 6;
        renderClues();
        renderTables();
    }

    function refresh() {
        try {
            user = readAccount();
            if (user) render();
        } catch (error) { fail(error); }
    }

    function play(action, answer = '') {
        try {
            // Read fresh before each write to preserve other players' accounts.
            const users = readUsers();
            const index = accountIndex(users);
            if (index < 0) return switchPlayer();
            const account = game.prepare(users[index]);
            const result = game.act(account, selectedId, action, answer);
            localStorage.setItem('matadorUsers', JSON.stringify(users));
            user = account;
            announcement = result;
            if (action === 'answer') byId('answer').value = '';
            render();
        } catch (error) { fail(error); }
    }

    function switchPlayer() {
        try {
            sessionStorage.removeItem('currentUser');
            window.location.href = 'index.html';
        } catch (error) { fail(error); }
    }

    function saveResults() {
        const message = byId('exportMessage');
        message.hidden = false;
        let url;
        let link;
        try {
            // Read the latest saved accounts instead of an older screen snapshot.
            const text = game.resultsText(readUsers(), currentUsername);
            const file = new Blob(['\uFEFF', text], { type: 'text/plain;charset=utf-8' });
            url = URL.createObjectURL(file);
            link = document.createElement('a');
            link.href = url;
            link.download = 'matador-hunt-results-' + new Date().toISOString().replace(/[:.]/g, '-') + '.txt';
            document.body.append(link);
            link.click();
            message.textContent = 'Results download requested. Check your browser’s downloads.';
        } catch (error) {
            message.textContent = 'Could not download results. Check that browser storage and downloads are allowed.';
            console.error(error);
        } finally {
            if (link) link.remove();
            if (url) window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        }
    }

    function chooseTab(tab, focus = false) {
        tabs.forEach(button => {
            const selected = button === tab;
            button.setAttribute('aria-selected', String(selected));
            button.tabIndex = selected ? 0 : -1;
            byId(button.getAttribute('aria-controls')).hidden = !selected;
        });
        if (focus) tab.focus();
        refresh();
    }

    byId('answerForm').addEventListener('submit', event => {
        event.preventDefault();
        play('answer', byId('answer').value);
    });
    byId('revealHint').addEventListener('click', () => play('hint'));
    byId('switchPlayer').addEventListener('click', switchPlayer);
    byId('settingsSwitch').addEventListener('click', switchPlayer);
    byId('saveResults').addEventListener('click', saveResults);
    byId('saveCompletedResults').addEventListener('click', saveResults);
    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => chooseTab(tab));
        tab.addEventListener('keydown', event => {
            let next;
            if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
            if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
            if (event.key === 'Home') next = 0;
            if (event.key === 'End') next = tabs.length - 1;
            if (next !== undefined) {
                event.preventDefault();
                chooseTab(tabs[next], true);
            }
        });
    });
    byId('resetProgress').addEventListener('click', () => {
        if (!window.confirm('Reset your hunt progress and points? Your account will stay saved.')) return;
        try {
            const users = readUsers();
            const index = accountIndex(users);
            if (index < 0) return switchPlayer();
            users[index].huntProgress = {};
            game.prepare(users[index]);
            localStorage.setItem('matadorUsers', JSON.stringify(users));
            selectedId = game.riddles[0].id;
            announcement = null;
            byId('answer').value = '';
            byId('settingsMessage').textContent = 'Your hunt is reset. Choose Riddles to start again.';
            refresh();
        } catch (error) { fail(error); }
    });

    window.addEventListener('storage', event => {
        if (event.key === 'matadorUsers' || event.key === null) {
            announcement = null;
            refresh();
        }
    });
    try {
        currentUsername = sessionStorage.getItem('currentUser');
        if (!currentUsername) {
            window.location.replace('index.html');
            return;
        }
        user = readAccount();
        if (!user) return;
        render();
        byId('huntPage').hidden = false;
        // Update lock countdowns without clearing an answer being typed.
        window.setInterval(refresh, 30000);
    } catch (error) { fail(error); }
})();
