import React from 'react';
import ServerCard from './ServerCard';

function ServerList({ servers }) {
    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px'
        }}>
            {servers.map(server => (
                <ServerCard key={server.id} server={server} />
            ))}
        </div>
    );
}

export default ServerList;
