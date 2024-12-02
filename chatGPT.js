/**
 * Extracts input fields and values to fill from a web form using OpenAI's model.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function extractForm(apiToken, userPrompt, model = "gpt-4o") {
    const systemPrompt = `
        Fill in this form with my information.
        Return a json with the query selector of each field, and value to fill in the element.

        The query selector should be in raw string format, i.e. don't try to escape special characters.

        For example, to select the following ID:
        "urn:li:fsd_formElement:urn:li:jobs_applyformcommon_easyApplyFormElement:(4084622606,13028506484,multipleChoice)-0"

        Should return as is, DO NOT return the below:
        "urn\\:li\\:fsd_formElement\\:urn\\:li\\:jobs_applyformcommon_easyApplyFormElement\\:\\(4084622606\\,13028506484\\,multipleChoice\\)-0"
    `

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
                                value: {type: "string"}
                            },
                            required: ["querySelector", "value"],
                            additionalProperties: false
                        }
                    },

                },
                required: ["fields"],
                additionalProperties: false
            },
            strict: true
        }
    }
    return await sendPrompt(apiToken, userPrompt, systemPrompt, model, response_format);
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
    const systemPrompt = "Summarize and show me the comprehensive list of technical and non-technical qualifications of this resume";
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
                            items: {type: "string"}
                        }
                    },
                    Non_Technical_Qualifications: {
                        type: "object",
                        additionalProperties: {
                            type: "array",
                            items: {type: "string"}
                        }
                    }
                },
                required: ["Technical_Qualifications", "Non_Technical_Qualifications"],
                additionalProperties: true // Allows additional keys at the root level
            }
        }
    };
    return await sendPrompt(apiToken, userPrompt, systemPrompt, model, response_format);
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
    const systemPrompt = "Extract the following information and return a json from the uploaded resume. " +
        "leave blank if you cannot find the related fields. If the field is url, make it a valid url:\n" +
        "name, linkedin, location, company, github, email, phone, preferred_name, required_visa_sponsorship"
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
                    required_visa_sponsorship: {type: "string"}
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
                    "required_visa_sponsorship"
                ],
                additionalProperties: false
            },
            strict: true
        }
    }
    return await sendPrompt(apiToken, userPrompt, systemPrompt, model, response_format);
}

/**
 * Extracts keywords from resume and JD using OpenAI's model.
 *
 * @param {string} apiToken - Your OpenAI API token.
 * @param {string} userPrompt - The user's input prompt.
 * @param {string} [model="gpt-4"] - The OpenAI model to use.
 * @returns {Promise<Object[]>} - A promise that resolves to the parsed JSON response or an empty array on failure.
 */
async function extractKeywords(apiToken, userPrompt, model = "gpt-4o") {
    const systemPrompt = "Extract all of the important keywords (at least 10) from the given job description. " +
        "Return the keywords as a pair (keyword, original text from job description), both should less than 5 words. " +
        "After finding the keywords from the job description, tell me match/mismatch with the resume for each keyword" +
        "Also gimme me a summary (in HTML style, less then 25 words) and apply decision (true or false). ";

    const response_format = {
        type: "json_schema",
        json_schema: {
            name: "resume_jd_keywords_extraction_schema",
            schema: {
                type: "object",
                properties: {
                    match: {
                        type: "array",
                        items: {
                            type: "array",
                            items: {type: "string"}
                        }
                    },
                    mismatch: {
                        type: "array",
                        items: {
                            type: "array",
                            items: {type: "string"}
                        }
                    },
                    summary: {type: "string"},
                    apply: {type: "boolean"},
                },
                required: [
                    "match",
                    "mismatch",
                    "summary",
                    "apply"
                ],
                additionalProperties: false
            },
            strict: true
        }
    }
    return await sendPrompt(apiToken, userPrompt, systemPrompt, model, response_format);
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
    response_format = null
) {
    const API_URL = 'https://api.openai.com/v1/chat/completions';

    const messages = [
        {role: "system", content: systemPrompt},
        {role: "user", content: userPrompt}
    ];

    let requestBody = {};
    if (response_format) {
        requestBody = {
            model,
            messages,
            n: 1,
            frequency_penalty: 1.0,
            response_format: response_format
        };
    } else {
        requestBody = {
            model,
            messages,
            n: 1,
            frequency_penalty: 1.0
        };
    }

    const headers = {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json'
    };

    const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
    }

    const completion = await response.json();

    const choice = completion.choices?.[0];
    if (!choice) {
        console.error("No choices found in the API response.");
        return [];
    }

    if (choice.finish_reason === 'length') {
        console.warn("Completion finished with incomplete output. Please try again with more context.");
        console.warn(choice.message?.content || "No content returned.");
        return [];
    }

    const parsedContent = JSON.parse(choice.message?.content || '{}');
    return parsedContent || [];

}