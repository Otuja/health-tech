from django.contrib import admin
from .models import MedicalRecord, EmergencyProfile, Allergy, ChronicCondition, PatientDocument

class AllergyInline(admin.TabularInline):
    model = Allergy
    extra = 1

class ChronicConditionInline(admin.TabularInline):
    model = ChronicCondition
    extra = 1

@admin.register(EmergencyProfile)
class EmergencyProfileAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'blood_group', 'emergency_contact_name', 'emergency_contact_phone', 'uuid', 'updated_at')
    search_fields = ('patient__username', 'patient__first_name', 'patient__last_name', 'blood_group', 'uuid')
    list_filter = ('blood_group',)
    inlines = [AllergyInline, ChronicConditionInline]
    readonly_fields = ('uuid',)

@admin.register(MedicalRecord)
class MedicalRecordAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'doctor', 'diagnosis', 'created_at')
    search_fields = ('patient__username', 'doctor__username', 'diagnosis', 'symptoms')
    list_filter = ('doctor', 'created_at')
    date_hierarchy = 'created_at'

@admin.register(PatientDocument)
class PatientDocumentAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'patient', 'category', 'facility_or_doctor', 'document_date', 'created_at')
    search_fields = ('title', 'patient__username', 'facility_or_doctor', 'notes')
    list_filter = ('category', 'created_at')
    date_hierarchy = 'created_at'
