from django.contrib import admin
from .models import Session, Message 

class MessageInline(admin.TabularInline):
    model = Message
    extra = 1
    fields = ("sender", "role", "text", "sent_at")
    readonly_fields = ("sent_at",)
    show_change_link = True

@admin.register(Session)
class SessionAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "created_at", "agent_id", "customer_id", "meeting_link")
    search_fields = ("id", "title", "agent_id", "customer_id")
    readonly_fields = ("created_at",)
    inlines = [MessageInline]

@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ("id", "session", "sender", "role", "sent_at")
    list_filter = ("role",)
    search_fields = ("sender", "text")
    readonly_fields = ("sent_at",)