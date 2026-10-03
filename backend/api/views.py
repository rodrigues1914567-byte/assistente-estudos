import json
import logging
import os
import time
from threading import Lock

from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
)


logger = logging.getLogger(__name__)


# =========================================================
# CONFIGURAÇÃO DA IA
# =========================================================

SYSTEM_PROMPT = (
    "Você é um assistente de estudos prestativo. "
    "Responda de forma simples, clara e objetiva. "
    "Ajude o estudante a compreender os assuntos, "
    "sem apenas entregar respostas quando for possível "
    "explicar o raciocínio."
)

MODEL_NAME = "openai/gpt-4o-mini"


# =========================================================
# LIMITES
# =========================================================

MAX_MESSAGE_LENGTH = 4000
MAX_HISTORY_MESSAGES = 30
MAX_HISTORY_ITEM_LENGTH = 4000
MAX_REQUEST_BODY_BYTES = 250_000
MAX_RESPONSE_LENGTH = 16_000

ALLOWED_REQUEST_FIELDS = {
    "message",
    "messages",
}


# =========================================================
# OPENROUTER
# =========================================================

OPENROUTER_TIMEOUT_SECONDS = 90.0
OPENROUTER_MAX_RETRIES = 2


# =========================================================
# RATE LIMIT
# =========================================================

RATE_LIMIT_WINDOW_SECONDS = 60
RATE_LIMIT_MAX_REQUESTS = 10

RATE_LIMIT_LOCK = Lock()


# =========================================================
# RESPOSTAS DE ERRO
# =========================================================

def error_response(message, status, headers=None):
    response = JsonResponse(
        {
            "error": message
        },
        status=status,
        json_dumps_params={
            "ensure_ascii": False
        }
    )

    if headers:
        for name, value in headers.items():
            response[name] = value

    return response


# =========================================================
# IP DO CLIENTE
# =========================================================

def get_client_ip(request):
    forwarded_for = request.META.get(
        "HTTP_X_FORWARDED_FOR",
        ""
    )

    if forwarded_for:
        client_ip = (
            forwarded_for
            .split(",")[0]
            .strip()
        )

        if client_ip:
            return client_ip

    return request.META.get(
        "REMOTE_ADDR",
        "unknown"
    )


# =========================================================
# RATE LIMIT
# =========================================================

def is_rate_limited(request):
    client_ip = get_client_ip(request)

    key = (
        "chat-rate:"
        + client_ip
    )

    now = int(time.time())

    with RATE_LIMIT_LOCK:
        bucket = cache.get(key)

        if (
            not isinstance(bucket, dict)
            or "started_at" not in bucket
            or "count" not in bucket
            or (
                now - bucket["started_at"]
                >= RATE_LIMIT_WINDOW_SECONDS
            )
        ):
            cache.set(
                key,
                {
                    "started_at": now,
                    "count": 1
                },
                timeout=RATE_LIMIT_WINDOW_SECONDS
            )

            return False

        try:
            count = int(bucket["count"])
            started_at = int(bucket["started_at"])
        except (TypeError, ValueError):
            cache.set(
                key,
                {
                    "started_at": now,
                    "count": 1
                },
                timeout=RATE_LIMIT_WINDOW_SECONDS
            )

            return False

        if (
            now - started_at
            >= RATE_LIMIT_WINDOW_SECONDS
        ):
            cache.set(
                key,
                {
                    "started_at": now,
                    "count": 1
                },
                timeout=RATE_LIMIT_WINDOW_SECONDS
            )

            return False

        if count >= RATE_LIMIT_MAX_REQUESTS:
            return True

        cache.set(
            key,
            {
                "started_at": started_at,
                "count": count + 1
            },
            timeout=(
                RATE_LIMIT_WINDOW_SECONDS
                - max(0, now - started_at)
            )
        )

    return False


# =========================================================
# BODY DA REQUEST
# =========================================================

def get_request_body(request):
    content_length = request.META.get(
        "CONTENT_LENGTH"
    )

    if content_length:
        try:
            if (
                int(content_length)
                > MAX_REQUEST_BODY_BYTES
            ):
                return (
                    None,
                    error_response(
                        "A requisição é muito grande.",
                        413
                    )
                )
        except (TypeError, ValueError):
            return (
                None,
                error_response(
                    "Tamanho de requisição inválido.",
                    400
                )
            )

    try:
        body = request.body
    except Exception:
        logger.warning(
            "Não foi possível ler o corpo da requisição."
        )

        return (
            None,
            error_response(
                "Não foi possível processar a requisição.",
                400
            )
        )

    if len(body) > MAX_REQUEST_BODY_BYTES:
        return (
            None,
            error_response(
                "A requisição é muito grande.",
                413
            )
        )

    try:
        return (
            json.loads(body),
            None
        )
    except (
        json.JSONDecodeError,
        UnicodeDecodeError
    ):
        return (
            None,
            error_response(
                "JSON inválido.",
                400
            )
        )


# =========================================================
# MENSAGENS PARA A IA
# =========================================================

def build_messages(history, current_message):
    messages = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT
        }
    ]

    valid_history = []

    for item in history:
        if not isinstance(item, dict):
            continue

        role = item.get("role")
        content = item.get("content")

        if role not in (
            "user",
            "assistant"
        ):
            continue

        if not isinstance(content, str):
            continue

        content = content.strip()

        if not content:
            continue

        if len(content) > MAX_HISTORY_ITEM_LENGTH:
            continue

        valid_history.append(
            {
                "role": role,
                "content": content
            }
        )

    valid_history = (
        valid_history[
            -MAX_HISTORY_MESSAGES:
        ]
    )

    messages.extend(valid_history)

    messages.append(
        {
            "role": "user",
            "content": current_message
        }
    )

    return messages


# =========================================================
# ORIGIN
# =========================================================

def origin_is_allowed(request):
    frontend_origin = os.environ.get(
        "FRONTEND_ORIGIN",
        "https://rodrigues1914567-byte.github.io"
    ).strip().rstrip("/")

    origin = request.headers.get(
        "Origin",
        ""
    ).strip().rstrip("/")

    if not frontend_origin or not origin:
        return False

    return origin == frontend_origin


# =========================================================
# CONTENT TYPE
# =========================================================

def content_type_is_allowed(request):
    content_type = request.headers.get(
        "Content-Type",
        ""
    ).lower()

    return content_type.split(";")[0].strip() == (
        "application/json"
    )


# =========================================================
# CHAT
# =========================================================

@csrf_exempt
def chat(request):

    # -----------------------------------------------------
    # MÉTODO
    # -----------------------------------------------------

    if request.method != "POST":
        return error_response(
            "Método não permitido.",
            405,
            headers={
                "Allow": "POST"
            }
        )

    # -----------------------------------------------------
    # ORIGEM
    # -----------------------------------------------------

    if not origin_is_allowed(request):
        return error_response(
            "Origem não autorizada.",
            403
        )

    # -----------------------------------------------------
    # CONTENT TYPE
    # -----------------------------------------------------

    if not content_type_is_allowed(request):
        return error_response(
            "Content-Type não permitido.",
            415
        )

    # -----------------------------------------------------
    # RATE LIMIT
    # -----------------------------------------------------

    if is_rate_limited(request):
        return error_response(
            (
                "Muitas solicitações. "
                "Aguarde um minuto e tente novamente."
            ),
            429,
            headers={
                "Retry-After": str(
                    RATE_LIMIT_WINDOW_SECONDS
                )
            }
        )

    # -----------------------------------------------------
    # JSON
    # -----------------------------------------------------

    data, error = get_request_body(request)

    if error:
        return error

    if not isinstance(data, dict):
        return error_response(
            (
                "O corpo da requisição "
                "deve ser um objeto JSON."
            ),
            400
        )

    # -----------------------------------------------------
    # CAMPOS PERMITIDOS
    # -----------------------------------------------------

    unexpected_fields = (
        set(data.keys())
        - ALLOWED_REQUEST_FIELDS
    )

    if unexpected_fields:
        return error_response(
            "A requisição contém campos não permitidos.",
            400
        )

    # -----------------------------------------------------
    # CAMPOS
    # -----------------------------------------------------

    message = data.get(
        "message",
        ""
    )

    history = data.get(
        "messages",
        []
    )

    # -----------------------------------------------------
    # MESSAGE
    # -----------------------------------------------------

    if not isinstance(message, str):
        return error_response(
            "A mensagem deve ser um texto.",
            400
        )

    message = message.strip()

    if not message:
        return error_response(
            "A mensagem não pode estar vazia.",
            400
        )

    if len(message) > MAX_MESSAGE_LENGTH:
        return error_response(
            "A mensagem é muito longa.",
            400
        )

    # -----------------------------------------------------
    # HISTORY
    # -----------------------------------------------------

    if not isinstance(history, list):
        return error_response(
            "O histórico da conversa é inválido.",
            400
        )

    history = (
        history[
            -MAX_HISTORY_MESSAGES:
        ]
    )

    # -----------------------------------------------------
    # API KEY
    # -----------------------------------------------------

    api_key = os.environ.get(
        "OPENROUTER_API_KEY"
    )

    if not api_key:
        logger.error(
            "OPENROUTER_API_KEY não configurada."
        )

        return error_response(
            "O serviço de IA não está configurado.",
            500
        )

    # -----------------------------------------------------
    # OPENROUTER
    # -----------------------------------------------------

    try:
        client = OpenAI(
            api_key=api_key,
            base_url=(
                "https://openrouter.ai/api/v1"
            ),
            timeout=OPENROUTER_TIMEOUT_SECONDS,
            max_retries=OPENROUTER_MAX_RETRIES
        )

        response = (
            client
            .chat
            .completions
            .create(
                model=MODEL_NAME,
                messages=build_messages(
                    history,
                    message
                )
            )
        )

        # -------------------------------------------------
        # RESPONSE VALIDATION
        # -------------------------------------------------

        if not response.choices:
            logger.error(
                "A OpenRouter retornou zero escolhas."
            )

            return error_response(
                (
                    "A IA não retornou "
                    "uma resposta válida."
                ),
                502
            )

        answer = (
            response
            .choices[0]
            .message
            .content
        )

        if not isinstance(answer, str):
            logger.error(
                "A OpenRouter retornou conteúdo inválido."
            )

            return error_response(
                (
                    "A IA não retornou "
                    "uma resposta válida."
                ),
                502
            )

        answer = answer.strip()

        if not answer:
            logger.error(
                "A OpenRouter retornou resposta vazia."
            )

            return error_response(
                "A IA não retornou uma resposta.",
                502
            )

        # -------------------------------------------------
        # LIMITE DE RESPOSTA
        # -------------------------------------------------

        answer = (
            answer[
                :MAX_RESPONSE_LENGTH
            ]
            .rstrip()
        )

        # -------------------------------------------------
        # RESPONSE
        # -------------------------------------------------

        return JsonResponse(
            {
                "response": answer
            },
            json_dumps_params={
                "ensure_ascii": False
            }
        )

    # -----------------------------------------------------
    # TIMEOUT
    # -----------------------------------------------------

    except APITimeoutError:
        logger.warning(
            "Timeout ao consultar a OpenRouter."
        )

        return error_response(
            (
                "A IA demorou muito "
                "para responder. "
                "Tente novamente."
            ),
            504
        )

    # -----------------------------------------------------
    # CONNECTION
    # -----------------------------------------------------

    except APIConnectionError:
        logger.exception(
            "Erro de conexão com a OpenRouter."
        )

        return error_response(
            (
                "Não foi possível conectar "
                "ao serviço de IA. "
                "Tente novamente."
            ),
            502
        )

    # -----------------------------------------------------
    # API STATUS
    # -----------------------------------------------------

    except APIStatusError as error:
        logger.error(
            (
                "Erro da OpenRouter. "
                "status=%s request_id=%s"
            ),
            error.status_code,
            getattr(
                error,
                "request_id",
                None
            )
        )

        return error_response(
            (
                "O serviço de IA recusou "
                "ou não conseguiu processar "
                "a solicitação."
            ),
            502
        )

    # -----------------------------------------------------
    # ERRO INESPERADO
    # -----------------------------------------------------

    except Exception:
        logger.exception(
            "Erro inesperado no endpoint /api/chat/."
        )

        return error_response(
            (
                "Não foi possível "
                "obter uma resposta da IA."
            ),
            500
        )
