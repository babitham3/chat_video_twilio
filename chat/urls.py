from django.urls import path
from . import views

urlpatterns=[
    #session
    path('sessions/',views.create_session,name='create_session'),
    path('sessions/<uuid:session_id>/messages/',views.list_messages,name='list_messages'),
    path('sessions/<uuid:ticket_id>/messages/post/',views.post_message,name='post_message'),

    #meeting
    path('sessions/<uuid:session_id>/meetings/create/',views.create_meeting_link,name='create_meeting_link'),
    path('meetings/<uuid:link_id>/validate/', views.validate_meeting_link,name='validate_meeting_link'),
    path('meetings/<uuid:link_id>/issue/',views.issue_meeting_token,name='issue_meeting_token'),

    path("sessions/<uuid:session_id>/presence/",views.presence_view,name="presence_view"),
    path("sessions/list/",views.list_sessions,name="list_sessions"),
    path("sessions/<uuid:pk>/close/",views.close_session),
    path('meetings/<uuid:link_id>/events/',views.meeting_event),
    path('meetings/<uuid:link_id>/analytics/',views.meeting_analytics),
    path('sessions/history/',views.list_all_sessions,name="sessions_history"),
    path('sessions/<uuid:session_id>/summary/',views.session_summary,name="session_summary"),
    path('meetings/<uuid:link_id>/save-room-sid/',views.save_room_sid,name="save_room_sid"),
    path('meetings/<uuid:link_id>/start-recording/',views.start_recording,name="start_recording"),
    path('meetings/<uuid:link_id>/stop-recording/',views.stop_recording),
    path('meetings/<uuid:link_id>/create-composition/', views.create_composition),
]