import React, {useState, useEffect, useRef} from 'react';
import {Client} from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import {Send} from 'lucide-react';

export default function ChatWindow({ appointmentId, senderType, senderId, senderName, authToken}) {
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [connected, setConnected] = useState(false);
    const clientRef = useRef(null);
    const bottomRef = useRef(null);

    // load chat history on mount
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const response = await fetch(`http://localhost:8080/api/chat/history/${appointmentId}`);

                if (response.ok) {
                    const data = await response.json();
                    setMessages(data);
                }
            } catch (err) {
                console.error('Failed to load chat history:', err);
            }
        };

        loadHistory();
    }, [appointmentId]);

    // connect to WebSocket
    useEffect(() => {
        const client = new Client({
            webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
            connectHeaders: authToken ? { Authorization: `Bearer ${authToken}` } : {},
            onConnect: () => {
                setConnected(true);
                // subscribe to this appointment's topic
                client.subscribe(`/topic/appointment/${appointmentId}`, (frame) => {
                    const message = JSON.parse(frame.body);
                    setMessages(prev => [...prev, message]);
                });
            },
            onDisconnect: () => setConnected(false),
            reconnectDelay: 3000,
        });

        client.activate();
        clientRef.current = client;

        return () => client.deactivate();
    }, [appointmentId]);

    // auto scroll to bottom on new messages
    // useEffect(() => {
    //     bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    // }, [messages]);

    const handleSend = () => {
        if (!inputText.trim() || !connected) return;

        clientRef.current.publish({
            destination: `/app/chat/${appointmentId}`,
            body: JSON.stringify({
                senderType,
                senderId,
                messageText: inputText.trim()
            })
        });

        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const formatTime = (createdAt) => {
        if (!createdAt) {
            return '';
        }

        return new Date(createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '400px' }}>
            {/* connection status */}
            <div style={{ fontSize: '0.75rem', color: connected ? '#38a169' : '#e53e3e',
                marginBottom: '8px', fontWeight: '600' }}>
                {connected ? '● Connected' : '○ Connecting...'}
            </div>

            {/* messages area */}
            <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#f8fafc',
                borderRadius: '8px', border: '1px solid #e2e8f0', padding: '16px',
                display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#a0aec0', marginTop: '40px', fontSize: '0.9rem' }}>
                        No messages yet. Say hello!
                    </div>
                )}
                {messages.map((msg, index) => {
                    const isMe = msg.senderType === senderType;
                    return (
                        <div key={index} style={{ display: 'flex',
                            justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                            <div style={{ maxWidth: '70%' }}>
                                <div style={{ fontSize: '0.75rem', color: '#a0aec0',
                                    marginBottom: '3px',
                                    textAlign: isMe ? 'right' : 'left' }}>
                                    {isMe ? 'You' : msg.senderType === 'STAFF' ? 'Support Staff' : 'User'} · {formatTime(msg.createdAt)}
                                </div>
                                <div style={{ backgroundColor: isMe ? '#3182ce' : '#fff',
                                    color: isMe ? '#fff' : '#2d3748',
                                    padding: '10px 14px', borderRadius: '12px',
                                    border: isMe ? 'none' : '1px solid #e2e8f0',
                                    fontSize: '0.95rem', lineHeight: '1.5',
                                    borderBottomRightRadius: isMe ? '2px' : '12px',
                                    borderBottomLeftRadius: isMe ? '12px' : '2px' }}>
                                    {msg.messageText}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>

            {/* input area */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    disabled={!connected}
                    style={{ flex: 1, padding: '10px 14px', border: '1px solid #e2e8f0',
                        borderRadius: '8px', fontSize: '0.95rem', outline: 'none' }}
                />
                <button onClick={handleSend} disabled={!connected || !inputText.trim()}
                        style={{ padding: '10px 16px', backgroundColor: '#3182ce', color: '#fff',
                            border: 'none', borderRadius: '8px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '600',
                            opacity: (!connected || !inputText.trim()) ? 0.5 : 1 }}>
                    <Send size={16} /> Send
                </button>
            </div>
        </div>
    );
}