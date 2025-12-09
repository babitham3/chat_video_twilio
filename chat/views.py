import uuid
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny,IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils.dateparse import parse_datetime
from django.utils import timezone
from django.db.models import Count,Min,Max
from .models import Session, Message, ROLES, MeetingLink, MeetingEvent
from .serializers import SessionSeralizer, MessageSeralizer,MeetingLinkSerializer
from django.conf import settings
from twilio.jwt.access_token import AccessToken
from twilio.jwt.access_token.grants import VideoGrant
from datetime import timedelta
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

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
    one_time=False
    allowed_count=0
    expires_at=timezone.now()+timedelta(hours=1) #expires in one hour

    room_name=request.data.get('room_name') or f"session-{session_id}-{uuid.uuid4().hex[:8]}"

    m=MeetingLink.objects.create(
        session=session,
        creator=creator,
        room_name=room_name,
        one_time=one_time,
        allowed_count=allowed_count,
        expires_at=expires_at
    )

    session.meeting_link=m.public_url(base='http://localhost:5173/meet/')
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
    
    return Response({'valid':True,'room_name':m.room_name,'session_id':str(m.session_id)})

@api_view(['POST'])
@permission_classes([AllowAny])
def issue_meeting_token(request, link_id):
    try:
        m = MeetingLink.objects.get(id=link_id)
    except MeetingLink.DoesNotExist:
        return Response({'error': 'not_found'}, status=404)

    if m.is_expired():
        return Response({'error': 'expired'}, status=410)

    identity = (
        request.data.get('identity')
        or request.headers.get('X-User')
        or f"user-{uuid.uuid4().hex[:6]}"
    )

    account_sid = settings.TWILIO_ACCOUNT_SID
    api_key_sid = settings.TWILIO_API_KEY_SID
    api_key_secret = settings.TWILIO_API_KEY_SECRET

    # allow dev mode with dummy token if Twilio not configured
    if not (account_sid and api_key_sid and api_key_secret):
        simulated_token = f"DUMMY-TOKEN-{uuid.uuid4().hex[:12]}"
        token_str = simulated_token
        mode = "dummy"
    else:
        token = AccessToken(account_sid, api_key_sid, api_key_secret, identity=identity)
        video_grant = VideoGrant(room=m.room_name)
        token.add_grant(video_grant)
        jwt = token.to_jwt()
        if isinstance(jwt, bytes):
            jwt = jwt.decode("utf-8")
        token_str = jwt
        mode = "twilio"

    # broadcast to WS so agent can auto-join
    try:
        channel_layer = get_channel_layer()
        if channel_layer is not None:
            safe_session_id=str(m.session_id)
            group_name=f"session_{safe_session_id}"
            print("WS sending meeting_started to group:",group_name)
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "meeting_started",
                    "session_id": safe_session_id,
                    "link_id": str(m.id),
                },
            )
    except Exception as e:
        print("WS meeting_started send error:", e)

    return Response({
        'token': token_str,
        'room_name': m.room_name,
        'identity': identity,
        'mode': mode,
    }) 

from django.http import JsonResponse
from .consumers import PRESENCE
def presence_view(request,session_id):
    #GET /api/sessions/<session_id>/presence/
    users=list(PRESENCE.get(str(session_id),set()))
    return JsonResponse({"session_id":str(session_id),"online":users})

@api_view(["GET"])
def list_sessions(request):
    # GET /api/sessions/list/
    qs=Session.objects.filter(is_active=True).order_by("-created_at")[:50]
    out=[]
    for s in qs:
        out.append({
            "id":str(s.id),
            "title":s.title,
            "agent_id":s.agent_id,
            "customer_id":s.customer_id,
            "meeting_link":s.meeting_link,
            "created_at":s.created_at.isoformat(),
        })
    return Response(out)

@api_view(["GET"])
@permission_classes([AllowAny])
def list_all_sessions(request):
    #GET /api/sessions/history/
    qs = (
        Session.objects.all()
        .annotate(
            meeting_count=Count("meeting_links", distinct=True),
            last_meeting_at=Max("meeting_links__events__created_at"),
        )
        .order_by("-created_at")[:300]
    )

    out = []
    for s in qs:
        out.append(
            {
                "id": str(s.id),
                "title": s.title,
                "agent_id": s.agent_id,
                "customer_id": s.customer_id,
                "is_active": getattr(s, "is_active", True),
                "created_at": s.created_at.isoformat(),
                "meeting_count": s.meeting_count,
                "last_meeting_at": s.last_meeting_at.isoformat()
                if s.last_meeting_at
                else None,
            }
        )
    return Response(out)

@api_view(["POST"])
def close_session(request, pk):
    try:
        s = Session.objects.get(pk=pk)
    except Session.DoesNotExist:
        return Response({"detail": "Not found"}, status=404)
    s.is_active = False
    s.save(update_fields=["is_active"])
    return Response({"status": "closed"})

@api_view(["POST"])
@permission_classes([AllowAny])
def meeting_event(request,link_id):
    #POST /api/meetings/<link_id>/events/
    try:
        m=MeetingLink.objects.select_related("session").get(id=link_id)
    except MeetingLink.DoesNotExist:
        return Response({"error":"not_found"},status=404)
    
    event_type=request.data.get("event_type")
    if not event_type:
        return Response({"error":"missing event_type"},status=400)
    
    identity=(
        request.data.get("identity") or request.headers.get("X-User") or None
    )
    role=(
        request.data.get("role") or request.headers.get("X-Role") or "customer"
    )
    metadata = request.data.get("metadata") or {}

    ev = MeetingEvent.objects.create(
        meeting=m,
        session=m.session,
        event_type=event_type,
        identity=identity,
        role=role,
        metadata=metadata,
    )

    return Response(
        {
            "id": str(ev.id),
            "event_type": ev.event_type,
            "created_at": ev.created_at.isoformat(),
        },
        status=201,
    )

@api_view(["GET"])
@permission_classes([AllowAny])
def meeting_analytics(request, link_id):
    """
    GET /api/meetings/<link_id>/analytics/
    """
    try:
        m = MeetingLink.objects.get(id=link_id)
    except MeetingLink.DoesNotExist:
        return Response({"error": "not_found"}, status=404)

    events_qs = m.events.order_by("created_at")
    events = list(events_qs)

    participants = sorted({e.identity for e in events if e.identity})

    start_time = events[0].created_at if events else None
    end_time = events[-1].created_at if events else None
    duration_seconds = (
        (end_time - start_time).total_seconds()
        if start_time and end_time
        else None
    )

    # joined/left per participant
    first_join = {}
    last_leave = {}
    for e in events:
        if e.event_type == "joined":
            first_join.setdefault(e.identity, e.created_at)
        elif e.event_type == "left":
            last_leave[e.identity] = e.created_at

    # screen share intervals
    screen_intervals = []  # [{identity, start, end, duration_seconds}, ...]
    active_share = {}      

    for e in events:
        if e.event_type == "screen_share_started":
            active_share[e.identity] = e.created_at
        elif e.event_type == "screen_share_stopped":
            start = active_share.pop(e.identity, None)
            if start:
                dur = (e.created_at - start).total_seconds()
                screen_intervals.append({
                    "identity": e.identity,
                    "start": start,
                    "end": e.created_at,
                    "duration_seconds": dur,
                })

    # if someone started sharing but never stopped,  close it at meeting end
    for ident, start in active_share.items():
        if end_time:
            dur = (end_time - start).total_seconds()
            screen_intervals.append({
                "identity": ident,
                "start": start,
                "end": end_time,
                "duration_seconds": dur,
            })

    summary = {
        "meeting_id": str(m.id),
        "session_id": str(m.session_id),
        "participants": participants,
        "start_time": start_time,
        "end_time": end_time,
        "duration_seconds": duration_seconds,
        "first_join": {k: first_join.get(k) for k in participants},
        "last_leave": {k: last_leave.get(k) for k in participants},
        "screen_share_sessions": screen_intervals,
    }
    events_out = [
        {
            "event_type": e.event_type,
            "identity": e.identity,
            "role": e.role,
            "metadata": e.metadata,
            "created_at": e.created_at,
        }
        for e in events
    ]

    return Response({
        "meta": {
            "meeting_id": str(m.id),
            "session_id": str(m.session_id),
            "room_name": m.room_name,
            "expires_at": m.expires_at,
        },
        "summary": summary,
        "events": events_out,
    })

@api_view(["GET"])
@permission_classes([AllowAny])
def session_summary(request, session_id):
    # GET /api/sessions/<session_id>/summary/
    session = get_object_or_404(Session, id=session_id)
    # all MeetingLinks for this session
    links = (
        MeetingLink.objects.filter(session=session)
        .order_by("-created_at")
    )

    meetings_out = []
    all_meeting_start_times = []
    all_meeting_end_times = []

    for link in links:
        events = list(link.events.order_by("created_at"))

        if events:
            # participants
            participants = sorted({e.identity for e in events if e.identity})

            # call-level start/end based on joined/left if present
            join_times = [e.created_at for e in events
                          if e.event_type == "joined" and e.identity]
            leave_times = [e.created_at for e in events
                           if e.event_type == "left" and e.identity]

            if join_times:
                call_start = min(join_times)
            else:
                # fallback: first event
                call_start = events[0].created_at

            if leave_times:
                call_end = max(leave_times)
            else:
                # fallback: last event
                call_end = events[-1].created_at

            call_duration_seconds = (call_end - call_start).total_seconds()

            all_meeting_start_times.append(call_start)
            all_meeting_end_times.append(call_end)

            # screen share intervals for THIS meeting
            screen_intervals = []   # [{identity, start, end, duration_seconds}, ...]
            active_share = {}       # identity -> start_time

            for e in events:
                if e.event_type == "screen_share_started":
                    active_share[e.identity] = e.created_at
                elif e.event_type == "screen_share_stopped":
                    start = active_share.pop(e.identity, None)
                    if start:
                        dur = (e.created_at - start).total_seconds()
                        screen_intervals.append({
                            "identity": e.identity,
                            "start": start.isoformat(),
                            "end": e.created_at.isoformat(),
                            "duration_seconds": dur,
                        })

            # close any screen shares left open when meeting ended
            for ident, start in active_share.items():
                dur = (call_end - start).total_seconds()
                screen_intervals.append({
                    "identity": ident,
                    "start": start.isoformat(),
                    "end": call_end.isoformat(),
                    "duration_seconds": dur,
                })

            total_screen_share_seconds = sum(
                s["duration_seconds"] for s in screen_intervals
            )

        else:
            participants = []
            call_start = None
            call_end = None
            call_duration_seconds = None
            screen_intervals = []
            total_screen_share_seconds = 0

        meetings_out.append(
            {
                "id": str(link.id),
                "link_id": str(link.id),
                "room_name": link.room_name,
                # call-level timing
                "started_at": call_start.isoformat() if call_start else None,
                "ended_at": call_end.isoformat() if call_end else None,
                "duration_seconds": call_duration_seconds,
                "participants": participants,
                #screen-share info per meeting
                "screen_share_sessions": screen_intervals,
                "total_screen_share_seconds": total_screen_share_seconds,
            }
        )

    # overall session-level first/last meeting times
    first_meeting_at = (
        min(all_meeting_start_times).isoformat() if all_meeting_start_times else None
    )
    last_meeting_at = (
        max(all_meeting_end_times).isoformat() if all_meeting_end_times else None
    )

    session_data = {
        "id": str(session.id),
        "title": session.title,
        "agent_id": session.agent_id,
        "customer_id": session.customer_id,
        "is_active": getattr(session, "is_active", True),
        "created_at": session.created_at.isoformat(),
        "meeting_count": links.count(),
        "first_meeting_at": first_meeting_at,
        "last_meeting_at": last_meeting_at,
    }

    return Response({"session": session_data, "meetings": meetings_out})
