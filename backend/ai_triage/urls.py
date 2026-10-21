from django.urls import path
from .views import SymptomAnalyzeView

urlpatterns = [
    path('analyze/', SymptomAnalyzeView.as_view(), name='symptom_analyze'),
]
