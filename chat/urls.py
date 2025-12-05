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

    path("sessions/<uuid:session_id>/presence/",views.presence_view,name="presence_view")
]