function fillFormFields(fieldData) {
    // Iterate over each field in the JSON input
    fieldData.fields.forEach(field => {
        // Select the form element using the querySelector
        let element;
        try {
            element = document.querySelector(`#${CSS.escape(field.querySelector)}`) || document.querySelector(field.querySelector);
        } catch (error) {
            console.error(`Error selecting element with querySelector: ${field.querySelector}`);
            return; // Skip to the next field if the querySelector is invalid
        }

        if (!element) {
            console.warn(`Element not found for selector: ${field.querySelector}`);
            return; // Skip to the next field if the element is not found
        }

        // Fill in the value based on the element type
        switch (element.type) {
            case 'text': // Text input fields
            case 'email':
            case 'tel':
            case 'number':
            case 'password':
            case 'url':
                element.value = element.value || field.value;
                break;

            case 'radio': // Radio buttons
                if (element.value === field.value) {
                    element.checked = true;
                }
                break;

            case 'checkbox': // Checkboxes
                element.checked = field.value === true || field.value === 'true' || field.value === 'Yes';
                break;

            case 'select-one': // Dropdowns (single select)
                const optionToSelect = Array.from(element.options).find(option => option.value === field.value || option.text === field.value);
                if (optionToSelect) {
                    element.value = optionToSelect.value;
                } else {
                    console.warn(`No matching option found for selector: ${field.querySelector} and value: ${field.value}`);
                }
                break;

            case 'textarea': // Text areas
                element.value = element.value || field.value;
                break;

            default:
                console.warn(`Unhandled element type: ${element.type} for selector: ${field.querySelector}`);
                return;
        }

        // Trigger input or change event if necessary to ensure any reactive behavior works
        const eventType = element.type === 'checkbox' || element.type === 'radio' || element.type === 'select-one' ? 'change' : 'input';
        element.dispatchEvent(new Event(eventType, {bubbles: true, cancelable: true}));
    });
}


/**
 * Check if a form field is filled.
 * Considers default values for select elements as not filled.
 * @param {HTMLElement} field - The form field element to check.
 * @returns {boolean} - Returns true if the field is filled, false otherwise.
 */
function isFieldFilled(field) {
    if (!field || !(field instanceof HTMLElement)) {
        throw new Error("Invalid field element provided.");
    }

    const fieldType = field.type || field.tagName.toLowerCase();

    switch (fieldType) {
        case "text":
        case "email":
        case "password":
        case "textarea":
        case "url":
        case "number":
        case "tel":
        case "search":
            return field.value.trim() !== "";

        case "select-one":
            // Check if the selected option is the default one
            return field.selectedIndex > 0 && field.value.trim() !== "";

        case "select-multiple":
            // Check if any selected option is not the default one
            return Array.from(field.options).some(option => option.selected && option.value.trim() !== "");

        case "radio":
            // Check if at least one radio button in the group is selected
            return Array.from(document.getElementsByName(field.name)).some(radio => radio.checked);

        case "checkbox":
            // Check if the checkbox is checked
            return field.checked;

        case "file":
            // Check if files are uploaded
            return field.files && field.files.length > 0;

        default:
            // Default fallback for unhandled types
            return field.value !== undefined && field.value.trim() !== "";
    }
}

/**
 * Check all fields in a form and determine if all are filled.
 * @param {HTMLFormElement} form - The form element to validate.
 * @returns {boolean} - Returns true if all required fields are filled, false otherwise.
 */
function areAllFieldsFilled(form) {
    if (!form || !(form instanceof HTMLFormElement)) {
        throw new Error("Invalid form element provided.");
    }

    const fields = form.querySelectorAll("input, select, textarea");
    for (const field of fields) {
        // const isRequired = field.hasAttribute("required");
        if (!isFieldFilled(field)) {
            return false;
        }
    }

    return true;
}


function fillForm(personalInfo, filledForms, chatGPTAccessToken, force = false) {
    if (!personalInfo) {
        console.warn('Personal info not loaded yet.');
        return;
    }

    let autoFillButton = document.querySelector('.auto-fill-button');
    // add auto fill button
    const footer = document.querySelector('footer[role="presentation"] .display-flex')
    if (footer && !autoFillButton) {
        autoFillButton = document.createElement('button');
        autoFillButton.classList.add('artdeco-button', 'artdeco-button--premium', 'ml2', 'auto-fill-button', 'no-spinner');
        autoFillButton.type = 'button';
        autoFillButton.innerHTML = 'Auto Fill<span class="shortcut mr2 ml2">Ctrl + F(ill)</span>';
        footer.appendChild(autoFillButton);
        autoFillButton.addEventListener('click', () => {
            fillForm(personalInfo, filledForms, chatGPTAccessToken, true);
        })
    }

    const labels = document.querySelectorAll('.jobs-easy-apply-modal__content form .ph5 div div div.fb-dash-form-element label');
    const form = document.querySelector('.jobs-easy-apply-modal__content form');
    // none of the id is found in filledForms
    if (
        labels.length > 0 &&
        (
            (
                // not all fields are processed
                !Array.from(labels).every(label => filledForms.has(label.attributes['for']?.value)) &&
                !areAllFieldsFilled(form)
            ) ||
            force
        )
    ) {
        autoFillButton.textContent = 'Auto Filling...';
        autoFillButton.classList.remove("no-spinner");
        // add all id's to filledForms
        labels.forEach(label => filledForms.add(label.attributes['for']?.value));
        const forms = document.querySelectorAll('.jobs-easy-apply-modal__content form .ph5 div div div.fb-dash-form-element');

        const formPromises = Array.from(forms)
            .filter(form => {
                return !isFieldFilled(form.querySelector('input, select, textarea'))
            })
            .map(form => {
                console.log(form);
                const userPrompt = `
                INFORMATION:
                ${JSON.stringify(personalInfo)}
    
    
                FORM:
                ${form.innerHTML}
            `;

                return extractForm(chatGPTAccessToken, userPrompt)
                    .then(response => {
                        console.log(response);
                        fillFormFields(response);
                    })
                    .catch(error => {
                        console.error("Error processing form:", error);
                    });
            });

        // Wait for all form requests to complete
        Promise.all(formPromises)
            .then(() => {
                console.log("All forms processed!");
            })
            .finally(() => {
                autoFillButton.innerHTML = 'Auto Fill<span class="shortcut mr2 ml2">Ctrl + F(ill)</span>';
                autoFillButton.classList.add("no-spinner");
            });
    }
}


//
// // function extractLabeledFormFields(formSelector) {
// //     const form = document.querySelector(formSelector);
// //
// //     if (!form) {
// //         console.error(`Form not found with selector: ${formSelector}`);
// //         return [];
// //     }
// //
// //     const inputs = Array.from(form.querySelectorAll('input, textarea, select'));
// //      // Remove null values
// //     return inputs
// //         .map(input => {
// //             let label = null;
// //
// //             // Find the associated label
// //             if (input.id) {
// //                 label = form.querySelector(`label[for="${input.id}"]`);
// //             } else {
// //                 return;
// //             }
// //
// //             if (!label) {
// //                 // Check if the input is inside a parent <label>
// //                 label = input.closest('label');
// //             }
// //
// //             // Include only inputs that have labels
// //             if (label) {
// //                 return {
// //                     label: label.textContent.trim(),
// //                     name: input.name || '',
// //                     id: input.id,
// //                     type: input.type
// //                 };
// //             }
// //
// //             return null; // Exclude inputs without labels
// //         })
// //         .filter(field => field !== null);
// // }
// //
// // const labeledFields = extractLabeledFormFields('form'); // Replace 'form' with your form's selector
// // console.log(labeledFields);
//
//
//
// function processTextInput(inputBox, labelText) {
//     if (inputBox.value !== '') return;
//
//     if (labelText.includes('linkedin') && personalInfo.linkedin) {
//         inputBox.value = personalInfo.linkedin;
//         console.log("LinkedIn URL filled automatically.");
//     } else if (
//         ['location', 'city', 'home address'].some(term => labelText.includes(term)) &&
//         !inputBox.classList.contains('jobs-search-box__text-input')
//     ) {
//         inputBox.value = personalInfo.location;
//         console.log("Location filled automatically.");
//     } else if (labelText.includes('current company') && personalInfo.company) {
//         inputBox.value = personalInfo.company;
//         console.log("Current company filled automatically.");
//     } else if (labelText.includes('github') && personalInfo.github) {
//         inputBox.value = personalInfo.github;
//         console.log("GitHub URL filled automatically.");
//     } else if (labelText.includes('first name') && personalInfo.name) {
//         inputBox.value = personalInfo.name.split(' ')[0];
//         console.log("First name filled automatically.");
//     } else if (labelText.includes('last name') && personalInfo.name) {
//         inputBox.value = personalInfo.name.split(' ')[1];
//         console.log("Last name filled automatically.");
//     } else if (labelText.includes('preferred name') && personalInfo.preferred_name) {
//         inputBox.value = personalInfo.preferred_name;
//         console.log("Preferred name filled automatically.");
//     } else if (labelText === 'name' && personalInfo.name) {
//         inputBox.value = personalInfo.name;
//         console.log("Name filled automatically.");
//     } else if (labelText.includes('how did you hear about this job?')) {
//         inputBox.value = 'LinkedIn';
//         console.log("Source filled automatically.");
//     } else if (labelText.includes('email') && personalInfo.email) {
//         inputBox.value = personalInfo.email;
//         console.log("Email filled automatically.");
//     } else if (
//         ['phone', 'mobile', 'phone number', 'mobile number'].some(term => labelText.includes(term)) &&
//         personalInfo.phone
//     ) {
//         inputBox.value = personalInfo.phone;
//         console.log("Phone number filled automatically.");
//     } else {
//         return;
//     }
//
//     inputBox.dataset.autofilled = 'true';
//     inputBox.dispatchEvent(new Event('input', {bubbles: true, cancelable: true}));
// }
//
//
// function processCheckboxInput(inputBox, labelText) {
//     if (inputBox.checked) return;
//
//     if (
//         (labelText.includes('prefer') && labelText.includes('not')) ||
//         (labelText.includes("don't") && labelText.includes('answer')) ||
//         (labelText.includes("do not") && labelText.includes('answer')) ||
//         labelText === 'decline to self identify'
//     ) {
//         inputBox.checked = true;
//         inputBox.dispatchEvent(new Event('change', {bubbles: true}));
//         console.log("Checkbox for 'Prefer not to disclose' checked automatically.");
//         inputBox.dataset.autofilled = 'true';
//     }
// }
//
// function processSelectInput(inputBox, labelText) {
//     if (inputBox.value !== '') return;
//
//     if (
//         ["legally", "authorized", "work"].every(keyword => labelText.includes(keyword)) ||
//         ["lawfully", "authorized", "work"].every(keyword => labelText.includes(keyword))
//     ) {
//         inputBox.value = 'Yes';
//         console.log("Selected 'Yes' for authorization to work.");
//     } else if (["now", "future", "sponsor"].every(keyword => labelText.includes(keyword))) {
//         inputBox.value = 'Yes';
//         console.log("Selected 'Yes' for future sponsorship requirement.");
//     } else if (["non-compete", "restrictions"].every(keyword => labelText.includes(keyword))) {
//         inputBox.value = 'No';
//         console.log("Selected 'No' for non-compete restrictions.");
//     } else if (["currently", "employed", "by"].every(keyword => labelText.includes(keyword))) {
//         inputBox.value = 'No';
//         console.log("Selected 'No' for current employment status.");
//     } else if (["ever", "been", "employed", "by"].every(keyword => labelText.includes(keyword))) {
//         inputBox.value = 'No';
//         console.log("Selected 'No' for previous employment history.");
//     } else {
//         return;
//     }
//
//     inputBox.dataset.autofilled = 'true';
//     inputBox.dispatchEvent(new Event('change', {bubbles: true}));
// }
