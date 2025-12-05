import React,{useEffect,useRef,useState} from "react";
import { use } from "react";

export default function ChatRoom({sessionId,user,role,apiBase="http://127.0.0.1:8000/api"}){
    const [ws,setWs]=useState(null);
    const [connected,setConnected]=useState(false);
    const [online,setOnline]=useState([]);
    const [messages,setMessages]=useState([]);
    const [text,setText]=useState("");
    const messagesRef=useRef(null);

    useEffect(()=>{
        if(!sessionId) return;
        //load initial messages
        fetch(`${apiBase}/sessions/${sessionId}/messages/`)
        .then((r)=>r.json())
        .then((arr)=>setMessages(arr || []))
        .catch((e)=>console.error("load messages:",e));
    },[sessionId,apiBase]);

    useEffect(()=>{
        if(!sessionId || !user) return;
        const WS_HOST="127.0.0.1:8000";
        const proto=window.location.protocol==="https:"?"wss":"ws";
        const url=`${proto}://${WS_HOST}/ws/sessions/${sessionId}`;
        const socket=new WebSocket(url);

        socket.onopen=()=>{
            setConnected(true);
            socket.send(JSON.stringify({action:"identify",user,role}));
        };

        socket.onmessage=(ev)=>{
            try{
                const data=JSON.parse(ev.data);
                if(data.type==="message"){
                    setMessages((prev)=>[...prev,{
                        id: data.id,sender: data.sender,role: data.role,text: data.text,created_at : data.created_at
                    }]);
                    scrollToBottom();
                }else if(data.type==="presence"){
                    if(data.action==="joined") setOnline((o)=>Array.from(new Set([...o,data.user])));
                    if(data.action==="left") setOnline((o)=>o.filter(u=> u!== data.user));
                }else if(data.type==="identified"){
                    setOnline(data.online || []);
                }
            }catch(e){
                console.error("ws parse",e);
            }
        };

        socket.onclose=()=>{
            setConnected(false);
            setWs(null);
        };
        socket.onerror=(err) => console.error("WS error",err);

        setWs(socket);
        return()=>{if (socket && socket.readyState===1) socket.close();};
    },[sessionId,user,role]);

    function scrollToBottom(){
        if(!messagesRef.current) return;
        messagesRef.current.scrollTop=messagesRef.current.scrollHeight;
    }

    function sendMessage(e){
        e && e.preventDefault();
        if(!ws || ws.readyState!==1) return alert("not connected");
        if(!text.trim()) return;
        ws.send(JSON.stringify({action:"message",text}));
        setText("");
    }

    return(
        <div style={{display:"flex",flexDirection:"column",height:"100%"}}>
            <div style={{padding:8, borderBottom:"1px solid #eee",display:"flex",justifyContent:"space-between"}}>
                <div><strong>Session:</strong>{sessionId}</div>
                <div><strong>{connected?<span style={{color:'green'}}>online</span>:<span style={{color:'red'}}>offline</span>}</strong></div>
            </div>

            <div ref={messagesRef} style={{flex:1,overflowY:"auto",padding:12,background:"#fafafa"}}>
                {messages.map(m=>(
                    <div key={m.id} style={{marginBottom:10}}>
                        <div style={{fontSize:12,color:"#666"}}>
                            <strong>{m.sender}</strong> <small>({m.role})</small> • {new Date(m.created_at).toLocaleTimeString()}
                        </div>
                        <div>{m.text}</div>
                    </div>
                ))}
            </div>

            <form onSubmit={sendMessage} style={{display:"flex",gap:8,padding:8,borderTop:"1px solid #eee"}}>
                <input value={text} onChange={(e)=>setText(e.target.value)} placeholder="Type a message" style={{flex:1,padding:8}}/>
                <button type="submit">Send</button>
            </form>
        </div>
    );
}