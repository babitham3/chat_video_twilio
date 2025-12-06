import React,{useEffect,useState} from "react";
import ChatRoom from "./ChatRoom";

export default function CustomerWidget({apiBase="http://127.0.0.1:8000/api",startHidden=true}){
    const [sessionId,setSessionId]=useState(localStorage.getItem("support_session_id") || null);
    const [visitorID,setVisitorId]=useState(localStorage.getItem("support_visitor") || null);
    const [open,setOpen]=useState(!startHidden);
    const [visitorName,setVisitorName]=useState(localStorage.getItem("support_visitor_name") || "");

    useEffect(()=>{
        if(!visitorID){
        const v="visitor-"+Math.random().toString(36).slice(2,8);
        localStorage.setItem("support_visitor",v);
        setVisitorId(v);
        }
        const savedName = localStorage.getItem("support_visitor_name");
        if (savedName) setVisitorName(savedName);
    },[visitorID]);

    async function createSession(){
        if(sessionId) return sessionId;
        const res=await fetch(`${apiBase}/sessions/`,{
            method:"POST",headers:{"Content-Type":"application/json"},
            body:JSON.stringify({title:"Customer widget session",customer_id:visitorID})
        });
        if(!res.ok) throw new Error("failed creating session");
        const data=await res.json();
        localStorage.setItem("support_session_id",data.id);
        setSessionId(data.id);
        return data.id;
    }

    async function openChat(){
        setOpen(true);
        if(!sessionId){
            try{await createSession();}catch(e) {console.error(e); alert("Could not start chat"); setOpen(false);}
        }
    }
    function closeChat() { setOpen(false);}

    return(
        <>
        <div style={{position:"fixed",right:20,bottom:20,zIndex:9999}}>
            {!open &&(
                <button onClick={openChat} style={{background:"#0b69ff",color:"#fff",padding:"10px 14px",borderRadius:24,border:"none",cursor:"pointer"}}>
                    Chat with us
                </button>
            )}
        </div>
        {open && (
            <div style={{
                position:"fixed",right:20,bottom:20,width:380,height:560,zIndex:9999,
                boxShadow:"0 10px 30px rgba(0,0,0,0.12)", borderRadius: 10, overflow: "hidden", background: "#fff", display: "flex", flexDirection: "column"
            }}>
                <div style={{ padding: 10, borderBottom: "1px solid #c32727ff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong>Support</strong>
                    <div>
                        <button onClick={closeChat}style={{ border: "none", background: "none", cursor: "pointer" ,color:"black"}}>Close</button>
                    </div>
                </div>

                <div style={{flex:1}}>
                    {sessionId?(
                        <ChatRoom sessionId={sessionId} user={visitorID} role="customer" apiBase={apiBase}/>
                    ):(
                        <div style={{padding:20}}>
                            <p> Starting Chat...</p>
                            <button onClick={createSession}>Start</button>
                        </div>
                    )}
                </div>
            </div>
        )}
        </>
    );
}