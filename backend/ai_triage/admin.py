from django.contrib import admin
from .models import AIConsultationSession, AIConsultationMessage

class AIConsultationMessageInline(admin.TabularInline):
    model = AIConsultationMessage
    extra = 0
    readonly_fields = ('sender', 'content', 'routing_data', 'created_at')

@admin.register(AIConsultationSession)
class AIConsultationSessionAdmin(admin.ModelAdmin):
    list_display = ('title', 'patient', 'category', 'urgency', 'is_emergency', 'ndpr_compliant', 'created_at')
    list_filter = ('category', 'urgency', 'is_emergency', 'ndpr_compliant')
    search_fields = ('title', 'patient__username', 'patient__email')
    inlines = [AIConsultationMessageInline]
