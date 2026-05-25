import React from 'react';
import {User, ShieldAlert} from 'lucide-react';
import './Gateway.css';

export default function gateway() {
    // this is used for staff login via google oauth2
    const handleStaffLogin = () => {
        window.location.href = 'http://localhost:8080/oauth2/authorization/google';
    };

    return (
        <div className="gateway-container">
            <div className="gateway-card">
                <h1 className="gateway-title">Appointment Chat System</h1>
                <p className="gateway-subtitle">Please choose an option</p>

                <div className="gateway-options">
                    {/* user path */}
                    <a href="/appointment" className="option-card client-theme">
                        <div className="icon-wrapper">
                            <User size={26}/>
                        </div>
                        <div className="text-block">
                            <h2 className="option-title">I am a Client</h2>
                            <p className="option-desc">Book an appointment and chat with support</p>
                        </div>
                    </a>

                    {/* staff path */}
                    <button onClick={handleStaffLogin} className="option-card staff-theme">
                        <div className="icon-wrapper">
                            <ShieldAlert size={26}/>
                        </div>
                        <div className="text-block">
                            <h2 className="option-title">I am Staff / Support</h2>
                            <p className="option-desc">Sign in via Google to access dashboard</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    );
}