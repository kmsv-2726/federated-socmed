const Sidebar = ({ categories, selectedCategory, onSelectCategory }) => {
    return (
        <aside style={{
            width: '280px',
            flexShrink: 0,
            padding: '24px 0',
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflowY: 'auto'
        }}>
            <div style={{ marginBottom: '32px', paddingLeft: '24px' }}>
                <h2 style={{ fontSize: '20px', color: 'var(--text-main)', marginBottom: '8px' }}>Categories</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', lineHeight: '1.6' }}>
                    Discover communities based on your interests.
                </p>
            </div>

            <nav style={{ padding: '0 16px' }}>
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onSelectCategory(cat.id)}
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            width: '100%',
                            background: selectedCategory === cat.id ? 'rgba(88, 101, 242, 0.1)' : 'transparent',
                            borderRadius: 'var(--radius)',
                            border: 'none',
                            padding: '10px 16px',
                            marginBottom: '4px',
                            cursor: 'pointer',
                            color: selectedCategory === cat.id ? 'var(--primary)' : 'var(--text-muted)',
                            fontSize: '14px',
                            fontWeight: selectedCategory === cat.id ? '600' : '500',
                            textAlign: 'left',
                            transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                            if (selectedCategory !== cat.id) {
                                e.currentTarget.style.color = 'var(--text-main)';
                                e.currentTarget.style.background = 'rgba(0,0,0,0.04)'; // Darker hover for light mode
                            }
                        }}
                        onMouseLeave={(e) => {
                            if (selectedCategory !== cat.id) {
                                e.currentTarget.style.color = 'var(--text-muted)';
                                e.currentTarget.style.background = 'transparent';
                            }
                        }}
                    >
                        <span>{cat.name}</span>
                        {cat.count > 0 && (
                            <span style={{
                                background: selectedCategory === cat.id ? 'var(--primary)' : 'rgba(0,0,0,0.06)', // Lighter background for badget
                                color: selectedCategory === cat.id ? '#fff' : 'inherit',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '11px',
                                fontWeight: '600'
                            }}>{cat.count}</span>
                        )}
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default Sidebar;
