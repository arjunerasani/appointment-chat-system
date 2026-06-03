import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, MessageSquare } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function UserTokenRejoin() {
    const { token } = useParams();
    const [status, setStatus] = useState('verifying');
    const [appointmentData, setAppointmentData] = useState(null);

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const response = await fetch(
                    `http://localhost:8080/api/auth/tokens/verify/${token}`
                );

                if (response.ok) {
                    const data = await response.json();
                    setAppointmentData(data);
                    setStatus('valid');

                    // tell the backend the user has returned, transition to ACTIVE
                    await fetch(
                        `http://localhost:8080/appointment/rejoin/${data.appointmentId}`,
                        { method: 'PUT' }
                    );
                } else if (response.status === 410) {
                    setStatus('expired');
                } else {
                    setStatus('invalid');
                }
            } catch (err) {
                setStatus('invalid');
            }
        };

        verifyToken();
    }, [token]);

    if (status === 'verifying') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} style={{ color: '#3182ce', marginBottom: '16px' }} />
                    <p style={{ color: '#718096' }}>Reconnecting to your session...</p>
                </div>
            </div>
        );
    }

    if (status === 'expired') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
                <div style={{ maxWidth: '400px', textAlign: 'center', backgroundColor: '#fff',
                    padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>⏰</div>
                    <h2 style={{ color: '#1a202c', marginBottom: '12px' }}>Link Expired</h2>
                    <p style={{ color: '#718096' }}>
                        This rejoin link has expired. Your appointment may still be active —
                        contact support for assistance.
                    </p>
                </div>
            </div>
        );
    }

    if (status === 'invalid') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
                <div style={{ maxWidth: '400px', textAlign: 'center', backgroundColor: '#fff',
                    padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: '3rem', marginBottom: '16px' }}>❌</div>
                    <h2 style={{ color: '#1a202c', marginBottom: '12px' }}>Invalid Link</h2>
                    <p style={{ color: '#718096' }}>This link is invalid or has already been used.</p>
                </div>
            </div>
        );
    }

    // valid — show the chat room directly
    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px',
            fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff',
                borderRadius: '12px', border: '1px solid #edf2f7', padding: '24px',
                boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                <div style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '16px',
                    marginBottom: '20px' }}>
                    <span style={{ fontSize: '0.8rem', color: '#2b6cb0', fontWeight: '700',
                        backgroundColor: '#ebf8ff', padding: '4px 8px', borderRadius: '4px' }}>
                        LIVE SUPPORT CHANNEL
                    </span>
                    <h2 style={{ margin: '6px 0 0 0', color: '#1a202c' }}>
                        Support Room #{appointmentData?.appointmentNumber}
                    </h2>
                </div>

                <ChatWindow
                    appointmentId={appointmentData?.appointmentId}
                    senderType="USER"
                    senderId={0}
                    senderName="User"
                />
            </div>
        </div>
    );
}