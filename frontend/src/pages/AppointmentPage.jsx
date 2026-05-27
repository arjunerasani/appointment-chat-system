import React, { useState, useEffect } from 'react';
import { CalendarCheck, ArrowLeft, CheckCircle, Loader2, AlertCircle, MessageSquare, XCircle } from 'lucide-react';

export default function AppointmentPage() {
    const [formData, setFormData] = useState({ username: '', email: '', reason: '' });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    // session runtime data
    const [userToken, setUserToken] = useState(null);
    const [liveTicket, setLiveTicket] = useState(null);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await fetch('http://localhost:8080/appointment/request', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setUserToken(data.userToken);
            } else {
                setError(data.error || 'Server rejected registration values.');
            }
        } catch (err) {
            setError('Failed to connect to the server. Is your backend running?');
        } finally {
            setLoading(false);
        }
    };

    // Keep an open background look checking the state machine status
    useEffect(() => {
        if (!userToken) return;

        const updateLifecycleMetrics = async () => {
            try {
                const response = await fetch(`http://localhost:8080/appointment/status/${userToken}`);

                if (response.ok) {
                    const data = await response.json();
                    setLiveTicket(data);
                } else {
                    setError('Lost synchronization with ticket channel context.');
                }
            } catch (err) {
                console.error('Handshake polling failure:', err);
            }
        };

        updateLifecycleMetrics();

        const threadTracker = setInterval(updateLifecycleMetrics, 3500);
        return () => clearInterval(threadTracker);
    }, [userToken]);

    const handleCancelQueue = async () => {
        if (!window.confirm("Are you sure you want to cancel this support session?")) {
            return;
        }

        try {
            const response = await fetch(`http://localhost:8080/appointment/cancel/${userToken}`, {
                method: 'PUT'
            });

            if (response.ok) {
                setUserToken(null);
                setLiveTicket(null);
                setFormData({ username: '', email: '', reason: '' });
                alert("Your appointment request has been cancelled.");
            }
        } catch (err) {
            setError('Could not process execution cancellation commands safely.');
        }
    };

    // live chat interface
    if (liveTicket && (liveTicket.status === 'ACTIVE' || liveTicket.status === 'ASSIGNED')) {
        return (
            <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', padding: '40px', fontFamily: 'sans-serif' }}>
                <div style={{ maxWidth: '800px', margin: '0 auto', backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}>
                    <div style={{ borderBottom: '1px solid #edf2f7', paddingBottom: '16px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <span style={{ fontSize: '0.8rem', color: '#2b6cb0', fontWeight: '700', backgroundColor: '#ebf8ff', padding: '4px 8px', borderRadius: '4px' }}>
                                {liveTicket.status === 'ASSIGNED' ? 'ESTABLISHING AGENT SYNC' : 'LIVE SUPPORT CHANNEL'}
                            </span>
                            <h2 style={{ margin: '6px 0 0 0', color: '#1a202c' }}>Support Room #{liveTicket.appointmentNumber}</h2>
                        </div>
                        <button onClick={handleCancelQueue} style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#e53e3e', padding: '8px 16px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                            Leave Chat
                        </button>
                    </div>

                    <div style={{ height: '400px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#a0aec0' }}>
                        <div style={{ textAlign: 'center' }}>
                            <MessageSquare size={40} style={{ marginBottom: '12px', color: '#cbd5e0' }} />
                            <p style={{ margin: 0, fontWeight: '500' }}>WebSocket Room Core Operational Window</p>
                            <span style={{ fontSize: '0.85rem' }}>Channel Target: /topic/appointment/{userToken}</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // queue waiting interface
    if (liveTicket && liveTicket.status === 'WAITING') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '20px' }}>
                <div style={{ maxWidth: '460px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#3182ce', marginBottom: '20px', display: 'flex', justifyContent: 'center' }} className="animate-pulse"><Loader2 size={56} className="animate-spin" /></div>
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#1a202c', marginBottom: '12px' }}>Connecting to Staff...</h2>
                    <p style={{ color: '#718096', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.6' }}>
                        Please wait until we connect you with an available staff member.
                    </p>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
                        <div style={{ backgroundColor: '#f7fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase' }}>Queue Position</span>
                            <p style={{ fontSize: '1.6rem', fontWeight: '800', color: '#2b6cb0', margin: '4px 0 0 0' }}>{liveTicket.position}</p>
                        </div>
                        <div style={{ backgroundColor: '#f7fafc', padding: '14px', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                            <span style={{ fontSize: '0.75rem', color: '#a0aec0', fontWeight: '600', textTransform: 'uppercase' }}>Ticket Ref</span>
                            <p style={{ fontSize: '1.4rem', fontWeight: '800', color: '#4a5568', margin: '6px 0 0 0' }}>#{liveTicket.appointmentNumber}</p>
                        </div>
                    </div>

                    <button onClick={handleCancelQueue} style={{ width: '100%', padding: '12px', backgroundColor: '#fff', border: '1px solid #e2e8f0', color: '#e53e3e', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        <XCircle size={18} /> Cancel Appointment Request
                    </button>
                </div>
            </div>
        );
    }

    if (liveTicket && liveTicket.status === 'COMPLETED') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#f8fafc',
                fontFamily: 'sans-serif', padding: '20px' }}>
                <div style={{ maxWidth: '460px', width: '100%', backgroundColor: '#fff',
                    borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)',
                    padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <CheckCircle size={56} style={{ color: '#38a169', marginBottom: '20px' }} />
                    <h2 style={{ fontSize: '1.6rem', fontWeight: '700', color: '#1a202c', marginBottom: '12px' }}>
                        Appointment Complete
                    </h2>
                    <p style={{ color: '#718096', marginBottom: '24px', fontSize: '0.95rem' }}>
                        Your support session has been completed. Thank you for reaching out!
                    </p>
                    <p style={{ color: '#a0aec0', fontSize: '0.85rem' }}>
                        Reference #{liveTicket.appointmentNumber}
                    </p>
                    <button
                        onClick={() => { setUserToken(null); setLiveTicket(null); setFormData({ username: '', email: '', reason: '' }); }}
                        style={{ marginTop: '24px', width: '100%', padding: '12px',
                            backgroundColor: '#3182ce', color: '#fff', border: 'none',
                            borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>
                        Back to Home
                    </button>
                </div>
            </div>
        );
    }

    // appointment form
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '20px' }}>
            <div style={{ maxWidth: '500px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '40px', border: '1px solid #e2e8f0' }}>
                <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#718096', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '24px', fontWeight: '500' }}>
                    <ArrowLeft size={16} /> Back
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#3182ce', marginBottom: '8px' }}>
                    <CalendarCheck size={32} />
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c', margin: 0 }}>Request Support</h1>
                </div>
                <p style={{ color: '#718096', fontSize: '0.95rem', marginBottom: '32px' }}>Enter your details to register into the system queue pool.</p>

                {error && (
                    <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '12px 16px', borderRadius: '8px', border: '1px solid #feb2b2', fontSize: '0.9rem', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Your Name</label>
                        <input type="text" name="username" required value={formData.username} onChange={handleChange} placeholder="John Doe" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Email Address (Optional)</label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="john@example.com" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Reason for Support</label>
                        <textarea name="reason" required rows="4" value={formData.reason} onChange={handleChange} placeholder="Describe the problem..." style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '1rem', fontFamily: 'sans-serif', boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px' }}>
                        {loading ? <><Loader2 size={18} className="animate-spin" /> Enqueueing...</> : 'Join Support Queue'}
                    </button>
                </form>
            </div>
        </div>
    );
}