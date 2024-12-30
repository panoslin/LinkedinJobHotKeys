function fillFormFields(fieldData) {
    fieldData.fields.forEach((field) => {
        let element = fuzzyFindElement(field.querySelector);

        if (!element) {
            console.warn(
                `Element not found for selector: ${field.querySelector}`,
            );
            return; // Skip to the next field if the element is not found
        }

        // Fill in the value based on the element type
        switch (element.type) {
            case "text":
            case "email":
            case "tel":
            case "number":
            case "password":
            case "url":
            case "search":
            case "date":
            case "datetime-local":
            case "month":
            case "week":
            case "time":
                element.value = field.value;
                break;

            case "radio":
                // Find the radio button with matching value
                const radios = document.getElementsByName(element.name);
                for (let radio of radios) {
                    if (
                        radio.value === field.value ||
                        document
                            .querySelector(`label[for="${radio.id}"]`)
                            .textContent.trim() === field.value
                    ) {
                        radio.checked = true;
                        radio.click(); // Click the radio button
                        element = radio; // Update element for event dispatch
                        break;
                    }
                }
                break;

            case "checkbox":
                if (
                    field.value === true ||
                    field.value === "true" ||
                    field.value === "Yes" ||
                    field.value === "yes" ||
                    field.value === "on"
                ) {
                    element.click();
                    element.checked = true;
                }
                break;

            default:
                if (element.tagName.toLowerCase() === "select") {
                    const optionToSelect = Array.from(element.options).find(
                        (option) =>
                            option.value === field.value ||
                            option.text === field.value,
                    );
                    if (optionToSelect) {
                        element.value = optionToSelect.value;
                    } else {
                        console.warn(
                            `No matching option found for selector: ${field.querySelector} and value: ${field.value}`,
                        );
                    }
                } else if (element.tagName.toLowerCase() === "textarea") {
                    element.value = field.value;
                } else {
                    console.warn(
                        `Unhandled element type: ${element.type} for selector: ${field.querySelector}`,
                    );
                    return;
                }
                break;
        }

        // Trigger input or change event if necessary
        const eventType = ["checkbox", "radio", "select-one"].includes(
            element.type,
        )
            ? "change"
            : "input";
        element.dispatchEvent(
            new Event(eventType, {bubbles: true, cancelable: true}),
        );
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
        console.warn("Invalid field element provided.");
        return true;
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
            return Array.from(field.options).some(
                (option) => option.selected && option.value.trim() !== "",
            );

        case "radio":
            // Check if at least one radio button in the group is selected
            return Array.from(document.getElementsByName(field.name)).some(
                (radio) => radio.checked,
            );

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
    if (!form) {
        console.warn("No form element provided.");
        return true;
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

function fillForm(
    personalInfo,
    filledForms,
    chatGPTAccessToken,
    force = false,
    root,
    resumeText
) {
    if (!root) {
        return;
    }
    if (!personalInfo) {
        console.warn("Personal info not loaded yet.");
        return;
    }

    let autoFillStatus = document.querySelector(".auto-fill-button");
    // add auto fill button
    const footer = document.querySelector(
        'footer[role="presentation"] .display-flex',
    );
    if (footer && !autoFillStatus) {
        autoFillStatus = document.createElement("button");
        autoFillStatus.classList.add(
            "artdeco-button",
            "artdeco-button--premium",
            "ml2",
            "auto-fill-button",
            "no-spinner",
        );
        autoFillStatus.type = "button";
        autoFillStatus.innerHTML =
            'Auto Fill<span class="shortcut mr2 ml2">Ctrl + F(ill)</span>';
        footer.appendChild(autoFillStatus);
        autoFillStatus.addEventListener("click", () => {
            fillForm(
                personalInfo,
                filledForms,
                chatGPTAccessToken,
                true,
                document.querySelector("form .ph5"),
                resumeText
            );
        });
    } else {
        // use modal
    }

    const labels = root.querySelectorAll("label, fieldset");
    const form = findMultipleLCA(Array.from(labels));
    if (
        labels.length > 0 &&
        (force ||
            // not all fields are processed
            (!Array.from(labels).every((label) =>
                    filledForms.has(label.attributes["for"]?.value),
                ) &&
                !areAllFieldsFilled(form) &&
                !Array.from(labels).some((label) => {
                    return label.attributes?.for?.value?.startsWith(
                        "jobsDocumentCardToggle",
                    );
                })))
    ) {
        if (autoFillStatus) {
            autoFillStatus.textContent = "Auto Filling...";
            autoFillStatus.classList.remove("no-spinner");
        } else {
            displayToast("loading");
        }

        // add all id's to filledForms
        labels.forEach(label => filledForms.add(label.attributes['for']?.value));
        const forms = findLCAElements(labels);

        const formPromises = Array.from(forms)
            .filter(element => {
                if (element.tagName.toLowerCase() === 'fieldset') {
                    return !Array.from(element.querySelectorAll('input, select, textarea')).every(isFieldFilled);
                } else {
                    return !isFieldFilled(element.querySelector('input, select, textarea'));
                }
            })
            .map(form => {
                console.log(form);
                const modifiedPersonalInfo = { ...personalInfo };
                delete modifiedPersonalInfo.summarizedResume;
                delete modifiedPersonalInfo.testMessage;
                modifiedPersonalInfo.resumeText = resumeText;
                const userPrompt = `
                    INFORMATION:
                    ${JSON.stringify(modifiedPersonalInfo)}
        
        
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
                if (autoFillStatus) {
                    autoFillStatus.innerHTML = 'Auto Fill<span class="shortcut mr2 ml2">Ctrl + F(ill)</span>';
                    autoFillStatus.classList.add("no-spinner");
                } else {
                    displayToast("success");
                }

            });
    } else {
        console.log("No forms to process.");
    }
}

// /**
//  * Extracts all question elements from a given HTML element.
//  * Each question is assumed to be a complete unit containing
//  * the question text and its associated input fields.
//  *
//  * @param {HTMLElement} rootElement - The HTML element containing the form.
//  * @return {HTMLElement[]} - An array of question elements.
//  */
// function extractQuestions(rootElement) {
//     const questions = [];
//
//     // Helper function to determine if an element represents a question
//     function isQuestionElement(element) {
//         // Check for common tags used for questions
//         const questionTags = ['div', 'fieldset', 'li', 'p', 'label'];
//
//         // Check if the element has a class or ID indicating a question
//         const classOrIdRegex = /question|q-|item|field|form/i;
//
//         return (
//             questionTags.includes(element.tagName.toLowerCase()) &&
//             (classOrIdRegex.test(element.className) ||
//                 classOrIdRegex.test(element.id))
//         );
//     }
//
//     // Recursive function to traverse the DOM tree
//     function traverse(element) {
//         // If the element is a question element, add it to the list
//         if (isQuestionElement(element)) {
//             questions.push(element);
//         } else {
//             // Otherwise, traverse its children
//             element.childNodes.forEach((child) => {
//                 if (child.nodeType === Node.ELEMENT_NODE) {
//                     traverse(child);
//                 }
//             });
//         }
//     }
//
//     traverse(rootElement);
//     if (questions.length === 0) {
//         questions.push(rootElement);
//     }
//     return questions || rootElement;
// }

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
