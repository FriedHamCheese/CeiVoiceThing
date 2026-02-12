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
        .categories: str[] (Array of strings, max 5)
        .suggestedAssignee: str (Department or role)
    }
    - str: describing error if AI service fails.
    */

    const askOllama = async (systemPrompt, userPrompt, jsonMode = false) => {
        try {
            const response = await axios.post(OLLAMA_URL, {
                model: OLLAMA_MODEL,
                messages: [
                    { role: "system", content: systemPrompt },
                    { role: "user", content: userPrompt }
                ],
                stream: false,
                format: jsonMode ? "json" : undefined,
            });
            return response.data.message.content;
        } catch (error) {
            console.error(`Ollama Error for prompt: ${systemPrompt.substring(0, 50)}...`, error.message);
            throw error;
        }
    };

    try {
        const [title, summary, solutions, categoriesRaw, assignee] = await Promise.all([
            // Title
            askOllama(
                "Generate a short, concise title for this support ticket. Max 10 words. Do not use quotes.",
                userRequestText
            ),
            // Summary: the ai always try to max out 220 word lead to very long details
            askOllama(
                "Summarize the following user request in at most 220 words.",
                userRequestText
            ),
            // Solutions
            askOllama(
                "Suggest potential solutions for this support request. Max 220 words.",
                userRequestText
            ),
            // Categories (JSON)
            askOllama(
                "Categorize this request into a JSON array of 1-word strings (max 5). Example: [\"Hardware\", \"Network\"]",
                userRequestText,
                true // jsonMode
            ),
            // Assignee
            askOllama(
                "Suggest a single department or role (e.g., IT, HR, Billing, Technical Support) for this request. Return ONLY the name.",
                userRequestText
            )
        ]);

        let parsedCategories = [];
        try {
            const jsonStart = categoriesRaw.indexOf('[');
            const jsonEnd = categoriesRaw.lastIndexOf(']') + 1;
            if (jsonStart !== -1 && jsonEnd !== -1) {
                parsedCategories = JSON.parse(categoriesRaw.substring(jsonStart, jsonEnd));
            } else {
                // Fallback if not valid JSON array found, though format:json should prevent this mostly
                parsedCategories = ["General"];
            }
        } catch (e) {
            console.error("Failed to parse categories:", categoriesRaw);
            parsedCategories = ["Uncategorized"];
        }

        if (!Array.isArray(parsedCategories)) parsedCategories = ["Uncategorized"];

        // Post-processing limits
        const FIRST_CHARACTER = 0;
        const MAX_CATEGORY_CHARACTERS = 32;
        const MAX_SUMMARY_CHARACTERS = 2048;
        const MAX_TITLE_CHARACTERS = 128;
        const MAX_SOLUTION_CHARACTERS = 2048;

        const cleanString = (str, maxLen) => {
            if (typeof str !== 'string') return "";
            return str.trim().slice(FIRST_CHARACTER, maxLen).replace(/^"|"$/g, ''); // Remove wrapping quotes if any
        };

        return {
            title: cleanString(title, MAX_TITLE_CHARACTERS),
            summary: cleanString(summary, MAX_SUMMARY_CHARACTERS),
            suggestedSolutions: cleanString(solutions, MAX_SOLUTION_CHARACTERS),
            categories: parsedCategories.map(c => cleanString(c, MAX_CATEGORY_CHARACTERS)).filter(c => c.length > 0),
            suggestedAssignee: cleanString(assignee, MAX_CATEGORY_CHARACTERS)
        };

    } catch (error) {
        console.error("Ollama connection error key fields:", error.message);
        if (error.response && error.response.status === 404) {
            console.error(`Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}' in your terminal.`);
            return `AI Model '${OLLAMA_MODEL}' not found on server.`;
        }
        return "Error connecting to AI service.";
    }
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
