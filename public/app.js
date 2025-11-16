let avatar = {
    name: "",
    x: 50,
    y: 50,
    color: "#00ffea",
    city: "Starter City"
};

function enterWorld() {
    const nameInput = document.getElementById("avatarName").value.trim();
    if (!nameInput) return alert("Enter a name!");

    avatar.name = nameInput;

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("world").classList.remove("hidden");

    startGame();
}

function goToCity(cityName) {
    avatar.city = cityName;
    document.getElementById("locationText").innerText = "Location: " + cityName;
}

function startGame() {
    const canvas = document.getElementById("gameCanvas");
    const ctx = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = 400;

    document.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp") avatar.y -= 5;
        if (e.key === "ArrowDown") avatar.y += 5;
        if (e.key === "ArrowLeft") avatar.x -= 5;
        if (e.key === "ArrowRight") avatar.x += 5;
    });

    function loop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = avatar.color;
        ctx.fillRect(avatar.x, avatar.y, 30, 30);

        requestAnimationFrame(loop);
    }

    loop();
}

function sendChat(event) {
    if (event.key === "Enter") {
        const input = document.getElementById("chatInput");
        const msg = input.value.trim();
        if (msg === "") return;

        const messages = document.getElementById("messages");
        const p = document.createElement("p");
        p.innerText = avatar.name + ": " + msg;
        messages.appendChild(p);

        input.value = "";
        messages.scrollTop = messages.scrollHeight;
    }
}

