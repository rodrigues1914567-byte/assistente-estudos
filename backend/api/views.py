import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openai import OpenAI


SYSTEM_PROMPT = (
    "Você é um assistente de estudos prestativo. "
    "Responda de forma simples, clara e objetiva. "
    "Ajude o estudante a compreender os assuntos, "
    "sem apenas entregar respostas quando for possível "
    "explicar o raciocínio."
)


@csrf_exempt
def chat(request):
    if request.method != "POST":
        return JsonResponse(
            {"error": "Método não permitido."},
            status=405
        )

    try:
        data = json.loads(request.body)

        message = data.get("message", "").strip()
        history = data.get("messages", [])

        if not message:
            return JsonResponse(
                {"error": "A mensagem não pode estar vazia."},
                status=400
            )

        if not isinstance(history, list):
            return JsonResponse(
                {"error": "O histórico da conversa é inválido."},
                status=400
            )

        api_key = os.environ.get("OPENROUTER_API_KEY")

        if not api_key:
            return JsonResponse(
                {"error": "A chave da OpenRouter não está configurada."},
                status=500
            )

        client = OpenAI(
            api_key=api_key,
            base_url="https://openrouter.ai/api/v1"
        )

        messages = [
            {
                "role": "system",
                "content": SYSTEM_PROMPT
            }
        ]

        for item in history:
            if not isinstance(item, dict):
                continue

            role = item.get("role")
            content = item.get("content")

            if role not in ["user", "assistant"]:
                continue

            if not isinstance(content, str):
                continue

            content = content.strip()

            if not content:
                continue

            messages.append(
                {
                    "role": role,
                    "content": content
                }
            )

        messages.append(
            {
                "role": "user",
                "content": message
            }
        )

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=messages
        )

        answer = response.choices[0].message.content

        if not answer:
            return JsonResponse(
                {"error": "A IA não retornou uma resposta."},
                status=500
            )

        return JsonResponse(
            {
                "response": answer
            }
        )

    except json.JSONDecodeError:
        return JsonResponse(
            {"error": "JSON inválido."},
            status=400
        )

    except Exception as error:
        print(f"Erro na OpenRouter: {error}")

        return JsonResponse(
            {"error": "Não foi possível obter uma resposta da IA."},
            status=500
        )
