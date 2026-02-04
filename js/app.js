// Main app JavaScript
function startAssessment() {
    window.location.href = 'assessment.html';
}

// Save assessment data to localStorage (for resume functionality)
function saveProgress(data) {
    localStorage.setItem('cyberAssessment', JSON.stringify(data));
}

// Load saved assessment data
function loadProgress() {
    const saved = localStorage.getItem('cyberAssessment');
    return saved ? JSON.parse(saved) : null;
}

// Clear saved data
function clearProgress() {
    localStorage.removeItem('cyberAssessment');
}

// Track page views (Google Analytics integration point)
function trackEvent(eventName, eventData) {
    console.log('Event:', eventName, eventData);
    // Integration with Google Analytics would go here
    // gtag('event', eventName, eventData);
}

// Initialize app
document.addEventListener('DOMContentLoaded', function() {
    trackEvent('page_view', {
        page: window.location.pathname
    });
});
