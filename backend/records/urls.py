from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MedicalRecordViewSet, 
    EmergencyProfileViewSet, 
    AllergyViewSet, 
    ChronicConditionViewSet,
    PublicEmergencyProfileView,
    PatientDocumentViewSet
)

router = DefaultRouter()
router.register(r'medical-records', MedicalRecordViewSet, basename='medical-record')
router.register(r'documents', PatientDocumentViewSet, basename='patient-document')
router.register(r'emergency-profiles', EmergencyProfileViewSet, basename='emergency-profile')
router.register(r'allergies', AllergyViewSet, basename='allergy')
router.register(r'chronic-conditions', ChronicConditionViewSet, basename='chronic-condition')

urlpatterns = [
    path('', include(router.urls)),
    path('emergency-scan/<uuid:uuid>/', PublicEmergencyProfileView.as_view(), name='emergency-scan'),
]

