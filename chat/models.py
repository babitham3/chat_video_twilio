import uuid
from django.db import models
from django.utils import timezone

ROLES=[
    ('agent','agent'),
    ('customer','customer'),
    ('system','system'),
]

class Session(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    title=models.CharField(max_length=255,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)

    #fk to user
    agent_id=models.CharField(max_length=150,null=True,blank=True)
    customer_id=models.CharField(max_length=150,null=True,blank=True)

    meeting_link=models.CharField(max_length=1024,null=True,blank=True)
    is_active=models.BooleanField(default=True)
    def __str__(self):
        return f"Session {self.id} - {self.title or 'untitled'}"

class Message(models.Model):
    session=models.ForeignKey(Session,related_name='messages',on_delete=models.CASCADE)
    sender=models.CharField(max_length=150)
    role=models.CharField(max_length=20,choices=ROLES,default='customer')
    text=models.TextField()
    sent_at=models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering=['sent_at']
    
    def __str__(self):
        return f"[{self.sent_at}] {self.role}:{self.sender} - {self.text[:40]}"

class MeetingLink(models.Model):
    id=models.UUIDField(primary_key=True,default=uuid.uuid4,editable=False)
    session=models.ForeignKey('chat.Session',related_name='meeting_links',on_delete=models.CASCADE)
    creator=models.CharField(max_length=150,null=True,blank=True)
    room_name=models.CharField(max_length=255)
    room_sid=models.CharField(max_length=64,null=True,blank=True)
    expires_at=models.DateTimeField(null=True,blank=True)
    created_at=models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering=['-created_at']
    
    def is_expired(self):
        if not self.expires_at:
            return False
        return timezone.now() > self.expires_at
    
    def public_url(self,base='https://localhost:5173/meet/'):
        return f"{base}{self.id}"
    
    def __str__(self):
        return f"MeetingLink {self.id} for Session {self.session_id}"
    
class MeetingEvent(models.Model):
    EVENT_TYPES = [
        ("joined", "Joined room"),
        ("left", "Left room"),
        ("meeting_started", "Meeting started"),
        ("meeting_ended", "Meeting ended"),
        ("screen_share_started", "Screen share started"),
        ("screen_share_stopped", "Screen share stopped"),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    meeting = models.ForeignKey(
        MeetingLink,
        related_name="events",
        on_delete=models.CASCADE,
    )
    session = models.ForeignKey(
        Session,
        related_name="meeting_events",
        on_delete=models.CASCADE,
    )
    event_type = models.CharField(max_length=64, choices=EVENT_TYPES)
    identity = models.CharField(max_length=150, blank=True, null=True)
    role = models.CharField(max_length=50, blank=True, null=True)
    metadata = models.JSONField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.event_type} for {self.meeting_id} at {self.created_at}"