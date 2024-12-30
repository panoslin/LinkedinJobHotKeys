/**
 * Extracts input fields and values to fill from a web form using OpenAI's model.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param resume - The resume content as a string.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function extractForm(apiToken, userPrompt, resume, model = "gpt-4o") {
    const systemPrompt = `
        Fill in the given form with my information.
        Return a json with the exact HTML element content as the query selector of each field from the form, and value to fill in the element.
        
        For example, if I have the following form:
        <form>
            <label for="name">Name:</label>
            <input type="text" id="name" name="name"><br><br>
        </form>
        
        You should return the following json:
        {
            "querySelector": "<input type="text" id="name" name="name">",
            "value": "John Doe"
        }
        

        Below is my js function to fill in the return json value to the form
            // Fill in the value based on the element type
            switch (element.type) {
                case 'text':
                case 'email':
                case 'tel':
                case 'number':
                case 'password':
                case 'url':
                case 'search':
                case 'date':
                case 'datetime-local':
                case 'month':
                case 'week':
                case 'time':
                    element.value = field.value;
                    break;
    
                case 'radio':
                    // Find the radio button with matching value
                    const radios = document.getElementsByName(element.name);
                    for (let radio of radios) {
                        if (radio.value === field.value) {
                            radio.checked = true;
                            element = radio; // Update element for event dispatch
                            break;
                        }
                    }
                    break;
    
                case 'checkbox':
                    element.checked = field.value === true || field.value === 'true' || field.value === 'Yes' || field.value === 'yes' || field.value === 'on';
                    break;
    
                default:
                    if (element.tagName.toLowerCase() === 'select') {
                        const optionToSelect = Array.from(element.options).find(option => option.value === field.value || option.text === field.value);
                        if (optionToSelect) {
                            element.value = optionToSelect.value;
                        } else {
                            console.warn(\`No matching option found for selector: \${field.querySelector} and value: \${field.value}\`);
                        }
                    } else if (element.tagName.toLowerCase() === 'textarea') {
                        element.value = field.value;
                    } else {
                        console.warn(\`Unhandled element type: \${element.type} for selector: \${field.querySelector}\`);
                        return;
                    }
                    break;
            }

        Below is my information:\n\n${resume}
    `;

    const response_format = {
        type: "json_schema",
        json_schema: {
            name: "web_form_extraction_schema",
            schema: {
                type: "object",
                properties: {
                    fields: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                querySelector: {type: "string"},
                                value: {type: "string"},
                            },
                            required: ["querySelector", "value"],
                            additionalProperties: false,
                        },
                    },
                },
                required: ["fields"],
                additionalProperties: false,
            },
            strict: true,
        },
    };
    return await sendPrompt(
        apiToken,
        userPrompt,
        systemPrompt,
        model,
        response_format,
    );
}

/**
 * Summarize resume using OpenAI's model.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function summarizeResume(apiToken, userPrompt, model = "gpt-4o") {
    const systemPrompt =
        "Summarize and show me the comprehensive list of technical and non-technical qualifications of this resume";
    const response_format = {
        type: "json_schema",
        json_schema: {
            name: "resume_summary_schema",
            schema: {
                type: "object",
                properties: {
                    Technical_Qualifications: {
                        type: "object",
                        additionalProperties: {
                            type: "array",
                            items: {type: "string"},
                        },
                    },
                    Non_Technical_Qualifications: {
                        type: "object",
                        additionalProperties: {
                            type: "array",
                            items: {type: "string"},
                        },
                    },
                },
                required: [
                    "Technical_Qualifications",
                    "Non_Technical_Qualifications",
                ],
                additionalProperties: true, // Allows additional keys at the root level
            },
        },
    };
    return await sendPrompt(
        apiToken,
        userPrompt,
        systemPrompt,
        model,
        response_format,
    );
}

/**
 * Extracts personal information from an uploaded resume using OpenAI's model.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function extractPersonalInfo(apiToken, userPrompt, model = "gpt-4o") {
    const systemPrompt =
        "Extract the following information and return a json from the uploaded resume. " +
        "leave blank if you cannot find the related fields. If the field is url, make it a valid url:\n" +
        "name, linkedin, location, company, github, email, phone, preferred_name, required_visa_sponsorship";
    const response_format = {
        type: "json_schema",
        json_schema: {
            name: "resume_extraction_schema",
            schema: {
                type: "object",
                properties: {
                    name: {type: "string"},
                    linkedin: {type: "string"},
                    location: {type: "string"},
                    company: {type: "string"},
                    github: {type: "string"},
                    email: {type: "string"},
                    phone: {type: "string"},
                    preferred_name: {type: "string"},
                    required_visa_sponsorship: {type: "string"},
                },
                required: [
                    "name",
                    "linkedin",
                    "location",
                    "company",
                    "github",
                    "email",
                    "phone",
                    "preferred_name",
                    "required_visa_sponsorship",
                ],
                additionalProperties: false,
            },
            strict: true,
        },
    };
    return await sendPrompt(
        apiToken,
        userPrompt,
        systemPrompt,
        model,
        response_format,
    );
}

/**
 * Extracts keywords from JD using OpenAI's model.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function extractKeywords(apiToken, userPrompt, model = "gpt-4o") {
    const systemPrompt =
        "Extract important keywords from this job description. Also gimme me a summary (in HTML style, less then 25 words) ";

    const response_format = {
        type: "json_schema",
        json_schema: {
            name: "resume_jd_keywords_extraction_schema",
            schema: {
                type: "object",
                properties: {
                    summary: {
                        type: "string",
                    },
                    keywords: {
                        type: "object",
                        additionalProperties: {
                            type: "array",
                            items: {type: "string"},
                        },
                    },
                },
                required: ["summary", "keywords"],
                additionalProperties: true,
            },
        },
    };
    return await sendPrompt(
        apiToken,
        userPrompt,
        systemPrompt,
        model,
        response_format,
    );
}

/**
 * Sends a prompt to the OpenAI Chat Completion API and returns the parsed response.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param {string} systemPrompt - The system-level prompt.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @param {Object} [response_format={}] - The response format for the API request.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function sendPrompt(
    apiToken,
    userPrompt,
    systemPrompt,
    model = "gpt-4o",
    response_format = null,
) {
    const API_URL = "https://api.openai.com/v1/chat/completions";

    const messages = [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt},
    ];

    let requestBody = {};
    if (response_format) {
        requestBody = {
            model,
            messages,
            n: 1,
            frequency_penalty: 1.0,
            response_format: response_format,
        };
    } else {
        requestBody = {
            model,
            messages,
            n: 1,
            frequency_penalty: 1.0,
        };
    }

    const headers = {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
    };

    const response = await fetch(API_URL, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes("rate_limit_exceeded")) {
            console.error("Rate limit reached. Please wait and try again.");
            return [];
        }
        throw new Error(
            `API request failed with status ${response.status}: ${errorText}`,
        );
    }

    const completion = await response.json();
    console.log(completion);

    const choice = completion.choices?.[0];
    if (!choice) {
        console.error("No choices found in the API response.");
        return [];
    }

    if (choice.finish_reason === "length") {
        console.warn(
            "Completion finished with incomplete output. Please try again with more context.",
        );
        console.warn(choice.message?.content || "No content returned.");
        return [];
    }

    const parsedContent = JSON.parse(choice.message?.content || "{}");
    return parsedContent || [];
}
