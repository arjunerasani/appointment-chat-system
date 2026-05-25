import React, { useState } from 'react';
import {CalendarCheck, ArrowLeft, CheckCircle, Loader2} from 'lucide-react';

export default function AppointmentPage() {
    const [formData, setFormData] = useState({ username: '', email: '', reason: '' });
    const [loading, setLoading] = useState(false);
    const [successData, setSuccessData] = useState(null);
    const [error, setError] = useState('');

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
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                setSuccessData(data);
            } else {
                setError(data.error || 'Something went wrong. Please try again.');
            }
        } catch (err) {
            setError('Failed to connect to the server. Is your backend running?');
        } finally {
            setLoading(false);
        }
    };

    // Render Success View if appointment is generated
    if (successData) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '20px' }}>
                <div style={{ maxWidth: '450px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '40px', textAlign: 'center', border: '1px solid #e2e8f0' }}>
                    <div style={{ color: '#38a169', marginBottom: '20px', display: 'flex', justifyContent: 'center' }}><CheckCircle size={64} /></div>
                    <h2 style={{ fontSize: '1.8rem', fontWeight: '700', color: '#1a202c', marginBottom: '12px' }}>You are in Queue!</h2>
                    <p style={{ color: '#718096', marginBottom: '24px', fontSize: '0.95rem', lineHeight: '1.5' }}>Your support request has been recorded. A staff member will be with you shortly.</p>

                    <div style={{ backgroundColor: '#f7fafc', padding: '16px', borderRadius: '12px', border: '1px dashed #cbd5e0', marginBottom: '32px' }}>
                        <span style={{ fontSize: '0.85rem', color: '#a0aec0', textTransform: 'uppercase', fontWeight: '600', letterSpacing: '0.5px' }}>Ticket Reference Number</span>
                        <p style={{ fontSize: '2rem', fontWeight: '800', color: '#2b6cb0', margin: '4px 0 0 0', letterSpacing: '2px' }}>#{successData.appointmentNumber}</p>
                    </div>

                    <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: '#4a5568', textDecoration: 'none', fontWeight: '600', fontSize: '0.95rem' }}>
                        <ArrowLeft size={16} /> Return to Gateway
                    </a>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f8fafc', fontFamily: 'sans-serif', padding: '20px' }}>
            <div style={{ maxWidth: '500px', width: '100%', backgroundColor: '#fff', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', padding: '40px', border: '1px solid #e2e8f0' }}>

                {/* back button */}
                <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#718096', textDecoration: 'none', fontSize: '0.9rem', marginBottom: '24px', fontWeight: '500' }}>
                    <ArrowLeft size={16} /> Back
                </a>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#3182ce', marginBottom: '8px' }}>
                    <CalendarCheck size={32} />
                    <h1 style={{ fontSize: '1.75rem', fontWeight: '700', color: '#1a202c', margin: 0 }}>Request Support</h1>
                </div>
                <p style={{ color: '#718096', fontSize: '0.95rem', marginBottom: '32px' }}>Enter your info to connect with our staff.</p>

                {error && (
                    <div style={{ backgroundColor: '#fff5f5', color: '#c53030', padding: '12px 16px', borderRadius: '8px', border: '1px solid #feb2b2', fontSize: '0.9rem', marginBottom: '24px' }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexNavigation: 'column', flexDirection: 'column', gap: '20px' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Your Name</label>
                        <input type="text" name="username" required value={formData.username} onChange={handleChange} placeholder="John Doe" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Email Address</label>
                        <input type="email" name="email" required value={formData.email} onChange={handleChange} placeholder="john@example.com" style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '1rem', boxSizing: 'border-box' }} />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', color: '#4a5568', marginBottom: '6px' }}>Reason for Visit</label>
                        <textarea name="reason" required rows="4" value={formData.reason} onChange={handleChange} placeholder="Briefly describe what you need assistance with..." style={{ width: '100%', padding: '12px', border: '1px solid #cbd5e0', borderRadius: '8px', fontSize: '1rem', fontFamily: 'sans-serif', resize: 'vertical', boxSizing: 'border-box' }} />
                    </div>

                    <button type="submit" disabled={loading} style={{ width: '100%', padding: '14px', backgroundColor: '#3182ce', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '1rem', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginTop: '12px', transition: 'background-color 0.2s' }}>
                        {loading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" /> Submitting...
                            </>
                        ) : (
                            'Join Support Queue'
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}