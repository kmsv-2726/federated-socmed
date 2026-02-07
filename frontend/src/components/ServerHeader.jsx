import React from 'react';

function ServerHeader() {
    return (
        <header style={{ marginBottom: '48px' }}>
            <h1 style={{ fontSize: '36px', margin: '0 0 16px 0', color: 'var(--text-main)', letterSpacing: '-0.03em' }}>
                Find your community
            </h1>
            <p style={{
                fontSize: '16px',
                color: 'var(--text-muted)',
                lineHeight: '1.6',
                maxWidth: '680px'
            }}>
                Mastodon is not a single website. To use it, you need to make an account with a provider—we call them <strong style={{ color: 'var(--primary)' }}>servers</strong>—that lets you connect with other people across the network.
            </p>
        </header>
    );
}

export default ServerHeader;
