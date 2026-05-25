import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Shield, Users, MessageSquare, Clock, ArrowRight } from 'lucide-react';

export default function StaffDashboard() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [appointments, setAppointments] = useState([]);
    const [error, setError] = useState('');

    useEffect(() => {
        // validate token
        const tokenFromUrl = searchParams.get('token');
        if (tokenFromUrl) {
            localStorage.setItem('staff_token', tokenFromUrl);
            navigate('/staff-dashboard', { replace: true });
            return;
        }

        const savedToken = localStorage.getItem('staff_token');
        if (!savedToken) {
            navigate('/');
            return;
        }

        // fetch the pending queue data
        const fetchQueueData = async () => {
            try {
                const response = await fetch('http://localhost:8080/appointment/pending', {
                    headers: { 'Authorization': `Bearer ${savedToken}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    setAppointments(data);
                } else {
                    setError('Failed to fetch operational queue data.');
                }
            } catch (err) {
                setError('Could not connect to service endpoint.');
            } finally {
                setLoading(false);
            }
        };

        fetchQueueData();
    }, [searchParams, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('staff_token');
        navigate('/');
    };

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <p style={{ fontSize: '1.1rem', color: '#4a5568', fontFamily: 'sans-serif' }}>Loading command configurations...</p>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
            {/* top navigation bar */}
            <nav style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4c51bf' }}>
                    <Shield size={28} />
                    <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1a202c' }}>Staff Command Center</span>
                </div>
                <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#e53e3e', fontWeight: '600' }}>
                    <LogOut size={18} /> Log Out
                </button>
            </nav>

            {/* dashboard workspace */}
            <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
                <h1 style={{ fontSize: '1.8rem', color: '#2d3748', marginBottom: '6px' }}>Queue Management</h1>
                <p style={{ color: '#718096', marginBottom: '32px' }}>Review and assign incoming user interactions from the live channel pool.</p>

                {/* metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px', marginBottom: '40px' }}>
                    <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
                        <div style={{ color: '#3182ce', marginBottom: '12px' }}><Users size={24} /></div>
                        <h3 style={{ fontSize: '0.85rem', color: '#718096', textTransform: 'uppercase', margin: '0 0 6px 0', letterSpacing: '0.5px' }}>Waiting Clients</h3>
                        <p style={{ fontSize: '2rem', fontWeight: '700', color: '#2d3748', margin: 0 }}>{appointments.length}</p>
                    </div>
                </div>

                {/* Queue Interactive Stream Display */}
                <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
                    <h2 style={{ fontSize: '1.2rem', color: '#2d3748', marginBottom: '20px', fontWeight: '600' }}>Incoming Support Requests</h2>

                    {appointments.length === 0 ? (
                        <div style={{ padding: '40px', textAlign: 'center', color: '#a0aec0' }}>
                            No users currently awaiting allocation. You are entirely caught up!
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            {appointments.map((app) => (
                                <div key={app.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px', border: '1px solid #e2e8f0', borderRadius: '10px', backgroundColor: '#f8fafc' }}>
                                    <div style={{ textAlign: 'left' }}>
                                        <span style={{ fontSize: '0.85rem', color: '#3182ce', fontWeight: '700', backgroundColor: '#ebf8ff', padding: '4px 8px', borderRadius: '4px' }}>
                                            #{app.appointmentNumber}
                                        </span>
                                        <h4 style={{ margin: '12px 0 4px 0', fontSize: '1.1rem', color: '#2d3748', fontWeight: '600' }}>{app.username}</h4>
                                        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', color: '#718096' }}>{app.email}</p>
                                        <p style={{ margin: 0, fontSize: '0.95rem', color: '#4a5568', fontStyle: 'italic' }}>"{app.reason}"</p>
                                    </div>
                                    <button style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px', backgroundColor: '#4c51bf', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                        Accept Ticket <ArrowRight size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}