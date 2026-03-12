import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../styles/app.css';
import { getApiBaseUrl } from '../config/api';

const API_BASE_URL = getApiBaseUrl();

const UnlockAccount = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [status, setStatus] = useState('loading'); // 'loading', 'success', 'error'
    const [message, setMessage] = useState('Verifying your unlock token...');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid or missing unlock token.');
            return;
        }

        const unlock = async () => {
            try {
                const response = await axios.get(`${API_BASE_URL}/auth/unlock?token=${token}`);
                if (response.data.success) {
                    setStatus('success');
                    setMessage(response.data.message || 'Your account has been successfully unlocked!');
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Failed to unlock account. The link may have expired.');
            }
        };

        unlock();
    }, [token]);

    return (
        <div className="auth-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', backgroundColor: '#f1f5f9' }}>
            <div style={{ backgroundColor: 'white', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', maxWidth: '400px', width: '100%', textAlign: 'center' }}>

                {status === 'loading' && (
                    <div>
                        <div style={{ width: '40px', height: '40px', border: '4px solid #f3f3f3', borderTop: '4px solid #3b82f6', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 20px' }} />
                        <h2 style={{ color: '#334155', marginTop: '0' }}>Please Wait</h2>
                        <p style={{ color: '#64748b' }}>{message}</p>
                    </div>
                )}

                {status === 'success' && (
                    <div>
                        <div style={{ color: '#22c55e', fontSize: '48px', marginBottom: '10px' }}>✓</div>
                        <h2 style={{ color: '#16a34a', marginTop: '0' }}>Account Unlocked</h2>
                        <p style={{ color: '#334155', marginBottom: '25px' }}>{message}</p>
                        <button
                            onClick={() => navigate('/auth')}
                            style={{ backgroundColor: '#3b82f6', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', width: '100%', fontWeight: '600' }}
                        >
                            Return to Login
                        </button>
                    </div>
                )}

                {status === 'error' && (
                    <div>
                        <div style={{ color: '#ef4444', fontSize: '48px', marginBottom: '10px' }}>✗</div>
                        <h2 style={{ color: '#dc2626', marginTop: '0' }}>Unlock Failed</h2>
                        <p style={{ color: '#334155', marginBottom: '25px' }}>{message}</p>
                        <button
                            onClick={() => navigate('/auth')}
                            style={{ backgroundColor: '#64748b', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: '16px', cursor: 'pointer', width: '100%', fontWeight: '600' }}
                        >
                            Return to Login
                        </button>
                    </div>
                )}

                <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
            </div>
        </div>
    );
};

export default UnlockAccount;
