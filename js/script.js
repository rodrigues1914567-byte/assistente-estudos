const API_URL = "https://assistente-estudos-fsq1.onrender.com/api/chat/";

const messagesContainer = document.querySelector(".messages");
const input = document.querySelector(".input-area input");
const sendButton = document.querySelector(".input-area button");
const suggestionButtons = document.querySelectorAll(".suggestions button");


/* =========================================================
   SEGURANÇA
   ========================================================= */

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}


/* =========================================================
   FORMATAÇÃO DAS RESPOSTAS DA IA
   ========================================================= */

function formatMessage(text) {
    let formattedText = escapeHtml(text);

    // Negrito: **texto**
    formattedText = formattedText.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    // Código: `código`
    formattedText = formattedText.replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
    );

    // Títulos simples: # Título
    formattedText = formattedText.replace(
        /^### (.*?)$/gm,
        "<h4>$1</h4>"
    );

    formattedText = formattedText.replace(
        /^## (.*?)$/gm,
        "<h3>$1</h3>"
    );

    formattedText = formattedText.replace(
        /^# (.*?)$/gm,
        "<h2>$1</h2>"
    );

    // Listas com hífen
    formattedText = formattedText.replace(
        /^- (.*?)$/gm,
        "• $1"
    );

    // Quebras de linha
    formattedText = formattedText.replace(/\n/g, "<br>");

    return formattedText;
}


/* =========================================================
   ADICIONAR MENSAGEM AO CHAT
   ========================================================= */

function addMessage(text, type) {
    const message = document.createElement("div");
    message.classList.add("message");

    const messageContent = document.createElement("div");
    messageContent.classList.add("message-content");

    const messageName = document.createElement("span");
    messageName.classList.add("message-name");

    const messageText = document.createElement("p");

    if (type === "user") {
        message.classList.add("user-message");

        messageName.textContent = "Você";
        messageText.textContent = text;

        messageContent.appendChild(messageName);
        messageContent.appendChild(messageText);

        message.appendChild(messageContent);

    } else {
        message.classList.add("assistant-message");

        const avatar = document.createElement("div");
        avatar.classList.add("message-avatar");
        avatar.textContent = "🤖";

        messageName.textContent = "Assistente";

        messageText.innerHTML = formatMessage(text);

        messageContent.appendChild(messageName);
        messageContent.appendChild(messageText);

        message.appendChild(avatar);
        message.appendChild(messageContent);
    }

    messagesContainer.appendChild(message);

    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}


/* =========================================================
   ENVIAR MENSAGEM
   ========================================================= */

async function sendMessage() {
    const text = input.value.trim();

    if (text === "") {
        return;
    }

    addMessage(text, "user");

    input.value = "";
    sendButton.disabled = true;

    try {
        const response = await fetch(API_URL, {
            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({
                message: text
            })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.error || "Erro ao processar a mensagem."
            );
        }

        if (!data.response) {
            throw new Error(
                "O servidor não retornou uma resposta válida."
            );
        }

        addMessage(data.response, "assistant");

    } catch (error) {
        console.error("Erro:", error);

        addMessage(
            "Não foi possível conectar ao servidor. Tente novamente em alguns segundos.",
            "assistant"
        );

    } finally {
        sendButton.disabled = false;
        input.focus();
    }
}


/* =========================================================
   BOTÃO ENVIAR
   ========================================================= */

sendButton.addEventListener("click", sendMessage);


/* =========================================================
   ENTER PARA ENVIAR
   ========================================================= */

input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
    }
});


/* =========================================================
   BOTÕES DE SUGESTÃO
   ========================================================= */

suggestionButtons.forEach((button) => {
    button.addEventListener("click", function () {
        const text = button.textContent.trim();

        const prompts = {
            "🧠 Explique um assunto":
                "Explique um assunto de forma simples e fácil de entender.",

            "📝 Crie exercícios":
                "Crie exercícios para eu praticar meus estudos.",

            "📖 Faça um resumo":
                "Faça um resumo de um assunto que estou estudando.",

            "💡 Tire uma dúvida":
                "Tenho uma dúvida sobre um assunto e gostaria de ajuda."
        };

        input.value = prompts[text] || "";
        input.focus();
    });
});
