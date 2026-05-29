import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Shield, Loader2 } from 'lucide-react';

export default function StaffTokenLogin() {
    const { token } = useParams();
    const navigate = useNavigate();
    const [status, setStatus] = useState('verifying'); // verifying, valid, expired, invalid

    useEffect(() => {
        const verifyToken = async () => {
            try {
                const response = await fetch(
                    `http://localhost:8080/api/auth/tokens/verify/${token}`
                );

                if (response.ok) {
                    setStatus('valid');
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

    const handleLogin = () => {
        // store the claim token so after OAuth the dashboard knows what to claim
        localStorage.setItem('pending_staff_token', token);
        window.location.href = 'http://localhost:8080/oauth2/authorization/google';
    };

    if (status === 'verifying') {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
                justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
                <div style={{ textAlign: 'center' }}>
                    <Loader2 size={40} style={{ color: '#4c51bf', marginBottom: '16px' }} />
                    <p style={{ color: '#718096' }}>Verifying your link...</p>
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
                    <p style={{ color: '#718096', marginBottom: '24px' }}>
                        This link has expired. Please log in directly to check the queue.
                    </p>
                    <button onClick={() => window.location.href = 'http://localhost:8080/oauth2/authorization/google'}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#4c51bf',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontWeight: '600', cursor: 'pointer' }}>
                        Log In to Dashboard
                    </button>
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
                    <p style={{ color: '#718096', marginBottom: '24px' }}>
                        This link is invalid or has already been used.
                    </p>
                    <button onClick={() => navigate('/')}
                            style={{ width: '100%', padding: '12px', backgroundColor: '#4c51bf',
                                color: '#fff', border: 'none', borderRadius: '8px',
                                fontWeight: '600', cursor: 'pointer' }}>
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    // valid — prompt them to log in
    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
            justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
            <div style={{ maxWidth: '420px', width: '100%', textAlign: 'center',
                backgroundColor: '#fff', padding: '40px', borderRadius: '16px',
                border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}>
                <div style={{ color: '#4c51bf', marginBottom: '16px', display: 'flex',
                    justifyContent: 'center' }}>
                    <Shield size={48} />
                </div>
                <h2 style={{ color: '#1a202c', marginBottom: '8px' }}>Staff Claim Link</h2>
                <p style={{ color: '#718096', marginBottom: '28px', lineHeight: '1.6' }}>
                    A user is waiting in the queue. Sign in with Google to claim this appointment
                    and start the chat.
                </p>
                <button onClick={handleLogin}
                        style={{ width: '100%', padding: '14px', backgroundColor: '#4c51bf',
                            color: '#fff', border: 'none', borderRadius: '8px',
                            fontWeight: '600', cursor: 'pointer', fontSize: '1rem' }}>
                    Sign in with Google to Claim
                </button>
            </div>
        </div>
    );
}