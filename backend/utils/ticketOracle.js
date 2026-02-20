// backend/utils/ticketOracle.js
import axios from "axios";
import 'dotenv/config';
import { pipeline, cos_sim } from '@xenova/transformers';
import pool from "./mysqlConnection.js";
// Configuration from environment variables
const ORACLE_URL = process.env.ORACLE_URL || "http://140.245.98.10:8080/api/generate";
const ORACLE_MODEL = process.env.ORACLE_MODEL || "qwen2.5:1.5b-instruct";
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;

const category_raw = await pool.query("SELECT name FROM Category");
const CATEGORY_LIST = category_raw.map(x => x.name);

export async function draftTicketFromUserRequest(userRequestText, assigneeList = "") {
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

    const contextInfo = assigneeList ? `Available assignees and their specializations:\n${assigneeList}` : "No specific assignees available.";

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
                `which of the following categories best describes this request. Answer as short as possible. No introduction. Here is the available categories. ${CATEGORY_LIST.join(", ")}.`,
                userRequestText
            ),
            // Assignee
            askOracle(
                `You are a strict automated ticket routing system. Your ONLY job is to output a single valid email address from the provided list.

                AVAILABLE ASSIGNEES:
                ${contextInfo}

                ROUTING LOGIC:
                1. First, analyze the User Request to determine the required expertise.
                2. Second, filter the assignees to only those whose scope tags match the required expertise.
                3. Third, from the matching assignees, prioritize selecting one who is currently available.
                4. Finally, return ONLY the chosen email address.

                CRITICAL RULES:
                - Output ONLY the raw email address (e.g., tech@example.com).
                - DO NOT output any conversational text, explanations, or warnings, even for emergencies.
                - If no assignee matches the scope, or if you are unsure, output EXACTLY the word "null".`,
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

        const cleanedCategory = cleanString(categoriesRaw, MAX_CATEGORY_CHARACTERS);
        
        let finalAssignee = cleanString(assignee, MAX_ASSIGNEE_CHARACTERS);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (finalAssignee.toLowerCase() === "null" || !emailRegex.test(finalAssignee)) {
            finalAssignee = null; 
        }

        return {
            title: cleanString(title, MAX_TITLE_CHARACTERS),
            summary: cleanString(summary, MAX_SUMMARY_CHARACTERS),
            suggestedSolutions: cleanString(solutions, MAX_SOLUTION_CHARACTERS),
            categories: cleanedCategory ? [cleanedCategory] : ["Uncategorized"],
            suggestedAssignee: finalAssignee 
        };

    } catch (error) {
        console.error("Oracle connection error:", error.message);
        if (error.response && error.response.status === 401) {
            return "Authentication failed. Check ORACLE_USER and ORACLE_PASS.";
        }
        return "Error connecting to AI service.";
    }
}
let extractorInstance = null;
async function getExtractor() {
    if (!extractorInstance) {
        extractorInstance = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    }
    return extractorInstance;
}

/**
 * Finds highly similar drafts and groups their IDs.
 * @param {Array} drafts - Array of objects containing { id, title, summary }
 * @param {number} threshold - Cosine similarity threshold (0.0 to 1.0). 
 * Higher means they must be more similar to be grouped.
 * @returns {Array<Array<number>>} Array of merged ID groups
 */
export async function findMergeRecommendations(drafts, threshold = 0.85) {
    if (drafts.length < 2) return [];

    try {
        const extractor = await getExtractor();

        // 1. Combine title and summary for the model to analyze
        const textsToEmbed = drafts.map(d => `${d.title}. ${d.summary}`);

        // 2. Generate embeddings for all drafts simultaneously
        // pooling: 'mean' and normalize: true are required for sentence similarity
        const output = await extractor(textsToEmbed, { pooling: 'mean', normalize: true });

        // Convert the Tensor output into a standard 2D JavaScript array
        const embeddings = output.tolist();

        // 3. Compare and Group
        const groups = [];
        const visited = new Set(); // Keep track of drafts already placed in a group

        for (let i = 0; i < drafts.length; i++) {
            // Skip if this draft was already matched with an earlier one
            if (visited.has(i)) continue;

            const currentGroup = [drafts[i].id];
            visited.add(i);

            // Compare draft[i] against all subsequent drafts
            for (let j = i + 1; j < drafts.length; j++) {
                if (visited.has(j)) continue;

                // Calculate cosine similarity between the two embeddings
                const similarity = cos_sim(embeddings[i], embeddings[j]);

                // If similarity meets our threshold, group them
                if (similarity >= threshold) {
                    currentGroup.push(drafts[j].id);
                    visited.add(j);
                }
            }

            // Only add to final output if we found at least one match
            if (currentGroup.length > 1) {
                groups.push(currentGroup);
            }
        }

        return groups;

    } catch (error) {
        console.error("Similarity analysis failed:", error.message);
        return [];
    }
}