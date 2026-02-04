// Assessment flow JavaScript
let currentStep = 1;
const totalSteps = 5;

// Assessment data object
const assessmentData = {
    // Step 1
    companyName: '',
    industry: '',
    revenue: '',
    employees: '',
    state: '',
    
    // Step 2
    dataTypes: [],
    recordCount: '',
    paymentProcessing: '',
    
    // Step 3
    mfa: '',
    training: '',
    securityTools: [],
    itSupport: '',
    
    // Step 4
    motivation: '',
    timeline: '',
    coverageLimit: '',
    
    // Step 5
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    bestTime: ''
};

// Update progress bar
function updateProgress() {
    const percent = (currentStep / totalSteps) * 100;
    document.getElementById('progressBar').style.width = percent + '%';
    document.getElementById('currentStep').textContent = currentStep;
    document.getElementById('completionPercent').textContent = Math.round(percent);
}

// Validate current step
function validateStep(step) {
    let isValid = true;
    let errorMessage = '';

    switch(step) {
        case 1:
            if (!document.getElementById('companyName').value.trim()) {
                errorMessage = 'Please enter your company name';
                isValid = false;
            } else if (!document.getElementById('industry').value) {
                errorMessage = 'Please select your industry';
                isValid = false;
            } else if (!document.getElementById('revenue').value) {
                errorMessage = 'Please select your revenue range';
                isValid = false;
            } else if (!document.getElementById('employees').value) {
                errorMessage = 'Please select number of employees';
                isValid = false;
            } else if (!document.getElementById('state').value) {
                errorMessage = 'Please select your state';
                isValid = false;
            }
            break;

        case 2:
            if (!document.getElementById('recordCount').value) {
                errorMessage = 'Please select the number of records you store';
                isValid = false;
            } else if (!document.getElementById('paymentProcessing').value) {
                errorMessage = 'Please select how you handle payments';
                isValid = false;
            }
            break;

        case 3:
            if (!document.getElementById('mfa').value) {
                errorMessage = 'Please indicate if you use MFA';
                isValid = false;
            } else if (!document.getElementById('training').value) {
                errorMessage = 'Please indicate your training frequency';
                isValid = false;
            } else if (!document.getElementById('itSupport').value) {
                errorMessage = 'Please select your IT support type';
                isValid = false;
            }
            break;

        case 4:
            if (!document.getElementById('motivation').value) {
                errorMessage = 'Please select why you need cyber insurance';
                isValid = false;
            } else if (!document.getElementById('timeline').value) {
                errorMessage = 'Please select when you need coverage';
                isValid = false;
            }
            break;

        case 5:
            const email = document.getElementById('email').value.trim();
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            
            if (!firstName) {
                errorMessage = 'Please enter your first name';
                isValid = false;
            } else if (!lastName) {
                errorMessage = 'Please enter your last name';
                isValid = false;
            } else if (!email) {
                errorMessage = 'Please enter your email address';
                isValid = false;
            } else if (!validateEmail(email)) {
                errorMessage = 'Please enter a valid email address';
                isValid = false;
            }
            break;
    }

    if (!isValid) {
        alert(errorMessage);
    }

    return isValid;
}

// Email validation
function validateEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Save current step data
function saveStepData(step) {
    switch(step) {
        case 1:
            assessmentData.companyName = document.getElementById('companyName').value.trim();
            assessmentData.industry = document.getElementById('industry').value;
            assessmentData.revenue = document.getElementById('revenue').value;
            assessmentData.employees = document.getElementById('employees').value;
            assessmentData.state = document.getElementById('state').value;
            break;

        case 2:
            // Data types checkboxes
            assessmentData.dataTypes = Array.from(document.querySelectorAll('#step2 input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            assessmentData.recordCount = document.getElementById('recordCount').value;
            assessmentData.paymentProcessing = document.getElementById('paymentProcessing').value;
            break;

        case 3:
            assessmentData.mfa = document.getElementById('mfa').value;
            assessmentData.training = document.getElementById('training').value;
            // Security tools checkboxes
            assessmentData.securityTools = Array.from(document.querySelectorAll('#step3 input[type="checkbox"]:checked'))
                .map(cb => cb.value);
            assessmentData.itSupport = document.getElementById('itSupport').value;
            break;

        case 4:
            assessmentData.motivation = document.getElementById('motivation').value;
            assessmentData.timeline = document.getElementById('timeline').value;
            assessmentData.coverageLimit = document.getElementById('coverageLimit').value;
            break;

        case 5:
            assessmentData.firstName = document.getElementById('firstName').value.trim();
            assessmentData.lastName = document.getElementById('lastName').value.trim();
            assessmentData.email = document.getElementById('email').value.trim();
            assessmentData.phone = document.getElementById('phone').value.trim();
            assessmentData.bestTime = document.getElementById('bestTime').value;
            break;
    }

    // Save to localStorage
    localStorage.setItem('cyberAssessment', JSON.stringify(assessmentData));
}

// Load saved data into form
function loadStepData(step) {
    const saved = localStorage.getItem('cyberAssessment');
    if (!saved) return;

    const data = JSON.parse(saved);

    switch(step) {
        case 1:
            if (data.companyName) document.getElementById('companyName').value = data.companyName;
            if (data.industry) document.getElementById('industry').value = data.industry;
            if (data.revenue) document.getElementById('revenue').value = data.revenue;
            if (data.employees) document.getElementById('employees').value = data.employees;
            if (data.state) document.getElementById('state').value = data.state;
            break;

        case 2:
            if (data.recordCount) document.getElementById('recordCount').value = data.recordCount;
            if (data.paymentProcessing) document.getElementById('paymentProcessing').value = data.paymentProcessing;
            if (data.dataTypes) {
                document.querySelectorAll('#step2 input[type="checkbox"]').forEach(cb => {
                    cb.checked = data.dataTypes.includes(cb.value);
                });
            }
            break;

        case 3:
            if (data.mfa) document.getElementById('mfa').value = data.mfa;
            if (data.training) document.getElementById('training').value = data.training;
            if (data.itSupport) document.getElementById('itSupport').value = data.itSupport;
            if (data.securityTools) {
                document.querySelectorAll('#step3 input[type="checkbox"]').forEach(cb => {
                    cb.checked = data.securityTools.includes(cb.value);
                });
            }
            break;

        case 4:
            if (data.motivation) document.getElementById('motivation').value = data.motivation;
            if (data.timeline) document.getElementById('timeline').value = data.timeline;
            if (data.coverageLimit) document.getElementById('coverageLimit').value = data.coverageLimit;
            break;

        case 5:
            if (data.firstName) document.getElementById('firstName').value = data.firstName;
            if (data.lastName) document.getElementById('lastName').value = data.lastName;
            if (data.email) document.getElementById('email').value = data.email;
            if (data.phone) document.getElementById('phone').value = data.phone;
            if (data.bestTime) document.getElementById('bestTime').value = data.bestTime;
            break;
    }
}

// Navigate to next step
function nextStep(targetStep) {
    // Validate current step before proceeding
    if (!validateStep(currentStep)) {
        return;
    }

    // Save current step data
    saveStepData(currentStep);

    // Hide current step
    document.getElementById('step' + currentStep).classList.add('hidden');

    // Show next step
    currentStep = targetStep;
    document.getElementById('step' + currentStep).classList.remove('hidden');

    // Load any saved data for this step
    loadStepData(currentStep);

    // Update progress bar
    updateProgress();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });

    // Track event
    trackEvent('assessment_step', { step: currentStep });
}

// Navigate to previous step
function previousStep(targetStep) {
    // Save current step data
    saveStepData(currentStep);

    // Hide current step
    document.getElementById('step' + currentStep).classList.add('hidden');

    // Show previous step
    currentStep = targetStep;
    document.getElementById('step' + currentStep).classList.remove('hidden');

    // Update progress bar
    updateProgress();

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Submit assessment
async function submitAssessment() {
    // Validate final step
    if (!validateStep(5)) {
        return;
    }

    // Save final step data
    saveStepData(5);

    // Show loading state
    const submitBtn = document.getElementById('submitBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing...';

    // Track event
    trackEvent('assessment_submit', { email: assessmentData.email });

    try {
        // Send to backend API
        const response = await fetch('/api/assessment/submit', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                ...assessmentData,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                referrer: document.referrer
            })
        });

        const result = await response.json();

        if (result.success) {
            // Store lead ID
            localStorage.setItem('leadId', result.leadId);
            
            // Clear assessment data
            localStorage.removeItem('cyberAssessment');

            // Redirect to results page
            window.location.href = 'results.html?id=' + result.leadId;
        } else {
            throw new Error(result.error || 'Submission failed');
        }

    } catch (error) {
        console.error('Submission error:', error);
        alert('Sorry, there was an error submitting your assessment. Please try again or call us at (312) 555-1234.');
        
        // Reset button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Get My Risk Report →';
    }
}

// Track events (Google Analytics integration point)
function trackEvent(eventName, eventData) {
    console.log('Event:', eventName, eventData);
    // Google Analytics integration would go here
    // if (typeof gtag !== 'undefined') {
    //     gtag('event', eventName, eventData);
    // }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Load any saved data for step 1
    loadStepData(1);
    updateProgress();

    // Track page view
    trackEvent('assessment_start', {});
});
