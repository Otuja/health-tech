from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import User

@admin.register(User)
class UserAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'specialization', 'is_staff', 'is_active')
    list_filter = ('role', 'is_staff', 'is_superuser', 'is_active')
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Clinical & Role Information', {'fields': ('role', 'specialization')}),
    )
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Clinical & Role Information', {'fields': ('role', 'specialization')}),
    )
    search_fields = ('username', 'email', 'first_name', 'last_name', 'specialization')
