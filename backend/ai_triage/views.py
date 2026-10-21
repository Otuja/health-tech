from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
import requests

OLLAMA_API_URL = "http://localhost:11434/api/generate"

class SymptomAnalyzeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        symptoms = request.data.get('symptoms', '')
        if not symptoms:
            return Response({"error": "Symptoms are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        prompt = (
            f"You are a medical AI assistant. The patient reports the following symptoms: {symptoms}. "
            f"Please provide a very brief possible explanation, advise if they should see a doctor urgently, "
            f"and include a disclaimer that you are an AI and this is not professional medical advice."
        )

        model_name = request.data.get("model", "gemma 4 12b-it-qat")
        payload = {
            "model": model_name,
            "prompt": prompt,
            "stream": False
        }

        try:
            res = requests.post(OLLAMA_API_URL, json=payload, timeout=15)
            res.raise_for_status()
            data = res.json()
            return Response({"analysis": data.get("response", "No response generated.")})
        except requests.exceptions.RequestException as e:
            fallback_message = (
                "AI Triage is currently offline (Ollama unreachable). Based on your symptoms, we strongly recommend "
                "booking an appointment with a doctor for a proper evaluation. "
                "If this is an emergency, please visit the nearest hospital."
            )
            return Response({"analysis": fallback_message, "error": str(e)}, status=status.HTTP_200_OK)
