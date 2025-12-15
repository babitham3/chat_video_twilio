from rest_framework import serializers
from .models import Session,Message,MeetingLink
from django.utils import timezone

class SessionSeralizer(serializers.ModelSerializer):
    class Meta:
        model=Session
        fields=['id','title','created_at','agent_id','customer_id','meeting_link']

class MessageSeralizer(serializers.ModelSerializer):
    class Meta:
        model=Message
        fields=['id','session','sender','role','text','sent_at']
        read_only_fields=['id','sent_at']

class MeetingLinkSerializer(serializers.ModelSerializer):
    session=serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model=MeetingLink
        fields=['id','session','creator','room_name','room_sid','expires_at','created_at']
        read_only_fields=['id','issued_count','created_at']