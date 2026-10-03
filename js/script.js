"use strict";


/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const API_URL =
    "https://assistente-estudos-fsq1.onrender.com/api/chat/";

const MAX_MESSAGE_LENGTH = 4000;

const MAX_HISTORY_MESSAGES = 30;


/* =========================================================
   ELEMENTOS DA INTERFACE
   ========================================================= */

const messagesContainer =
    document.querySelector(".messages");

const input =
    document.querySelector(".input-area input");

const sendButton =
    document.querySelector(".input-area button");

const chatForm =
    document.querySelector("#chat-form");

const clearButton =
    document.querySelector(".menu-button");

const suggestionButtons =
    document.querySelectorAll(".suggestions button");


/* =========================================================
   HISTÓRICO DA CONVERSA
   ========================================================= */

const conversationHistory = [];


/* =========================================================
   ESTADO DA APLICAÇÃO
   ========================================================= */

let isSending = false;


/* =========================================================
   SEGURANÇA
   ========================================================= */

/*
 * Escapa o conteúdo antes de transformá-lo em HTML.
 * Isso impede que respostas da IA executem HTML ou JavaScript
 * diretamente dentro da página.
 */

function escapeHtml(text) {

    const div = document.createElement("div");

    div.textContent = String(text);

    return div.innerHTML;
}


/* =========================================================
   FORMATAÇÃO DAS RESPOSTAS
   ========================================================= */

function formatMessage(text) {

    let formattedText =
        escapeHtml(text);


    /*
     * Negrito
     */

    formattedText =
        formattedText.replace(
            /\*\*(.*?)\*\*/g,
            "<strong>$1</strong>"
        );


    /*
     * Código inline
     */

    formattedText =
        formattedText.replace(
            /`([^`]+)`/g,
            "<code>$1</code>"
        );


    /*
     * Títulos Markdown
     */

    formattedText =
        formattedText.replace(
            /^### (.*?)$/gm,
            "<h4>$1</h4>"
        );

    formattedText =
        formattedText.replace(
            /^## (.*?)$/gm,
            "<h3>$1</h3>"
        );

    formattedText =
        formattedText.replace(
            /^# (.*?)$/gm,
            "<h2>$1</h2>"
        );


    /*
     * Listas com hífen
     */

    formattedText =
        formattedText.replace(
            /^- (.*?)$/gm,
            "• $1"
        );


    /*
     * Quebras de linha
     */

    formattedText =
        formattedText.replace(
            /\n/g,
            "<br>"
        );


    return formattedText;
}


/* =========================================================
   ADICIONAR MENSAGEM AO CHAT
   ========================================================= */

function addMessage(text, type) {

    const message =
        document.createElement("div");

    message.classList.add(
        "message"
    );


    const messageContent =
        document.createElement("div");

    messageContent.classList.add(
        "message-content"
    );


    const messageName =
        document.createElement("span");

    messageName.classList.add(
        "message-name"
    );


    const messageText =
        document.createElement("p");


    if (type === "user") {

        message.classList.add(
            "user-message"
        );

        messageName.textContent =
            "Você";

        messageText.textContent =
            text;


        messageContent.appendChild(
            messageName
        );

        messageContent.appendChild(
            messageText
        );

        message.appendChild(
            messageContent
        );

    } else {

        message.classList.add(
            "assistant-message"
        );


        const avatar =
            document.createElement("div");

        avatar.classList.add(
            "message-avatar"
        );

        avatar.setAttribute(
            "aria-hidden",
            "true"
        );

        avatar.textContent =
            "🤖";


        messageName.textContent =
            "Assistente";


        messageText.innerHTML =
            formatMessage(text);


        messageContent.appendChild(
            messageName
        );

        messageContent.appendChild(
            messageText
        );


        message.appendChild(
            avatar
        );

        message.appendChild(
            messageContent
        );
    }


    messagesContainer.appendChild(
        message
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;
}


/* =========================================================
   INDICADOR DE CARREGAMENTO
   ========================================================= */

function showLoading() {

    const loadingMessage =
        document.createElement("div");


    loadingMessage.classList.add(
        "message",
        "assistant-message",
        "loading-message"
    );


    loadingMessage.setAttribute(
        "aria-label",
        "Assistente está processando a resposta"
    );


    loadingMessage.innerHTML = `
        <div
            class="message-avatar"
            aria-hidden="true"
        >
            🤖
        </div>

        <div class="message-content">

            <span class="message-name">
                Assistente
            </span>

            <p
                class="loading-text"
                aria-hidden="true"
            >
                <span></span>
                <span></span>
                <span></span>
            </p>

        </div>
    `;


    messagesContainer.appendChild(
        loadingMessage
    );


    messagesContainer.scrollTop =
        messagesContainer.scrollHeight;


    return loadingMessage;
}


/* =========================================================
   CONTROLE DO BOTÃO
   ========================================================= */

function setSendingState(sending) {

    isSending = sending;

    sendButton.disabled =
        sending;

    input.disabled =
        sending;

    suggestionButtons.forEach(
        (button) => {
            button.disabled =
                sending;
        }
    );
}


/* =========================================================
   HISTÓRICO
   ========================================================= */

function addToHistory(role, content) {

    conversationHistory.push({
        role,
        content
    });


    /*
     * Mantém somente as últimas mensagens.
     * Evita que a requisição cresça indefinidamente.
     */

    if (
        conversationHistory.length >
        MAX_HISTORY_MESSAGES
    ) {

        conversationHistory.splice(
            0,
            conversationHistory.length -
            MAX_HISTORY_MESSAGES
        );
    }
}


/* =========================================================
   LIMPAR CONVERSA
   ========================================================= */

function clearConversation() {

    if (isSending) {
        return;
    }


    const confirmed =
        window.confirm(
            "Deseja limpar a conversa atual?"
        );


    if (!confirmed) {
        return;
    }


    conversationHistory.length = 0;


    /*
     * Remove todas as mensagens criadas
     * depois da mensagem inicial.
     */

    const dynamicMessages =
        messagesContainer.querySelectorAll(
            ".message:not(.assistant-message:first-child)"
        );


    dynamicMessages.forEach(
        (message) => {
            message.remove();
        }
    );


    /*
     * Garante que a mensagem inicial
     * continue existindo.
     */

    const firstMessage =
        messagesContainer.querySelector(
            ".message.assistant-message"
        );


    if (!firstMessage) {

        const welcomeMessage =
            document.createElement("div");

        welcomeMessage.className =
            "message assistant-message";

        welcomeMessage.innerHTML = `
            <div
                class="message-avatar"
                aria-hidden="true"
            >
                🤖
            </div>

            <div class="message-content">

                <span class="message-name">
                    Assistente
                </span>

                <p>
                    Olá! 👋
                    <br><br>
                    Sou seu assistente de estudos.
                    Pode me perguntar sobre qualquer
                    assunto que esteja estudando.
                </p>

            </div>
        `;

        messagesContainer.prepend(
            welcomeMessage
        );
    }


    /*
     * Recoloca as sugestões.
     */

    const existingSuggestions =
        messagesContainer.querySelector(
            ".suggestions"
        );


    if (!existingSuggestions) {

        const suggestions =
            document.createElement("div");

        suggestions.className =
            "suggestions";

        suggestions.innerHTML = `
            <button type="button">
                🧠 Explique um assunto
            </button>

            <button type="button">
                📝 Crie exercícios
            </button>

            <button type="button">
                📖 Faça um resumo
            </button>

            <button type="button">
                💡 Tire uma dúvida
            </button>
        `;

        messagesContainer.appendChild(
            suggestions
        );
    }


    input.value = "";

    input.disabled = false;

    sendButton.disabled = false;

    input.focus();
}


/* =========================================================
   ENVIAR MENSAGEM
   ========================================================= */

async function sendMessage() {

    if (isSending) {
        return;
    }


    const text =
        input.value.trim();


    if (!text) {
        input.focus();
        return;
    }


    if (
        text.length >
        MAX_MESSAGE_LENGTH
    ) {

        addMessage(
            "Sua mensagem é muito longa. Tente enviar uma mensagem com até 4.000 caracteres.",
            "assistant"
        );

        return;
    }


    /*
     * Mostra a mensagem do usuário.
     */

    addMessage(
        text,
        "user"
    );


    input.value = "";

    setSendingState(true);


    /*
     * Mostra o carregamento.
     */

    const loadingMessage =
        showLoading();


    try {

        const response =
            await fetch(
                API_URL,
                {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        message: text,

                        messages:
                            conversationHistory
                    })
                }
            );


        /*
         * Tenta interpretar a resposta
         * como JSON.
         */

        let data;

        try {

            data =
                await response.json();

        } catch (jsonError) {

            throw new Error(
                "O servidor retornou uma resposta inválida."
            );
        }


        /*
         * Verifica erros HTTP.
         */

        if (!response.ok) {

            throw new Error(
                data.error ||
                "Erro ao processar a mensagem."
            );
        }


        /*
         * Verifica se a API retornou
         * uma resposta válida.
         */

        if (
            !data ||
            typeof data.response !== "string" ||
            !data.response.trim()
        ) {

            throw new Error(
                "O servidor não retornou uma resposta válida."
            );
        }


        /*
         * Remove o carregamento.
         */

        loadingMessage.remove();


        /*
         * Salva a pergunta.
         */

        addToHistory(
            "user",
            text
        );


        /*
         * Mostra a resposta.
         */

        addMessage(
            data.response,
            "assistant"
        );


        /*
         * Salva a resposta da IA.
         */

        addToHistory(
            "assistant",
            data.response
        );


    } catch (error) {

        console.error(
            "Erro ao enviar mensagem:",
            error
        );


        /*
         * Remove o carregamento
         * se ele ainda estiver na página.
         */

        if (
            loadingMessage &&
            loadingMessage.isConnected
        ) {
            loadingMessage.remove();
        }


        addMessage(
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente em alguns segundos.",
            "assistant"
        );


    } finally {

        setSendingState(false);

        input.focus();
    }
}


/* =========================================================
   FORMULÁRIO
   ========================================================= */

chatForm.addEventListener(
    "submit",
    function (event) {

        event.preventDefault();

        sendMessage();
    }
);


/* =========================================================
   LIMPAR CONVERSA
   ========================================================= */

clearButton.addEventListener(
    "click",
    clearConversation
);


/* =========================================================
   BOTÕES DE SUGESTÃO
   ========================================================= */

function setupSuggestionButtons() {

    const buttons =
        document.querySelectorAll(
            ".suggestions button"
        );


    buttons.forEach(
        (button) => {

            button.addEventListener(
                "click",
                function () {

                    if (isSending) {
                        return;
                    }


                    const text =
                        button.textContent.trim();


                    const prompts = {

                        "🧠 Explique um assunto":
                            "Explique um assunto de forma simples e fácil de entender. Primeiro pergunte qual assunto eu quero estudar.",

                        "📝 Crie exercícios":
                            "Quero praticar. Pergunte qual assunto estou estudando e depois crie exercícios adequados para eu responder.",

                        "📖 Faça um resumo":
                            "Quero fazer um resumo. Pergunte qual assunto ou texto estou estudando e depois faça um resumo claro e organizado.",

                        "💡 Tire uma dúvida":
                            "Tenho uma dúvida sobre um assunto. Ajude-me a entender o conteúdo de forma simples."
                    };


                    input.value =
                        prompts[text] || "";


                    input.focus();
                }
            );
        }
    );
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

setupSuggestionButtons();

input.focus();
