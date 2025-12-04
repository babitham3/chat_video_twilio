from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Session, Message, ROLES
from .serializers import SessionSeralizer, MessageSeralizer
from django.utils.dateparse import parse_datetime

#read sender and role from header or query param (simple stub auth)
def get_sender_and_role(request):
    sender = request.headers.get("X-User") or request.query_params.get("user") or "anonymous"
    role = request.headers.get("X-Role") or request.query_params.get("role") or "customer"
    allowed = {r[0] for r in ROLES}
    if role not in allowed:
        role = "customer"
    return sender, role

@api_view(["POST"])
@permission_classes([AllowAny])
def create_session(request):
    """
    POST /api/sessions/
    body: { "title": "optional", "agent_id": "agent1", "customer_id": "cust1" }
    returns: session object (id)
    """
    title = request.data.get("title", "")
    agent_id = request.data.get("agent_id")
    customer_id = request.data.get("customer_id")
    s=Session.objects.create(title=title, agent_id=agent_id, customer_id=customer_id)
    return Response(SessionSeralizer(s).data, status=201)

@api_view(["GET"])
@permission_classes([AllowAny])
def list_messages(request, session_id):
    """
    returns list of messages for the session
    """
    session = get_object_or_404(Session, id=session_id)
    qs = session.messages.all()
    since = request.query_params.get("since")
    if since:
        try:
            dt = parse_datetime(since)
            if dt is not None:
                qs = qs.filter(created_at__gt=dt)
        except Exception:
            # ignore invalid
            pass
    serializer = MessageSeralizer(qs, many=True)
    return Response(serializer.data)

@api_view(["POST"])
@permission_classes([AllowAny])
def post_message(request, session_id):
    session = get_object_or_404(Session, id=session_id)
    sender, role = get_sender_and_role(request)
    text = request.data.get("text", "").strip()
    if not text:
        return Response({"error": "empty text"}, status=400)
    msg = Message.objects.create(session=session, sender=sender, role=role, text=text)
    return Response(MessageSeralizer(msg).data, status=201)