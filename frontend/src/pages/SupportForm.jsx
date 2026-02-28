import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import SidebarLeft from '../components/SidebarLeft';
import { FiArrowLeft, FiSend, FiCheckCircle } from 'react-icons/fi';
import '../styles/HelpCenter.css';

const SupportForm = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        email: '',
        category: 'account',
        subject: '',
        description: ''
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            setLoading(false);
            setSubmitted(true);
        }, 1500);
    };

    return (
        <div className="app">
            <div className="container" style={{ gridTemplateColumns: '280px 1fr' }}>
                <SidebarLeft />
                <main className="main-content" style={{ maxWidth: '100%', padding: 0 }}>
                    <div className="help-center-container">
                        <button className="back-btn" onClick={() => navigate('/help-center')}>
                            <FiArrowLeft /> Back to Help Center
                        </button>

                        <div className="support-form-wrapper">
                            {!submitted ? (
                                <>
                                    <div className="support-header">
                                        <h1>Contact Support</h1>
                                        <p>Tell us about your issue and we'll get back to you as soon as possible.</p>
                                    </div>

                                    <form className="support-form" onSubmit={handleSubmit}>
                                        <div className="form-group">
                                            <label htmlFor="email">Email Address</label>
                                            <input
                                                type="email"
                                                id="email"
                                                name="email"
                                                value={formData.email}
                                                onChange={handleChange}
                                                placeholder="your@email.com"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="category">Issue Category</label>
                                            <div className="select-wrapper">
                                                <select
                                                    id="category"
                                                    name="category"
                                                    value={formData.category}
                                                    onChange={handleChange}
                                                >
                                                    <option value="account">Account & Security</option>
                                                    <option value="bug">Report a Bug</option>
                                                    <option value="content">Content & Moderation</option>
                                                    <option value="feedback">Feedback & Suggestions</option>
                                                    <option value="other">Other</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="subject">Subject</label>
                                            <input
                                                type="text"
                                                id="subject"
                                                name="subject"
                                                value={formData.subject}
                                                onChange={handleChange}
                                                placeholder="Brief summary of the issue"
                                                required
                                            />
                                        </div>

                                        <div className="form-group">
                                            <label htmlFor="description">Description</label>
                                            <textarea
                                                id="description"
                                                name="description"
                                                value={formData.description}
                                                onChange={handleChange}
                                                rows="6"
                                                placeholder="Please describe your issue in detail..."
                                                required
                                            ></textarea>
                                        </div>

                                        <button type="submit" className="submit-btn" disabled={loading}>
                                            {loading ? 'Sending...' : <><FiSend /> Submit Request</>}
                                        </button>
                                    </form>
                                </>
                            ) : (
                                <div className="success-state">
                                    <div className="success-icon">
                                        <FiCheckCircle />
                                    </div>
                                    <h2>Request Submitted!</h2>
                                    <p>Thanks for reaching out. We've received your request and will get back to you at <strong>{formData.email}</strong> shortly.</p>
                                    <button className="submit-btn" onClick={() => navigate('/help-center')}>
                                        Return to Help Center
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default SupportForm;
