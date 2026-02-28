import React, { useState } from 'react';
import SidebarLeft from '../components/SidebarLeft';
import {
    FiGlobe,
    FiUser,
    FiServer,
    FiShield,
    FiHelpCircle,
    FiLock,
    FiChevronDown,
    FiChevronUp,
    FiSearch
} from 'react-icons/fi';
import '../styles/HelpCenter.css';

const HELP_CATEGORIES = [
    {
        id: 'federation',
        title: 'Guide to Federation',
        icon: <FiGlobe />,
        description: 'Learn how our decentralized network connects different servers and communities together.',
        faqs: [
            {
                q: "What is a federated network?",
                a: "A federated network is a collection of independent servers that can communicate with each other. Unlike centralized platforms, no single entity owns all the data."
            },
            {
                q: "How do I follow someone on another server?",
                a: "You can follow users on other servers by searching for their full handle (e.g., username@servername). Once followed, their posts will appear in your federated timeline."
            },
            {
                q: "Can I move my account to another server?",
                a: "Currently, you need to create a new account on the new server. We are working on migration tools to help you move your followers and data."
            }
        ]
    },
    {
        id: 'account',
        title: 'Account Settings',
        icon: <FiUser />,
        description: 'Manage your profile, security preferences, and account configurations.',
        faqs: [
            {
                q: "How do I change my password?",
                a: "Go to Settings > Security > Change Password. You'll need to enter your current password to confirm the change."
            },
            {
                q: "Can I set my profile to private?",
                a: "Yes, you can toggle account privacy in your Profile Settings. This will require you to approve new followers."
            }
        ]
    },
    {
        id: 'server',
        title: 'Server Management',
        icon: <FiServer />,
        description: 'Resources for server administrators and community managers.',
        faqs: [
            {
                q: "How do I create a new channel?",
                a: "Admins can create channels from the Server Details page. Click 'Create Channel' and set the visibility and rules."
            },
            {
                q: "How do I moderate content?",
                a: "Use the Dashboard to review reported posts. You can hide posts or ban users who violate server rules."
            }
        ]
    },
    {
        id: 'guidelines',
        title: 'Community Guidelines',
        icon: <FiShield />,
        description: 'Understand the rules and standards that keep our community safe.',
        faqs: [
            {
                q: "What content is prohibited?",
                a: "Hate speech, harassment, and illegal content are strictly prohibited across all federated servers."
            },
            {
                q: "How do I report a violation?",
                a: "Click the three dots (...) on any post or profile and select 'Report'. Our moderation team will review it."
            }
        ]
    },
    {
        id: 'technical',
        title: 'Technical Support',
        icon: <FiHelpCircle />,
        description: 'Troubleshooting guides and bug reporting for the platform.',
        faqs: [
            {
                q: "The app is loading slowly",
                a: "Check your internet connection first. If the issue persists, the specific server might be experiencing high traffic."
            },
            {
                q: "I found a bug, where do I report it?",
                a: "Please visit our official GitHub repository or contact the server admin directly."
            }
        ]
    },
    {
        id: 'privacy',
        title: 'Privacy & Safety',
        icon: <FiLock />,
        description: 'Learn about how we protect your data and privacy rights.',
        faqs: [
            {
                q: "Who can see my posts?",
                a: "It depends on your post settings. Public posts are visible to everyone. Followers-only posts are only visible to approved followers."
            },
            {
                q: "Is my data sold to advertisers?",
                a: "No. This is a privacy-focused platform. We do not sell user data to third parties."
            }
        ]
    }
];

const HelpCenter = () => {
    const [activeCard, setActiveCard] = useState(null);
    const [activeQuestion, setActiveQuestion] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const toggleCard = (id) => {
        if (activeCard === id) {
            setActiveCard(null);
            setActiveQuestion(null);
        } else {
            setActiveCard(id);
            setActiveQuestion(null);
        }
    };

    const toggleQuestion = (e, qIndex) => {
        e.stopPropagation(); // Prevent card toggle when clicking question
        if (activeQuestion === qIndex) {
            setActiveQuestion(null);
        } else {
            setActiveQuestion(qIndex);
        }
    };

    const filteredCategories = HELP_CATEGORIES.filter(cat =>
        cat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cat.faqs.some(faq => faq.q.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="app">
            <div className="container" style={{ gridTemplateColumns: '280px 1fr' }}>
                <SidebarLeft />
                <main className="main-content" style={{ maxWidth: '100%', padding: 0 }}>
                    <div className="help-center-container">
                        <div className="search-section">
                            <h2>How can we help you?</h2>
                            <div className="help-search-bar">
                                <input
                                    type="text"
                                    placeholder="Type in search..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="help-center-header">
                            <h1>Help Center</h1>
                            <p>Select a category to view frequently asked questions</p>
                        </div>

                        <div className="help-cards-grid">
                            {filteredCategories.map((category) => (
                                <div
                                    key={category.id}
                                    className={`help-card ${activeCard === category.id ? 'active' : ''}`}
                                    onClick={() => toggleCard(category.id)}
                                >
                                    <div className="card-header">
                                        <div className="card-icon">
                                            {category.icon}
                                        </div>
                                        <div className="card-title">
                                            <h3>{category.title}</h3>
                                        </div>
                                    </div>

                                    <div className="card-description">
                                        {category.description}
                                    </div>

                                    {activeCard === category.id && (
                                        <div className="faq-list">
                                            {category.faqs.map((faq, index) => (
                                                <div key={index} className="faq-item">
                                                    <div
                                                        className="faq-question"
                                                        onClick={(e) => toggleQuestion(e, index)}
                                                    >
                                                        <span>{faq.q}</span>
                                                        {activeQuestion === index ? <FiChevronUp /> : <FiChevronDown />}
                                                    </div>

                                                    {activeQuestion === index && (
                                                        <div className="faq-answer">
                                                            {faq.a}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {filteredCategories.length === 0 && (
                            <div className="empty-state">
                                <p>No results found for "{searchQuery}"</p>
                            </div>
                        )}

                        <div className="contact-support-cta">
                            <h3>Still need help?</h3>
                            <p>Can't find the answer you're looking for? Our support team is here to help.</p>
                            <button
                                className="contact-btn"
                                onClick={() => window.location.href = '/help-center/contact'}
                            >
                                Contact Support
                            </button>
                        </div>

                    </div>
                </main>
            </div>
        </div>
    );
};

export default HelpCenter;
