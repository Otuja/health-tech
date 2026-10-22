from django.urls import path
from .views import (
    RegisterView, 
    UserProfileView,
    AdminStatsView,
    AdminDoctorsListView,
    AdminDoctorToggleView,
    AdminPatientsListView,
    AdminDoctorCreateView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('me/', UserProfileView.as_view(), name='user-profile'),
    path('admin/stats/', AdminStatsView.as_view(), name='admin-stats'),
    path('admin/doctors/', AdminDoctorsListView.as_view(), name='admin-doctors'),
    path('admin/doctors/create/', AdminDoctorCreateView.as_view(), name='admin-doctor-create'),
    path('admin/doctors/<int:pk>/toggle/', AdminDoctorToggleView.as_view(), name='admin-doctor-toggle'),
    path('admin/patients/', AdminPatientsListView.as_view(), name='admin-patients'),
]
