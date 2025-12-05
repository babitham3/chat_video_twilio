import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.db import transaction
from .models import Session, Message, ROLES, MeetingLink
from .serializers import SessionSeralizer, MessageSeralizer,MeetingLinkSerializer

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

@api_view(['POST'])
@permission_classes([AllowAny])
def create_meeting_link(request,session_id):
    #POST  /api/sessions/sessionid/meetings/create
    session=Session.objects.filter(id=session_id).first()
    if not session:
        return Response({'error':'session not found'},status=404)
    
    creator=request.data.get('creator') or request.headers.get('X-User') or None
    one_time=bool(request.data.get('one_time',True))
    allowed_count=int(request.data.get('allowed_count',2))
    expires_at=request.data.get('expires_at',None)

    room_name=request.data.get('room_name') or f"session-{session_id}-{uuid.uuid4().hex[:8]}"

    m=MeetingLink.objects.create(
        session=session,
        creator=creator,
        room_name=room_name,
        one_time=one_time,
        allowed_count=allowed_count,
        expires_at=expires_at
    )

    session.meeting_link=m.public_url(base='http://127.0.0.2:3000/meet/')
    session.save(update_fields=['meeting_link'])

    return Response(MeetingLinkSerializer(m).data,status=201)

@api_view(['GET'])
@permission_classes([AllowAny])
def validate_meeting_link(request,link_id):
    #GET /api/meetings/<linkid>/validate/
    try:
        m=MeetingLink.objects.get(id=link_id)
    except MeetingLink.DoesNotExist:
        return Response({'valid':False,'reason':'not_found'},status=404)
    
    if m.is_expired():
        return Response({'valid':False,'reason':'expired'},status=410)
    if m.one_time and m.used:
        return Response({'valid':False,'reason':'used'},status=410)
    if m.issued_count>=m.allowed_count:
        return Response({'valid':False,'reason':'full'},status=410)
    
    return Response({'valid':True,'room_name':m.room_name,'session_id':str(m.session_id)})

@api_view(['POST'])
@permission_classes([AllowAny])
def issue_meeting_token(request,link_id):
    #POST /api/meetings/<linkid>/issue/ -> atomically increments issued_count and marks used if one_time
    try:
        with transaction.atomic():
            m=MeetingLink.objects.select_for_update().get(id=link_id)
            if m.is_expired():
                return Response({'error':'expired'},status=410)
            if m.one_time and m.used:
                return Response({'error':'used'},status=410)
            if m.issued_count>=m.allowed_count:
                return Response({'error':'full'},status=410)
            
            #if all is good
            m.issued_count +=1
            m.last_issued_at=timezone.now()
            if m.one_time:
                m.used=True
            m.save(update_fields=['issued_count','last_issued_at','used'])
    except MeetingLink.DoesNotExist:
        return Response({'error':'not_found'},status=404)
    
    #token simulation -> to be replaced with twilio
    identity=request.data.get('identity') or request.headers.get('X-User')
    simulated_token=f"DUMMY-TOKEN-{uuid.uuid4().hex[:12]}"

    return Response({
        'token':simulated_token,
        'room_name':m.room_name,
        'identity':identity,
        'issued_count':m.issued_count
    })

from django.http import JsonResponse
from .consumers import PRESENCE
def presence_view(request,session_id):
    #GET /api/sessions/<session_id>/presence/
    users=list(PRESENCE.get(str(session_id),set()))
    return JsonResponse({"session_id":str(session_id),"online":users})