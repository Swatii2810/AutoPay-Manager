
const features = [
    {
        icon: 'bell',
        title: 'Instant Voice Alerts',
        description: 'Get real-time voice notifications for every UPI transaction'
    },
    {
        icon: 'clock',
        title: 'Complete Payment History',
        description: 'Access detailed transaction records and customer information'
    },
    {
        icon: 'sync',
        title: 'Auto-Sync Payments',
        description: 'Automatic synchronization across all your UPI apps'
    },
    {
        icon: 'shield',
        title: 'Ad-Free Experience',
        description: 'Enjoy uninterrupted access to all premium tools'
    },
    {
        icon: 'grid',
        title: '21+ Apps Supported',
        description: 'Works seamlessly with all major UPI payment platforms'
    }
];

// SVG icons
const icons = {
    bell: '<svg viewBox="0 0 24 24"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
    sync: '<svg viewBox="0 0 24 24"><path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/></svg>',
    shield: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>',
    grid: '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>'
};

// Render features
function renderFeatures() {
    const featuresList = document.getElementById('featuresList');
    
    features.forEach(feature => {
        const featureItem = document.createElement('div');
        featureItem.className = 'feature-item';
        
        featureItem.innerHTML = `
            <div class="icon-container">
                ${icons[feature.icon]}
            </div>
            <div class="feature-content">
                <h3>${feature.title}</h3>
                <p>${feature.description}</p>
            </div>
        `;
        
        featuresList.appendChild(featureItem);
    });
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    renderFeatures();
    
    // Add click handlers
    document.querySelector('.trial-button').addEventListener('click', () => {
        alert('Starting your 1-day free trial!');
    });
    
    document.querySelector('.cta-button').addEventListener('click', () => {
        alert('Starting your free trial!');
    });
});
