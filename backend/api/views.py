import json
import os

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from openai import OpenAI


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

        if not message:
            return JsonResponse(
                {"error": "A mensagem não pode estar vazia."},
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

        response = client.chat.completions.create(
            model="openai/gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "Você é um assistente de estudos prestativo. "
                        "Responda de forma simples, clara e objetiva. "
                        "Ajude o estudante a compreender os assuntos, "
                        "sem apenas entregar respostas quando for possível "
                        "explicar o raciocínio."
                    )
                },
                {
                    "role": "user",
                    "content": message
                }
            ]
        )

        answer = response.choices[0].message.content

        return JsonResponse({
            "response": answer
        })

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
