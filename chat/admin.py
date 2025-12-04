from django.contrib import admin
from .models import Session, Message, MeetingLink
from django.utils.html import format_html

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

@admin.register(MeetingLink)
class MeetingLinkAdmin(admin.ModelAdmin):
    list_display=('id','session','creator','room_name','one_time','allowed_count','issued_count','used','expires_at','created_at')
    readonly_fields=('created_at','last_issued_at','issued_count')
    search_fields=('id','session_id','creator','room_name')
    list_filter=('one_time','used')
    actions=['mark_as_used']

    def mark_as_used(self,request,queryset):
        queryset.update(used=True)
        self.message_user(request,f"Marked {queryset.count()} meeting link as used.")
    mark_as_used.short_description='Mark selected meeting link as used'

    def join_link(self,obj):
        return format_html("<a href='{}' target='_blank'>Open Join URL</a>",obj.public_url(base='http://127.0.0.1:3000/meet/'))