export const categories = [
    { id: 'all', name: 'All topics' },
    { id: 'general', name: 'General' },
    { id: 'regional', name: 'Regional' },
    { id: 'technology', name: 'Technology' },
    { id: 'gaming', name: 'Gaming' },
    { id: 'lgbtq', name: 'LGBTQ+' },
    { id: 'activism', name: 'Activism' },
    { id: 'art', name: 'Art' },
    { id: 'music', name: 'Music' },
];

export const servers = [
    {
        id: 1,
        name: 'mastodon.social',
        category: 'general',
        description: 'The original server operated by the Mastodon gGmbH non-profit',
        enabled: true,
        users: '850K+',
        image: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 2,
        name: 'techhub.social',
        category: 'technology',
        description: 'A hub primarily for passionate technologists, but everyone is welcome.',
        enabled: true,
        users: '120K+',
        image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'
    },
    {
        id: 3,
        name: 'mstdn.social',
        category: 'general',
        description: 'A general-purpose Mastodon server with a 500 character limit. All languages are welcome.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 4,
        name: 'fosstodon.org',
        category: 'technology',
        description: 'A home for people interested in Free & Open Source Software.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 5,
        name: 'gaming.social',
        category: 'gaming',
        description: 'A nice place for gamers to hang out and discuss games.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 6,
        name: 'art.social',
        category: 'art',
        description: 'Digital art, traditional art, photography, and more.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 7,
        name: 'music.world',
        category: 'music',
        description: 'Connect with musicians and music lovers from around the globe.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 8,
        name: 'lgbt.io',
        category: 'lgbtq',
        description: 'A safe space for the LGBTQ+ community.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 9,
        name: 'activism.net',
        category: 'activism',
        description: 'Organize, discuss, and act on social issues.',
        enabled: false,
        users: '???',
        image: ''
    },
    {
        id: 10,
        name: 'regional.town',
        category: 'regional',
        description: 'Local news and discussions for your town.',
        enabled: false,
        users: '???',
        image: ''
    },
];
