import json
import logging
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openai import (
    APIConnectionError,
    APIStatusError,
    APITimeoutError,
    OpenAI,
)


logger = logging.getLogger(__name__)


SYSTEM_PROMPT = (
    "Você é um assistente de estudos prestativo. "
    "Responda de forma simples, clara e objetiva. "
    "Ajude o estudante a compreender os assuntos, "
    "sem apenas entregar respostas quando for possível "
    "explicar o raciocínio."
)


MODEL_NAME = "openai/gpt-4o-mini"

MAX_MESSAGE_LENGTH = 4000
MAX_HISTORY_MESSAGES = 30
MAX_HISTORY_ITEM_LENGTH = 4000
MAX_REQUEST_BODY_BYTES = 250_000

OPENROUTER_TIMEOUT_SECONDS = 90.0
OPENROUTER_MAX_RETRIES = 2


def error_response(message, status):
    return JsonResponse(
        {"error": message},
        status=status
    )


def get_request_body(request):
    content_length = request.META.get("CONTENT_LENGTH")

    if content_length:
        try:
            if int(content_length) > MAX_REQUEST_BODY_BYTES:
                return None, error_response(
                    "A requisição é muito grande.",
                    413
                )
        except (TypeError, ValueError):
            return None, error_response(
                "Tamanho de requisição inválido.",
                400
            )

    if len(request.body) > MAX_REQUEST_BODY_BYTES:
        return None, error_response(
            "A requisição é muito grande.",
            413
        )

    try:
        return json.loads(request.body), None

    except json.JSONDecodeError:
        return None, error_response(
            "JSON inválido.",
            400
        )


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

        if role not in ("user", "assistant"):
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

    valid_history = valid_history[-MAX_HISTORY_MESSAGES:]

    messages.extend(valid_history)

    messages.append(
        {
            "role": "user",
            "content": current_message
        }
    )

    return messages


@csrf_exempt
def chat(request):
    if request.method != "POST":
        return error_response(
            "Método não permitido.",
            405
        )

    data, error = get_request_body(request)

    if error:
        return error

    if not isinstance(data, dict):
        return error_response(
            "O corpo da requisição deve ser um objeto JSON.",
            400
        )

    message = data.get("message", "")
    history = data.get("messages", [])

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

    if not isinstance(history, list):
        return error_response(
            "O histórico da conversa é inválido.",
            400
        )

    api_key = os.environ.get("OPENROUTER_API_KEY")

    if not api_key:
        logger.error(
            "OPENROUTER_API_KEY não configurada."
        )

        return error_response(
            "O serviço de IA não está configurado.",
            500
        )

    messages = build_messages(
        history,
        message
    )

    try:
        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1",
            timeout=OPENROUTER_TIMEOUT_SECONDS,
            max_retries=OPENROUTER_MAX_RETRIES,
        )

        response = client.chat.completions.create(
            model=MODEL_NAME,
            messages=messages,
        )

        if not response.choices:
            logger.error(
                "A OpenRouter retornou zero escolhas."
            )

            return error_response(
                "A IA não retornou uma resposta válida.",
                502
            )

        answer = response.choices[0].message.content

        if not isinstance(answer, str):
            logger.error(
                "A OpenRouter retornou conteúdo inválido."
            )

            return error_response(
                "A IA não retornou uma resposta válida.",
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

        return JsonResponse(
            {
                "response": answer
            }
        )

    except APITimeoutError:
        logger.warning(
            "Timeout ao consultar a OpenRouter."
        )

        return error_response(
            "A IA demorou muito para responder. Tente novamente.",
            504
        )

    except APIConnectionError:
        logger.exception(
            "Erro de conexão com a OpenRouter."
        )

        return error_response(
            "Não foi possível conectar ao serviço de IA. Tente novamente.",
            502
        )

    except APIStatusError as error:
        logger.error(
            "Erro da OpenRouter. status=%s request_id=%s",
            error.status_code,
            getattr(error, "request_id", None),
        )

        return error_response(
            "O serviço de IA recusou ou não conseguiu processar a solicitação.",
            502
        )

    except Exception:
        logger.exception(
            "Erro inesperado no endpoint /api/chat/."
        )

        return error_response(
            "Não foi possível obter uma resposta da IA.",
            500
        )
