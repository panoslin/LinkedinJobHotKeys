document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('personalInfoForm');
    const status = document.getElementById('status');

    // Load saved data and populate the form
    chrome.storage.local.get('personalInfo', (result) => {
        if (result.personalInfo) {
            Object.entries(result.personalInfo).forEach(([key, value]) => {
                const input = document.getElementById(key);
                if (input) input.value = value;
            });
        }
    });

    form.addEventListener('submit', (e) => {
        e.preventDefault();

        const personalInfo = {
            name: document.getElementById('name').value,
            linkedin: document.getElementById('linkedin').value,
            location: document.getElementById('location').value,
            company: document.getElementById('company').value,
            github: document.getElementById('github').value,
        };

        chrome.storage.local.set({ personalInfo }, () => {
            status.textContent = 'Personal information saved!';
            setTimeout(() => { status.textContent = ''; }, 3000);
        });
    });
});