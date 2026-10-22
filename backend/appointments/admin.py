from django.contrib import admin
from .models import Slot, Appointment

@admin.register(Slot)
class SlotAdmin(admin.ModelAdmin):
    list_display = ('id', 'doctor', 'start_time', 'end_time', 'is_booked')
    list_filter = ('is_booked', 'doctor')
    search_fields = ('doctor__username', 'doctor__first_name', 'doctor__last_name')
    date_hierarchy = 'start_time'

@admin.register(Appointment)
class AppointmentAdmin(admin.ModelAdmin):
    list_display = ('id', 'patient', 'doctor', 'slot', 'created_at')
    list_filter = ('doctor', 'created_at')
    search_fields = ('patient__username', 'doctor__username', 'notes')
    date_hierarchy = 'created_at'
