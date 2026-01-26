import React from 'react';
import SidebarLeft from './SidebarLeft';
import SidebarRight from './SidebarRight';

const Layout = ({ children }) => {
  return (
    <div className="app">
      <div className="container">
        <SidebarLeft />
        <main className="main-content">
          {children}
        </main>
        <SidebarRight />
      </div>
    </div>
  );
};

export default Layout;