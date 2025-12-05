# chat/routing.py
print("[ROUTING] loading chat.routing")

from django.urls import re_path
from . import consumers

# Accept with or without leading slash to avoid subtle path mismatch issues.
_uuid_re = r"(?P<session_id>[0-9a-fA-F\-]+)"

websocket_urlpatterns = [
    # matches: /ws/sessions/<uuid>/  and ws/sessions/<uuid>/ (both)
    re_path(rf"^/?ws/sessions/{_uuid_re}/?$", consumers.SessionConsumer.as_asgi()),
]
