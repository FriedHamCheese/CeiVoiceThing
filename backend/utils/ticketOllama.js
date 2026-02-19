import axios from "axios";
import 'dotenv/config';
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

export async function draftTicketFromUserRequest(userRequestText, assigneeList = "") {
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

    const contextInfo = assigneeList ? `Available assignees and their specializations: \n${assigneeList} ` : "No specific assignees available.";

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
                "Generate a title for this support ticket as short as possible.",
                userRequestText
            ),
            // Summary
            askOllama(
                "Summarize the following user request as short as possible.",
                userRequestText
            ),
            // Solutions
            askOllama(
                "Suggest potential solutions for this support request. as short as possible.",
                userRequestText
            ),
            // Categories
            askOllama(
                `Pick the best keyword for this request. as short as possible. No introduction. Here is the available assignee. ${contextInfo}`,
                userRequestText
            ),
            // Assignee
            askOllama(
                `Pick the best assignee email for this request. as short as possible. No introduction. Consider the expertise available: ${contextInfo}. Return ONLY the email.`,
                userRequestText
            )
        ]);

        // Post-processing limits
        const FIRST_CHARACTER = 0;
        const MAX_CATEGORY_CHARACTERS = 32;
        const MAX_SUMMARY_CHARACTERS = 2048;
        const MAX_TITLE_CHARACTERS = 128;
        const MAX_SOLUTION_CHARACTERS = 2048;
        const MAX_ASSIGNEE_CHARACTERS = 64;

        const cleanString = (str, maxLen) => {
            if (typeof str !== 'string') return "";
            return str.trim().slice(FIRST_CHARACTER, maxLen).replace(/^"|"$/g, '');
        };

        // Process the raw category string directly
        const cleanedCategory = cleanString(categoriesRaw, MAX_CATEGORY_CHARACTERS);

        return {
            title: cleanString(title, MAX_TITLE_CHARACTERS),
            summary: cleanString(summary, MAX_SUMMARY_CHARACTERS),
            suggestedSolutions: cleanString(solutions, MAX_SOLUTION_CHARACTERS),
            categories: cleanedCategory ? [cleanedCategory] : ["Uncategorized"],
            suggestedAssignee: cleanString(assignee, MAX_ASSIGNEE_CHARACTERS)
        };

    } catch (error) {
        console.error("Ollama connection error:", error.message);
        if (error.response && error.response.status === 404) {
            console.error(`Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}' in your terminal.`);
            return `AI Model '${OLLAMA_MODEL}' not found on server.`;
        }
        return "Error connecting to AI service.";
    }
}

export async function findMergeRecommendations(drafts) {
    if (drafts.length < 2) return [];

    const draftsText = drafts.map(d => `ID ${d.id}: Title: ${d.title}. Summary: ${d.summary}`).join('\n\n');
    const systemInstruction = "Analyze the following support ticket drafts and identify groups of IDs that are highly similar and could be merged into a single ticket. Return only a JSON array of arrays, where each inner array contains the IDs of tickets that should be merged (e.g., [[1, 3], [4, 7, 8]]). If no similarities are found, return [].";

    const combinedPrompt = `${systemInstruction}\n\nDrafts:\n${draftsText}`;

    try {
        const response = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            messages: [
                { role: "user", content: combinedPrompt }
            ],
            stream: false,
            // format: "json" // Removing explicit json format to be more flexible like Oracle
        });

        const content = response.data.message.content;

        // Parse the JSON output
        const jsonStart = content.indexOf('[');
        const jsonEnd = content.lastIndexOf(']') + 1;
        if (jsonStart !== -1 && jsonEnd !== -1) {
            const groups = JSON.parse(content.substring(jsonStart, jsonEnd));
            return Array.isArray(groups) ? groups : [];
        }
        return [];
    } catch (error) {
        console.error("Similarity analysis failed:", error.message);
        return [];
    }
}
