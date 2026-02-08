import React from 'react';

const ServerCard = ({ server }) => {
    return (
        <div style={{
            backgroundColor: 'var(--card-bg)',
            borderRadius: 'var(--radius)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '1px solid var(--border-color)',
            height: '100%',
            opacity: server.enabled ? 1 : 0.85,
            transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s',
            cursor: server.enabled ? 'pointer' : 'default',
            position: 'relative'
        }}
            onMouseEnter={(e) => {
                if (server.enabled) {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = 'var(--shadow-md)';
                    e.currentTarget.style.borderColor = 'var(--text-muted)';
                }
            }}
            onMouseLeave={(e) => {
                if (server.enabled) {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                }
            }}
        >
            {/* Banner Area */}
            <div style={{
                height: '140px',
                background: server.image
                    ? `url(${server.image}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #5865F2 0%, #4752c4 100%)',
                position: 'relative'
            }}>
                {!server.enabled && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        background: 'rgba(255, 255, 255, 0.4)', // Lighter overlay
                        backdropFilter: 'blur(3px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        <div style={{
                            background: 'rgba(0,0,0,0.7)', // Dark background for contrast
                            color: '#fff',
                            padding: '6px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '700',
                            letterSpacing: '0.05em',
                            border: '1px solid rgba(255,255,255,0.2)',
                            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
                        }}>
                            COMING SOON
                        </div>
                    </div>
                )}
            </div>

            <div style={{ padding: '20px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{
                    fontSize: '11px',
                    textTransform: 'uppercase',
                    color: 'var(--text-muted)',
                    marginBottom: '8px',
                    fontWeight: '700',
                    letterSpacing: '0.05em'
                }}>
                    {server.category.toUpperCase()}
                </div>

                <h3 style={{
                    margin: '0 0 8px 0',
                    fontSize: '18px',
                    color: 'var(--text-main)'
                }}>{server.name}</h3>

                <p style={{
                    margin: '0 0 24px 0',
                    fontSize: '14px',
                    lineHeight: '1.6',
                    color: 'var(--text-muted)',
                    flex: 1
                }}>
                    {server.description}
                </p>

                {server.enabled ? (
                    <a href="/auth" style={{
                        width: '100%',
                        padding: '10px',
                        backgroundColor: 'var(--primary)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s',
                        height: '40px',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}
                        onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--primary-hover)'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'var(--primary)'}
                    >
                        Join Server
                    </a>
                ) : (
                    <div style={{
                        textAlign: 'center',
                        padding: '10px',
                        background: 'rgba(0,0,0,0.03)', // Subtle gray
                        border: '1px solid var(--border-color)',
                        borderRadius: '6px',
                        color: 'var(--text-muted)',
                        fontSize: '13px',
                        fontWeight: '500',
                        height: '40px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                    }}>
                        Coming Soon
                    </div>
                )}
            </div>
        </div>
    );
};

export default ServerCard;
