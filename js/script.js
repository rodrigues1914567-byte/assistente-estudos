"use strict";

/* =========================================================
   CONFIGURAÇÃO
   ========================================================= */

const API_URL =
    "https://assistente-estudos-fsq1.onrender.com/api/chat/";

const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 30;
const REQUEST_TIMEOUT = 120000;


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
   VERIFICAÇÃO INICIAL
   ========================================================= */

if (
    !messagesContainer ||
    !input ||
    !sendButton ||
    !chatForm ||
    !clearButton
) {
    console.error(
        "Assistente de Estudos: elementos essenciais da interface não foram encontrados."
    );
}


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
 *
 * Isso impede que uma resposta contendo HTML ou JavaScript
 * seja executada diretamente dentro da página.
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
    let formattedText = escapeHtml(text);

    /*
     * Código em bloco
     *
     * Deve ser tratado antes do código inline para evitar
     * conflitos entre os dois formatos.
     */

    formattedText = formattedText.replace(
        /```([\s\S]*?)```/g,
        '<pre><code>$1</code></pre>'
    );

    /*
     * Código inline
     */

    formattedText = formattedText.replace(
        /`([^`\n]+)`/g,
        "<code>$1</code>"
    );

    /*
     * Negrito
     */

    formattedText = formattedText.replace(
        /\*\*(.*?)\*\*/g,
        "<strong>$1</strong>"
    );

    /*
     * Títulos Markdown
     */

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

    /*
     * Listas com hífen
     */

    formattedText = formattedText.replace(
        /^- (.*?)$/gm,
        "• $1"
    );

    /*
     * Quebras de linha
     */

    formattedText = formattedText.replace(
        /\n/g,
        "<br>"
    );

    return formattedText;
}


/* =========================================================
   ADICIONAR MENSAGEM AO CHAT
   ========================================================= */

function addMessage(text, type) {
    if (!messagesContainer) {
        return;
    }

    const message =
        document.createElement("div");

    message.classList.add("message");

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


    /* ---------------------------------------------------------
       MENSAGEM DO USUÁRIO
       --------------------------------------------------------- */

    if (type === "user") {
        message.classList.add(
            "user-message"
        );

        messageName.textContent =
            "Você";

        messageText.textContent =
            String(text);

        messageContent.appendChild(
            messageName
        );

        messageContent.appendChild(
            messageText
        );

        message.appendChild(
            messageContent
        );
    }


    /* ---------------------------------------------------------
       MENSAGEM DO ASSISTENTE
       --------------------------------------------------------- */

    else {
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


    /* ---------------------------------------------------------
       ADICIONA AO CHAT
       --------------------------------------------------------- */

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
    if (!messagesContainer) {
        return null;
    }

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
   CONTROLE DO ESTADO DE ENVIO
   ========================================================= */

function setSendingState(sending) {
    isSending = sending;

    if (sendButton) {
        sendButton.disabled =
            sending;
    }

    if (input) {
        input.disabled =
            sending;
    }

    suggestionButtons.forEach(
        (button) => {
            button.disabled =
                sending;
        }
    );

    if (clearButton) {
        clearButton.disabled =
            sending;
    }
}


/* =========================================================
   HISTÓRICO
   ========================================================= */

function addToHistory(role, content) {
    if (
        role !== "user" &&
        role !== "assistant"
    ) {
        return;
    }

    if (
        typeof content !== "string" ||
        !content.trim()
    ) {
        return;
    }

    conversationHistory.push({
        role,
        content
    });

    /*
     * Mantém somente as últimas mensagens.
     *
     * Isso evita que o histórico cresça indefinidamente.
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

    /*
     * Limpa completamente o histórico enviado
     * para a IA.
     */

    conversationHistory.length = 0;

    /*
     * Localiza todas as mensagens.
     *
     * A primeira mensagem é a mensagem inicial
     * do assistente.
     *
     * Todas as seguintes são mensagens criadas
     * durante a conversa.
     */

    if (messagesContainer) {
        const messages =
            messagesContainer.querySelectorAll(
                ".message"
            );

        messages.forEach(
            (message, index) => {
                if (index > 0) {
                    message.remove();
                }
            }
        );
    }

    /*
     * Limpa o campo de entrada.
     */

    if (input) {
        input.value = "";
        input.disabled = false;
        input.focus();
    }

    /*
     * Garante que o botão de envio volte
     * ao estado normal.
     */

    if (sendButton) {
        sendButton.disabled = false;
    }

    /*
     * Garante que os botões de sugestão
     * também voltem ao estado normal.
     */

    suggestionButtons.forEach(
        (button) => {
            button.disabled = false;
        }
    );

    /*
     * O botão de limpar também volta ao estado normal.
     */

    if (clearButton) {
        clearButton.disabled = false;
    }
}


/* =========================================================
   ENVIAR MENSAGEM
   ========================================================= */

async function sendMessage() {
    if (isSending) {
        return;
    }

    if (!input) {
        return;
    }

    const text =
        input.value.trim();


    /* ---------------------------------------------------------
       VALIDAÇÃO DE MENSAGEM VAZIA
       --------------------------------------------------------- */

    if (!text) {
        input.focus();
        return;
    }


    /* ---------------------------------------------------------
       VALIDAÇÃO DO TAMANHO
       --------------------------------------------------------- */

    if (
        text.length >
        MAX_MESSAGE_LENGTH
    ) {
        addMessage(
            "Sua mensagem é muito longa. Tente enviar uma mensagem com até 4.000 caracteres.",
            "assistant"
        );

        input.focus();

        return;
    }


    /* ---------------------------------------------------------
       MOSTRA A MENSAGEM DO USUÁRIO
       --------------------------------------------------------- */

    addMessage(
        text,
        "user"
    );

    input.value = "";

    setSendingState(true);


    /* ---------------------------------------------------------
       MOSTRA CARREGAMENTO
       --------------------------------------------------------- */

    const loadingMessage =
        showLoading();


    /* ---------------------------------------------------------
       CONTROLE DE TEMPO DA REQUISIÇÃO
       --------------------------------------------------------- */

    const controller =
        new AbortController();

    const timeoutId =
        setTimeout(
            () => {
                controller.abort();
            },
            REQUEST_TIMEOUT
        );


    try {
        /* -----------------------------------------------------
           REQUISIÇÃO PARA O BACKEND
           ----------------------------------------------------- */

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
                    }),

                    signal:
                        controller.signal
                }
            );


        /* -----------------------------------------------------
           CANCELA O TIMER
           ----------------------------------------------------- */

        clearTimeout(
            timeoutId
        );


        /* -----------------------------------------------------
           TENTA LER O JSON
           ----------------------------------------------------- */

        let data;

        try {
            data =
                await response.json();
        } catch (jsonError) {
            throw new Error(
                "O servidor retornou uma resposta inválida."
            );
        }


        /* -----------------------------------------------------
           VERIFICA STATUS HTTP
           ----------------------------------------------------- */

        if (!response.ok) {
            throw new Error(
                data &&
                typeof data.error === "string"
                    ? data.error
                    : "Erro ao processar a mensagem."
            );
        }


        /* -----------------------------------------------------
           VERIFICA RESPOSTA DA IA
           ----------------------------------------------------- */

        if (
            !data ||
            typeof data.response !== "string" ||
            !data.response.trim()
        ) {
            throw new Error(
                "O servidor não retornou uma resposta válida."
            );
        }


        /* -----------------------------------------------------
           REMOVE CARREGAMENTO
           ----------------------------------------------------- */

        if (
            loadingMessage &&
            loadingMessage.isConnected
        ) {
            loadingMessage.remove();
        }


        /* -----------------------------------------------------
           SALVA PERGUNTA NO HISTÓRICO
           ----------------------------------------------------- */

        addToHistory(
            "user",
            text
        );


        /* -----------------------------------------------------
           MOSTRA RESPOSTA
           ----------------------------------------------------- */

        addMessage(
            data.response,
            "assistant"
        );


        /* -----------------------------------------------------
           SALVA RESPOSTA NO HISTÓRICO
           ----------------------------------------------------- */

        addToHistory(
            "assistant",
            data.response
        );

    } catch (error) {
        /* -----------------------------------------------------
           CANCELA TIMER CASO A REQUISIÇÃO TERMINE POR ERRO
           ----------------------------------------------------- */

        clearTimeout(
            timeoutId
        );


        /* -----------------------------------------------------
           REMOVE CARREGAMENTO
           ----------------------------------------------------- */

        if (
            loadingMessage &&
            loadingMessage.isConnected
        ) {
            loadingMessage.remove();
        }


        /* -----------------------------------------------------
           IDENTIFICA TIPO DE ERRO
           ----------------------------------------------------- */

        let errorMessage =
            "Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente em alguns segundos.";

        if (
            error &&
            error.name === "AbortError"
        ) {
            errorMessage =
                "A resposta demorou mais do que o esperado. O servidor pode estar iniciando. Tente novamente em alguns segundos.";
        }

        console.error(
            "Erro ao enviar mensagem:",
            error
        );


        /* -----------------------------------------------------
           MOSTRA ERRO AO USUÁRIO
           ----------------------------------------------------- */

        addMessage(
            errorMessage,
            "assistant"
        );

    } finally {
        /* -----------------------------------------------------
           RESTAURA INTERFACE
           ----------------------------------------------------- */

        clearTimeout(
            timeoutId
        );

        setSendingState(false);

        if (input) {
            input.focus();
        }
    }
}


/* =========================================================
   FORMULÁRIO DO CHAT
   ========================================================= */

if (chatForm) {
    chatForm.addEventListener(
        "submit",
        function (event) {
            event.preventDefault();

            sendMessage();
        }
    );
}


/* =========================================================
   BOTÃO DE LIMPAR CONVERSA
   ========================================================= */

if (clearButton) {
    clearButton.addEventListener(
        "click",
        clearConversation
    );
}


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

                    if (input) {
                        input.value =
                            prompts[text] || "";

                        input.focus();
                    }
                }
            );
        }
    );
}


/* =========================================================
   INICIALIZAÇÃO
   ========================================================= */

setupSuggestionButtons();

if (input) {
    input.focus();
}
