import React from 'react';
import Layout from '../components/Layout';
import SearchUsers from '../components/SearchUsers';
import '../styles/Home.css';

function SearchPage() {
    return (
        <Layout>
            <div style={{ paddingTop: '4px' }}>
                <h2 style={{
                    fontSize: '18px',
                    fontWeight: 600,
                    color: '#111827',
                    marginBottom: '16px'
                }}>
                    🔍 Search Users
                </h2>
                <SearchUsers />
            </div>
        </Layout>
    );
}

export default SearchPage;
