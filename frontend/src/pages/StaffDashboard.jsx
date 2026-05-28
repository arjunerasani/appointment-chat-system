import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LogOut, Shield, Activity, MessageSquare, AlertCircle } from 'lucide-react';
import ChatWindow from './ChatWindow';

export default function StaffDashboard() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeAssignment, setActiveAssignment] = useState(null);
    const [systemMetrics, setSystemMetrics] = useState({ waitingCount: 0 });
    const [error, setError] = useState('');
    const [staffStatus, setStaffStatus] = useState('ONLINE_AVAILABLE');

    useEffect(() => {
        const tokenFromUrl = searchParams.get('token');

        if (tokenFromUrl) {
            localStorage.setItem('staff_token', tokenFromUrl);
            navigate('/staff-dashboard', { replace: true });
            return;
        }

        const savedToken = localStorage.getItem('staff_token');

        if (!savedToken) {
            console.warn("No authentication state discovered. Redirecting to login.")
            window.location.href = 'http://localhost:8080/oauth2/authorization/google';
            return;
        }

        // checkout routine
        const checkStaffStatusAndAssignments = async () => {
            try {
                const response = await fetch('http://localhost:8080/api/staff/status-check', {
                    headers: { 'Authorization': `Bearer ${savedToken}`, 'Content-Type': 'application/json' }
                });

                if (response.ok) {
                    const data = await response.json();
                    // data contains activeAssignment object if allocated, plus global waiting counts
                    setActiveAssignment(data.activeAssignment || null);
                    setStaffStatus(data.staffStatus || 'ONLINE_AVAILABLE');
                    setSystemMetrics({ waitingCount: data.waitingCount || 0});
                    setError('');
                } else if (response.status === 401 || response.status === 403) {
                    // token expired or invalid
                    localStorage.removeItem('staff_token');
                    window.location.href = 'http://localhost:8080/oauth2/authorization/google';
                } else {
                    setError('Failed to process routing.');
                }
            } catch (err) {
                setError('Could not connect to the system backend.');
            } finally {
                setLoading(false);
            }
        };

        checkStaffStatusAndAssignments();

        // Set up polling interval to check for routed FIFO assignments every 5 seconds
        const interval = setInterval(checkStaffStatusAndAssignments, 5000);
        return () => clearInterval(interval);
    }, [searchParams, navigate]);

    const handleLogout = () => {
        localStorage.removeItem('staff_token');
        navigate('/');
    };

    const handleCompleteAppointment = async () => {
        if (!window.confirm("Mark this appointment as complete?")) {
            return;
        }

        const savedToken = localStorage.getItem('staff_token');

        try {
            const response = await fetch(`http://localhost:8080/api/staff/complete/${activeAssignment.id}`,
                {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${savedToken}`,
                        'Content-Type': 'application/json'
                    }
                });

            const data = await response.json();

            if (response.ok) {
                setActiveAssignment(null);
            } else {
                alert(`Error: ${data.error}`);
            }
        } catch (err) {
            setError('Could not reach the server');
        }
    }

    if (loading) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
                <p style={{ fontSize: '1.1rem', color: '#4a5568', fontFamily: 'sans-serif' }}>Synchronizing Core Command Parameters...</p>
            </div>
        );
    }

    const statusColor = staffStatus === 'ONLINE_BUSY' ? '#d69e2e' : '#38a169';
    const statusBg = staffStatus === 'ONLINE_BUSY' ? '#fffff0' : '#f0fff4';
    const statusBorder = staffStatus === 'ONLINE_BUSY' ? '#fefcbf' : '#c6f6d5';

    return (
        <div style={{ minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: 'sans-serif' }}>
            {/* top navigation bar */}
            <nav style={{ backgroundColor: '#ffffff', borderBottom: '1px solid #e2e8f0', padding: '16px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#4c51bf' }}>
                    <Shield size={28} />
                    <span style={{ fontSize: '1.3rem', fontWeight: '700', color: '#1a202c' }}>Staff Dashboard</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem',
                        color: statusColor, fontWeight: '600', backgroundColor: statusBg,
                        padding: '6px 12px', borderRadius: '20px', border: `1px solid ${statusBorder}` }}>
                        <div style={{ width: '8px', height: '8px', backgroundColor: statusColor, borderRadius: '50%' }}></div>
                        Status: {staffStatus}
                    </div>
                    <button onClick={handleLogout} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', cursor: 'pointer', color: '#e53e3e', fontWeight: '600' }}>
                        <LogOut size={18} /> Log Out
                    </button>
                </div>
            </nav>

            <main style={{ padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
                {error && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#fff5f5', color: '#c53030', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.95rem', border: '1px solid #feb2b2' }}>
                        <AlertCircle size={18} /> {error}
                    </div>
                )}

                {/* check if live chat was routed */}
                {activeAssignment ? (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '30px' }}>
                        <div style={{ backgroundColor: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', padding: '24px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #edf2f7', paddingBottom: '16px', marginBottom: '20px' }}>
                                <div>
                                    <span style={{ fontSize: '0.8rem', color: '#4c51bf', fontWeight: '700', backgroundColor: '#e0e7ff', padding: '4px 8px', borderRadius: '4px' }}>ACTIVE ROUTE</span>
                                    <h2 style={{ margin: '8px 0 2px 0', fontSize: '1.4rem', color: '#1a202c' }}>{activeAssignment.userName}</h2>
                                    <p style={{ margin: 0, color: '#718096', fontSize: '0.9rem' }}>Reason: {activeAssignment.reason}</p>
                                </div>
                                <button onClick={handleCompleteAppointment} style={{ backgroundColor: '#e53e3e', color: '#fff', border: 'none', padding: '10px 20px', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}>
                                    Complete Appointment
                                </button>
                            </div>

                            {/* active chat */}
                            {activeAssignment && activeAssignment.id && (
                            <ChatWindow
                                appointmentId={activeAssignment.id}
                                senderType="STAFF"
                                senderId={activeAssignment.assignedStaffId}
                                senderName="Support Staff"
                            />)}
                        </div>
                    </div>
                ) : (
                    <div>
                        <div style={{ background: '#fff', borderLeft: '4px solid #4c51bf', padding: '24px', borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.01)', marginBottom: '32px' }}>
                            <h2 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#2d3748' }}>System Idle</h2>
                            <p style={{ margin: 0, color: '#718096' }}>No active assignments. The server will route to the next ticket the moment it arrives.</p>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
                            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', border: '1px solid #edf2f7', boxShadow: '0 4px 6px rgba(0,0,0,0.01)' }}>
                                <div style={{ color: '#4c51bf', marginBottom: '12px' }}><Activity size={24} /></div>
                                <h3 style={{ fontSize: '0.85rem', color: '#718096', textTransform: 'uppercase', margin: '0 0 6px 0' }}>Global Queue Pool</h3>
                                <p style={{ fontSize: '2rem', fontWeight: '700', color: '#2d3748', margin: 0 }}>{systemMetrics.waitingCount} clients</p>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}