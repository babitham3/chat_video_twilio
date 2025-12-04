from rest_framework import serializers
from .models import Session,Message

class SessionSeralizer(serializers.ModelSerializer):
    class Meta:
        model=Session
        fields=['id','title','created_at','agent_id','customer_id','meeting_link']

class MessageSeralizer(serializers.ModelSerializer):
    class Meta:
        model=Message
        fields=['id','session','sender','role','text','sent_at']
        read_only_fields=['id','sent_at']