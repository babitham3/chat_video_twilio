from django.urls import path
from . import views

urlpatterns=[
    path('sessions/',views.create_session,name='create_session'),
    path('sessions/<uuid:session_id>/messages/',views.list_messages,name='list_messages'),
    path('sessions/<uuid:ticket_id>/messages/post/',views.post_message,name='post_message'),
]