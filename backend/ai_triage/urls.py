from django.urls import path
from .views import (
    SymptomAnalyzeView,
    AIConsultationChatView,
    AIConsultationSessionListView,
    AIConsultationSessionDetailView,
    SmartHealthTipsView
)

urlpatterns = [
    # Legacy endpoint (preserved for backward compatibility & tests)
    path('analyze/', SymptomAnalyzeView.as_view(), name='symptom_analyze'),
    
    # Modern Multi-turn Session & Chat endpoints
    path('chat/', AIConsultationChatView.as_view(), name='triage_chat'),
    path('sessions/', AIConsultationSessionListView.as_view(), name='triage_sessions'),
    path('sessions/<uuid:session_id>/', AIConsultationSessionDetailView.as_view(), name='triage_session_detail'),

    # Dynamic AI Daily Clinical Tips endpoint
    path('smart-tips/', SmartHealthTipsView.as_view(), name='smart_health_tips'),
]
