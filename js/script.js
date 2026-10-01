const messagesContainer = document.querySelector(".messages");
const input = document.querySelector(".input-area input");
const sendButton = document.querySelector(".input-area button");
const suggestionButtons = document.querySelectorAll(".suggestions button");

function addMessage(text, type) {
    const message = document.createElement("div");
    message.classList.add("message");

    if (type === "user") {
        message.classList.add("user-message");

        message.innerHTML = `
            <div class="message-content">
                <span class="message-name">Você</span>
                <p>${text}</p>
            </div>
        `;
    } else {
        message.classList.add("assistant-message");

        message.innerHTML = `
            <div class="message-avatar">🤖</div>
            <div class="message-content">
                <span class="message-name">Assistente</span>
                <p>${text}</p>
            </div>
        `;
    }

    messagesContainer.appendChild(message);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function sendMessage() {
    const text = input.value.trim();

    if (text === "") {
        return;
    }

    addMessage(text, "user");

    input.value = "";

    setTimeout(() => {
        addMessage(
            "Recebi sua pergunta! A conexão com a Inteligência Artificial será adicionada na próxima etapa.",
            "assistant"
        );
    }, 600);
}

sendButton.addEventListener("click", sendMessage);

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        sendMessage();
    }
});

suggestionButtons.forEach((button) => {
    button.addEventListener("click", function () {
        const text = button.textContent.trim();

        const prompts = {
            "🧠 Explique um assunto": "Explique um assunto de forma simples e fácil de entender.",
            "📝 Crie exercícios": "Crie exercícios para eu praticar meus estudos.",
            "📖 Faça um resumo": "Faça um resumo de um assunto que estou estudando.",
            "💡 Tire uma dúvida": "Tenho uma dúvida sobre um assunto e gostaria de ajuda."
        };

        input.value = prompts[text] || "";
        input.focus();
    });
});
