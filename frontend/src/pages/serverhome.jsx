import React, { useState, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import ServerHeader from '../components/ServerHeader';
import ServerList from '../components/ServerList';
import { servers, categories as initialCategories } from '../data';

function Home() {
    const [selectedCategory, setSelectedCategory] = useState('all');

    // Calculate counts dynamically based on servers list
    const categoriesWithCounts = useMemo(() => {
        return initialCategories.map(cat => {
            let count = 0;
            if (cat.id === 'all') {
                count = servers.length;
            } else {
                count = servers.filter(s => s.category === cat.id).length;
            }
            return { ...cat, count };
        });
    }, []);

    const filteredServers = selectedCategory === 'all'
        ? servers
        : servers.filter(server => server.category === selectedCategory);

    return (
        <div style={{ display: 'flex', minHeight: '100vh', maxWidth: '1400px', margin: '0 auto' }}>
            <Sidebar
                categories={categoriesWithCounts}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
            />

            <main style={{ flex: 1, padding: '48px 64px' }}>
                <ServerHeader />
                <ServerList servers={filteredServers} />
            </main>
        </div>
    );
}

export default Home;
