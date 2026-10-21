from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SlotViewSet, AppointmentViewSet

router = DefaultRouter()
router.register(r'slots', SlotViewSet, basename='slot')
router.register(r'appointments', AppointmentViewSet, basename='appointment')

urlpatterns = [
    path('', include(router.urls)),
]
