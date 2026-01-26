import React from 'react';

const TimelineTabs = ({ activeTimeline, onTimelineChange }) => {
  return (
    <div className="timeline-tabs">
      <button 
        className={activeTimeline === 'home' ? 'active' : ''} 
        onClick={() => onTimelineChange('home')}
      >
        Home
      </button>
      <button 
        className={activeTimeline === 'local' ? 'active' : ''} 
        onClick={() => onTimelineChange('local')}
      >
        Local
      </button>
      <button 
        className={activeTimeline === 'federated' ? 'active' : ''} 
        onClick={() => onTimelineChange('federated')}
      >
        Federated
      </button>
    </div>
  );
};

export default TimelineTabs;