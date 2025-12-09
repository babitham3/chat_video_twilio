#real-time communication logic
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

#in-process tracking
PRESENCE={}

class SessionConsumer(AsyncWebsocketConsumer):
    #websocket consumer handling real-time chat.
    async def connect(self):
        self.session_id=self.scope['url_route']['kwargs']['session_id']
        print(f"[WS DEBUG] connect attempt: session={self.session_id} scope_client={self.scope.get('client')} channel={self.channel_name}")
        self.group_name=f"session_{self.session_id}"
        #accept connection
        await self.accept()
        #add to group
        await self.channel_layer.group_add(self.group_name,self.channel_name)

        #local identity placeholder
        self.user=None
        self.role=None
        #send ack
        await self.send_json({'type':'connected','session_id':self.session_id})
    
    async def disconnect(self, close_code):
        #remove if identified
        print(f"[WS DEBUG] disconnect: session={getattr(self,'session_id',None)} close_code={close_code}")
        if self.user:
            await self._remove_presence(self.session_id,self.user)
            #broadcast presence update
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type":"presence.update",
                    "action":"left",
                    "user":self.user,
                }
            )

            #leave group
            await self.channel_layer.group_discard(self.group_name,self.channel_name)
            
    async def receive(self, text_data = None, bytes_data = None):
        #Handle incoming Websocket json messages
        if text_data is None:
            return
        try:
            data=json.loads(text_data)
        except Exception:
            await self.send_json({"error":"invalid_json"})
            return
        
        action=data.get("action")
        if action =="identify":
            #client identifies with user and role
            self.user=data.get("user") or data.get("identity")
            self.role=data.get("role") or "customer"
            await self._add_presence(self.session_id,self.user)

            #notify group of new presence
            await self.channel_layer.group_send(
                self.group_name,
                {
                    "type":"presence.update",
                    "action":"joined",
                    "user":self.user,
                    "role":self.role,
                }
            )

            #ack with current presence
            online=await self._get_presence(self.session_id)
            await self.send_json({"type":"identified","user":self.user,"online":list(online)})
            return
        #broadcast message and persist
        if action=="message":
            text=data.get("text","").strip()
            if not text:
                await self.send_json({"error":"empty_text"})
                return
            
            sender=self.user or data.get("user") or "anonymous"
            role =self.role or data.get("role") or "customer"

            #saving to DB
            msg_obj=await self._save_message(self.session_id,sender,role,text)
            payload={
                "type":"chat.message",
                "id":str(msg_obj["id"]),
                "session_id":self.session_id,
                "sender":msg_obj["sender"],
                "role":msg_obj["role"],
                "text":msg_obj["text"],
                "created_at":msg_obj["created_at"],
            }
            await self.channel_layer.group_send(self.group_name,payload)
            return
        
        #unknown action
        await self.send_json({"error":"unknown_action","action":action})
    
    async def chat_message(self,event):
        #forward chat.message events to ws
        await self.send_json({"type":"message",**event})
    async def presence_update(self,event):
        #event has action(left/joined), user,role
        await self.send_json({"type":"presence",**event})
    #helper functions
    async def _add_presence(self,session_id,user):
        PRESENCE.setdefault(session_id,set()).add(user)
    async def _remove_presence(self,session_id,user):
        s=PRESENCE.get(session_id)
        if s and user in s:
            s.remove(user)
            if len(s)==0:
                PRESENCE.pop(session_id,None)
    async def _get_presence(self,session_id):
        return PRESENCE.get(session_id,set())
    #DB operations
    @database_sync_to_async
    def _save_message(self,session_id,sender,role,text):
        from .models import Session,Message
        session=Session.objects.get(id=session_id)
        msg=Message.objects.create(session=session,sender=sender,role=role,text=text)
        return{
            "id":str(msg.id),
            "sender":msg.sender,
            "role":msg.role,
            "text":msg.text,
            "created_at":msg.sent_at.isoformat(),
        }
    #to send json
    async def send_json(self,content):
        await self.send(text_data=json.dumps(content))

    async def meeting_started(self,event):
        #event: { "type": "meeting_started", "session_id": "...", "link_id": "..." }
        print(
            "[WS DEBUG] meeting_started handler called:",
            "session=", event.get("session_id"),
            "link=", event.get("link_id"),
            "chan=", self.channel_name,
        )
        await self.send_json({
            "type":"meeting.started",
            "session_id":event["session_id"],
            "link_id": event["link_id"],
        })


    

        