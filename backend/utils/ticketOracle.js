import axios from "axios";
import 'dotenv/config';

// Configuration from environment variables
const ORACLE_URL = process.env.ORACLE_URL || "http://140.245.98.10:8080/api/generate";
const ORACLE_MODEL = process.env.ORACLE_MODEL || "qwen2.5:1.5b-instruct";
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;

export async function draftTicketFromUserRequest(userRequestText) {
    /*
    Returns:
    - {
        .summary: str,
        .title: str,
        .suggestedSolutions: str,
        .categories: str[],
        .suggestedAssignee: str
    }
    - str: describing error if AI service fails.
    */

    const askOracle = async (systemPrompt, userPrompt) => {
        // The /api/generate endpoint typically takes a single prompt string.
        // We manually combine the system instruction and user input.
        const combinedPrompt = `${systemPrompt}\n\nUser Request:\n${userPrompt}`;

        try {
            const response = await axios.post(
                ORACLE_URL,
                {
                    model: ORACLE_MODEL,
                    prompt: combinedPrompt,
                    stream: false
                },
                {
                    auth: {
                        username: ORACLE_USER,
                        password: ORACLE_PASS
                    }
                }
            );
            return response.data.response;
        } catch (error) {
            console.error(`Oracle Error for prompt: ${systemPrompt.substring(0, 50)}...`, error.message);
            throw error;
        }
    };

    try {
        const [title, summary, solutions, categoriesRaw, assignee] = await Promise.all([
            // Title
            askOracle(
                "Generate a title for this support ticket as short as possible.",
                userRequestText
            ),
            // Summary
            askOracle(
                "Summarize the following user request as short as possible.",
                userRequestText
            ),
            // Solutions
            askOracle(
                "Suggest potential solutions for this support request. as short as possible.",
                userRequestText
            ),
            // Categories
            askOracle(
                "Categorize this request into one word.",
                userRequestText
            ),
            // Assignee
            askOracle(
                "Suggest responsible role for this request. as short as possible.",
                userRequestText
            )
        ]);

        // Post-processing limits
        const FIRST_CHARACTER = 0;
        const MAX_CATEGORY_CHARACTERS = 32;
        const MAX_SUMMARY_CHARACTERS = 2048;
        const MAX_TITLE_CHARACTERS = 128;
        const MAX_SOLUTION_CHARACTERS = 2048;

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
            suggestedAssignee: cleanString(assignee, MAX_CATEGORY_CHARACTERS)
        };

    } catch (error) {
        console.error("Oracle connection error:", error.message);
        if (error.response && error.response.status === 401) {
            return "Authentication failed. Check ORACLE_USER and ORACLE_PASS.";
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
        const response = await axios.post(
            ORACLE_URL,
            {
                model: ORACLE_MODEL,
                prompt: combinedPrompt,
                stream: false
            },
            {
                auth: {
                    username: ORACLE_USER,
                    password: ORACLE_PASS
                }
            }
        );

        const content = response.data.response;
        
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