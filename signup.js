const form = document.getElementById("signupForm");
const message = document.getElementById("message");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;

    if (username.length < 5) {
        message.textContent = "Username must have at least 5 characters.";
        return;
    }

    if (password.length < 8) {
        message.textContent = "Password must have at least 8 characters.";
        return;
    }

    if (password !== confirmation) {
        message.textContent = "Passwords do not match.";
        return;
    }

    try {
        // Get saved accounts, or start with an empty array.
        const users = JSON.parse(
            localStorage.getItem("matadorUsers") || "[]"
        );

        if (!Array.isArray(users)) {
            throw new Error("Invalid saved account data.");
        }

        // Check whether the username is already taken.
        const exists = users.some(user =>
            user.username.toLowerCase() === username.toLowerCase()
        );

        if (exists) {
            message.textContent = "That username is already taken.";
            return;
        }

        // Add the new account.
        users.push({
            username: username,
            password: password,
            score: 0
        });

        // Save the accounts as JSON in browser storage.
        localStorage.setItem("matadorUsers", JSON.stringify(users));

        message.textContent = "Account created! You can return to login.";
        form.reset();
    } catch (error) {
        message.textContent = "Could not save the account.";
        console.error(error);
    }
});