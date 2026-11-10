const form = document.getElementById("loginForm");
const message = document.getElementById("loginMessage");

form.addEventListener("submit", function (event) {
    event.preventDefault();

    const username = form.elements.username.value.trim();
    const password = form.elements.password.value;

    try {
        // Read accounts saved during sign-up.
        const users = JSON.parse(
            localStorage.getItem("matadorUsers") || "[]"
        );

        if (!Array.isArray(users)) {
            throw new Error("Invalid saved account data.");
        }

        // Find an account with a matching username and password.
        const user = users.find(account =>
            account.username.toLowerCase() === username.toLowerCase() &&
            account.password === password
        );

        if (!user) {
            message.textContent = "Incorrect username or password.";
            return;
        }

        // Remember who is signed in for this browser tab.
        sessionStorage.setItem("currentUser", user.username);

        message.textContent =
            "Signed in as " + user.username +
            "! Your score: " + user.score;

        form.elements.password.value = "";
    } catch (error) {
        message.textContent =
            "Could not sign in. Check your browser storage.";

        console.error(error);
    }
});