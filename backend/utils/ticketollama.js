import axios from "axios";
import 'dotenv/config';
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

export async function draftTicketFromUserRequest(userRequestText) {
    /*
    Returns:
    - {
        .summary: str (requested at most 220 words, trim and truncate to 2048 characters),
        .title: str (requested at most 10 words, trim and truncate to 128 characters),
        .suggested_solutions: str (requested at most 220 words, trim and truncate to 2048 characters),
        (assuming 6 characters/word on average, so 1.5x of that is 9.)
    }
    - str: describing error with JSON parsing or missing attributes.
    
    Throws undocumented exceptions
    */

    let response;
    try {
        response = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            messages: [
                {
                    role: "system",
                    content: "Return a short summary, title, suggested solutions, one-word categories, and a suggested assignee of the input in JSON format. Summary should not be longer than the original input. \
                Summary attribute has the name of summary, title attribute has the name of title, suggested solutions attribute has the name of suggestedSolutions, categories attribute has the name of categories, and assignee attribute has the name of suggestedAssignee. \
                Categories is an Array of Strings. suggestedAssignee should be a string representing a department or role (e.g., IT, HR, Billing, Technical Support) matching the categories. \
                Summary can have at most 220 words, title can have at most 10 words, suggested solutions can have at most 220 words and categories can have at most 5 elements."
                },
                {
                    role: "user",
                    content: userRequestText,
                }
            ],
            stream: false,
            format: "json",
        });
    } catch (error) {
        console.error("Ollama connection error:", error.message);
        if (error.response && error.response.status === 404) {
            console.error(`Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}' in your terminal.`);
            return `AI Model '${OLLAMA_MODEL}' not found on server.`;
        }
        return "Error connecting to AI service.";
    }

    let objectFromResponse;
    try {
        //Raises SyntaxError if argument is not a valid JSON.
        objectFromResponse = JSON.parse(response.data.message.content);
    } catch (err) { // 'err' was undefined in the original catch block.
        if (err instanceof SyntaxError) return "Malformed JSON from LLM.";
        else throw err;
    }

    const validateAndLog = (field, type) => {
        const val = objectFromResponse[field];
        if (type === 'string' && typeof val !== 'string') {
            console.error(`Ollama Validation Error: Field "${field}" is not a string. Val:`, val);
            console.log("Full Object:", objectFromResponse);
            return false;
        }
        if (type === 'array' && !Array.isArray(val)) {
            console.error(`Ollama Validation Error: Field "${field}" is not an array. Val:`, val);
            console.log("Full Object:", objectFromResponse);
            return false;
        }
        return true;
    };

    // Normalize keys
    if (!objectFromResponse.suggestedSolutions) {
        if (objectFromResponse.suggested_solutions) objectFromResponse.suggestedSolutions = objectFromResponse.suggested_solutions;
        if (objectFromResponse['suggested solutions']) objectFromResponse.suggestedSolutions = objectFromResponse['suggested solutions'];
    }
    if (!objectFromResponse.suggestedAssignee) {
        if (objectFromResponse.assignee) objectFromResponse.suggestedAssignee = objectFromResponse.assignee;
    }

    if (!validateAndLog('summary', 'string')) return ".summary attribute not string type.";
    if (!validateAndLog('title', 'string')) return ".title attribute not string type.";
    if (!validateAndLog('suggestedSolutions', 'string')) {
        // Fallback check for suggested_solutions
        if (typeof objectFromResponse.suggested_solutions === 'string') {
            objectFromResponse.suggestedSolutions = objectFromResponse.suggested_solutions;
        } else {
            return ".suggestedSolutions attribute not string type.";
        }
    }
    if (!validateAndLog('categories', 'array')) return ".categories attribute not Array type.";
    if (!validateAndLog('suggestedAssignee', 'string')) {
        if (typeof objectFromResponse.assignee === 'string') {
            objectFromResponse.suggestedAssignee = objectFromResponse.assignee;
        } else {
            return ".suggestedAssignee attribute not string type.";
        }
    }

    const FIRST_CHARACTER = 0;
    const MAX_CATEGORY_CHARACTERS = 32;
    const MAX_SUMMARY_CHARACTERS = 2048;
    const MAX_TITLE_CHARACTERS = 128;
    const MAX_SOLUTION_CHARACTERS = 2048;

    const checkedCategories = [];
    //So we log one category error instead of 5 or something
    let hasInvalidCategoryType = false;
    for (const category of objectFromResponse.categories) {
        if (typeof category !== "string")
            hasInvalidCategoryType = true;
        else
            checkedCategories.push(category.trim().slice(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS)); // Changed substr to slice
    }

    if (hasInvalidCategoryType) console.log("AI suggestion for category from user request has invalid type.");

    objectFromResponse.summary = objectFromResponse.summary.trim().slice(FIRST_CHARACTER, MAX_SUMMARY_CHARACTERS); // Changed substr to slice
    objectFromResponse.title = objectFromResponse.title.trim().slice(FIRST_CHARACTER, MAX_TITLE_CHARACTERS); // Changed substr to slice
    objectFromResponse.suggestedSolutions = objectFromResponse.suggestedSolutions.trim().slice(FIRST_CHARACTER, MAX_SOLUTION_CHARACTERS); // Changed substr to slice
    objectFromResponse.categories = checkedCategories;
    objectFromResponse.suggestedAssignee = objectFromResponse.suggestedAssignee.trim().slice(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS);

    return objectFromResponse;
}

export async function findMergeRecommendations(drafts) {
    if (drafts.length < 2) return [];

    const prompt = drafts.map(d => `ID ${d.id}: Title: ${d.title}. Summary: ${d.summary}`).join('\n\n');

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            messages: [
                {
                    role: "system",
                    content: "Analyze the following support ticket drafts and identify groups of IDs that are highly similar and could be merged into a single ticket. Return only a JSON array of arrays, where each inner array contains the IDs of tickets that should be merged (e.g., [[1, 3], [4, 7, 8]]). If no similarities are found, return []."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            stream: false,
            format: "json"
        });

        const groups = JSON.parse(response.data.message.content);
        return Array.isArray(groups) ? groups : [];
    } catch (error) {
        console.error("Similarity analysis failed:", error);
        return [];
    }
}
