// Riddle data and game rules. Edit the questions and answers here.
(function (root) {
    const riddles = [
        {
            id: 'clue-1', title: 'The Silent Teacher',
            question: 'I hold a thousand voices, yet rarely make a sound. When Matadors need answers, within my walls they’re found. What am I?',
            answers: ['Library', 'University Library', 'library'],
            hints: ['Students visit me to research and study.', 'You can borrow some of what I hold.', 'My fourth floor has a Quiet Study Lounge.']
        },
        {
            id: 'clue-2', title: 'Every Step Counts',
            question: 'I go up and down, but I never move. People take me one step at a time. What am I?',
            answers: ['stairs', 'the stairs', 'staircase', 'a staircase', 'a flight of stairs'],
            hints: ['You find me between floors.', 'You use your feet to travel along me.', 'I am an alternative to an elevator.']
        },
        {
            id: 'clue-3', title: 'Always on Time',
            question: 'I have a face and two hands, but no arms or legs. What am I?',
            answers: ['clock', 'a clock', 'wall clock', 'a wall clock', 'watch', 'a watch'],
            hints: ['You look at me when you are running late.', 'My hands move in circles.', 'I show hours and minutes.']
        },
        {
            id: 'clue-4', title: 'The Drying Paradox',
            question: 'The more I dry, the wetter I get. What am I?',
            answers: ['towel', 'a towel', 'bath towel', 'a bath towel'],
            hints: ['I am usually made from fabric.', 'You often find me in a bathroom.', 'You use me after a shower.']
        },
        {
            id: 'clue-5', title: 'A Voice Returned',
            question: 'I repeat what you say, but I have no mouth. Call into a canyon and you might hear me. What am I?',
            answers: ['echo', 'an echo', 'a echo'],
            hints: ['I am something you hear.', 'I happen when sound reflects from a surface.', 'Shout hello, and I answer hello.']
        },
        {
            id: 'clue-6', title: 'The Paper Explorer',
            question: 'I have cities but no houses, forests but no trees, and rivers but no water. What am I?',
            answers: ['map', 'a map', 'atlas', 'an atlas'],
            hints: ['I can help you plan a journey.', 'I show places using symbols and labels.', 'You use me to find your way.']
        }
    ];
    const DAY = 24 * 60 * 60 * 1000;

    function normalize(answer) {
        return answer.trim().toLowerCase().replace(/[.!?]+$/g, '').replace(/\s+/g, ' ');
    }

    function prepare(user, now = Date.now()) {
        if (!user.huntProgress || typeof user.huntProgress !== 'object') user.huntProgress = {};
        riddles.forEach(riddle => {
            let entry = user.huntProgress[riddle.id];
            if (!entry || typeof entry !== 'object') entry = user.huntProgress[riddle.id] = {};
            entry.hintsUsed = Math.max(0, Math.min(3, Number(entry.hintsUsed) || 0));
            entry.solved = entry.solved === true;
            entry.points = entry.solved ? (Number(entry.points) || 0) : 0;
            entry.wrongTries = Number(entry.wrongTries) || 0;
            entry.lockedUntil = Number(entry.lockedUntil) || 0;
            if (entry.lockedUntil && entry.lockedUntil <= now) {
                entry.lockedUntil = 0;
                entry.wrongTries = 0;
            }
        });
        user.score = riddles.reduce((total, riddle) => total + user.huntProgress[riddle.id].points, 0);
        return user;
    }

    function solvedCount(user) {
        return riddles.filter(riddle => user.huntProgress?.[riddle.id]?.solved).length;
    }

    function possiblePoints(hintsUsed) {
        return [10, 9, 7, 4][hintsUsed];
    }

    function act(user, id, action, answer = '', now = Date.now()) {
        const riddle = riddles.find(item => item.id === id);
        if (!riddle) throw new Error('Unknown riddle.');
        prepare(user, now);
        const entry = user.huntProgress[id];
        if (entry.solved) return { type: 'info', message: 'You have already solved this clue.' };
        if (entry.lockedUntil > now) return { type: 'error', message: 'This clue is locked. You can return when the timer ends.' };
        if (action === 'hint') {
            if (entry.hintsUsed >= 3) return { type: 'info', message: 'All three hints are already visible.' };
            entry.hintsUsed += 1;
            return { type: 'info', message: 'Hint revealed. This clue is now worth ' + possiblePoints(entry.hintsUsed) + ' points.' };
        }
        if (action !== 'answer') throw new Error('Unknown action.');
        if (!normalize(answer)) return { type: 'error', message: 'Type an answer first.' };
        if (riddle.answers.includes(normalize(answer))) {
            entry.solved = true;
            entry.points = possiblePoints(entry.hintsUsed);
            entry.solvedAt = new Date(now).toISOString();
            prepare(user, now);
            return { type: 'success', message: 'Correct! You earned ' + entry.points + ' points.' };
        }
        entry.wrongTries += 1;
        if (entry.wrongTries >= 3) {
            entry.lockedUntil = now + DAY;
            return { type: 'error', message: 'Three wrong tries. This clue is locked for 24 hours. You can try another clue.' };
        }
        return { type: 'error', message: 'Not quite. You have ' + (3 - entry.wrongTries) + ' tries left before this clue locks.' };
    }

    // Build a readable report using only account names and game results.
    // Passwords and other account fields are never copied into the report.
    function resultsText(users, exportedBy, now = Date.now()) {
        if (!Array.isArray(users)) throw new Error('Invalid saved account data.');
        const cleanName = name => String(name).replace(/[\r\n\t]/g, ' ');
        const players = users.filter(account => typeof account?.username === 'string').map(account => {
            const snapshot = {
                username: account.username,
                huntProgress: JSON.parse(JSON.stringify(account.huntProgress || {}))
            };
            return prepare(snapshot, now);
        });
        players.sort((a, b) => b.score - a.score || a.username.localeCompare(b.username));
        const date = new Date(now);
        const lines = [
            'MATADOR HUNT - GAME RESULTS',
            'Saved at: ' + date.toLocaleString() + ' (' + Intl.DateTimeFormat().resolvedOptions().timeZone + ')',
            'Exported by: ' + cleanName(exportedBy),
            'Accounts: ' + players.length,
            'Scope: Accounts saved in this browser on this website.',
            '',
            'LEADERBOARD',
            '-----------'
        ];
        if (!players.length) lines.push('No saved accounts.');
        players.forEach((player, index) => {
            lines.push((index + 1) + '. ' + cleanName(player.username) + ' | ' + player.score + ' points | ' + solvedCount(player) + '/' + riddles.length + ' solved');
        });
        lines.push('', 'ACCOUNT RESULTS', '---------------');
        players.forEach(player => {
            lines.push(
                '',
                'Username: ' + cleanName(player.username),
                'Total points: ' + player.score,
                'Riddles solved: ' + solvedCount(player) + '/' + riddles.length,
                'Hunt status: ' + (solvedCount(player) === riddles.length ? 'Complete' : 'Incomplete')
            );
            riddles.forEach((riddle, index) => {
                const entry = player.huntProgress[riddle.id];
                let status = entry.solved ? 'Solved' : 'Not solved';
                if (!entry.solved && entry.lockedUntil > now) {
                    status = 'Locked until ' + new Date(entry.lockedUntil).toLocaleString();
                }
                lines.push(
                    '  Clue ' + String(index + 1).padStart(2, '0') + ': ' + riddle.title,
                    '    ' + status + ' | Hints: ' + entry.hintsUsed + '/3 | Points: ' + entry.points
                );
            });
        });
        lines.push('', 'This is a results report. Passwords are not included.', 'It is not an account backup or an import file.', '');
        return lines.join('\r\n');
    }

    const api = { riddles, DAY, normalize, prepare, solvedCount, possiblePoints, act, resultsText };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.MatadorHunt = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
