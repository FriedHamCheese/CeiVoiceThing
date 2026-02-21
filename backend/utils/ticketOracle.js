import axios from "axios";
import 'dotenv/config';
import { pipeline, cos_sim } from '@xenova/transformers';
// Configuration from environment variables
const ORACLE_URL = process.env.ORACLE_URL || "http://140.245.98.10:8080/api/generate";
const ORACLE_MODEL = process.env.ORACLE_MODEL || "qwen2.5:1.5b-instruct";
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;
const SAFTY_FALLBACK_EMAIL = process.env.SAFTY_FALLBACK_EMAIL || "admin@example.com";

const extractEmails = (text) => {
    if (!text) return [];
    // This strict regex stops at the letters of the domain (.com) and ignores the colon
    const strictEmailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    return text.match(strictEmailRegex) || [];
};

/**
 * Asks the Oracle for a response.
 * @param {string} systemPrompt - The system prompt.
 * @param {string} userPrompt - The user prompt.
 * @returns {string} The response from the Oracle.
 * @throws {error} If the Oracle fails.
 */
const askOracle = async (systemPrompt, userPrompt) => {
    //Api takes a single prompt string.
    const combinedPrompt = `${systemPrompt} for User Request: ${userPrompt}`;
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


export async function draftTicketFromUserRequest(userRequestText, commaSeparatedTags, commaSeparatedAssignees = "") {
    try {
        const [title, summary, solutions, categories, assignee] = await Promise.all([
            // Title
            askOracle(
                `Generate a title for this support ticket as short as possible.
                Provide ONLY the title, with no introductory text.`,
                userRequestText
            ),
            // Summary
            askOracle(
                `Summarize the following user request as short as possible.
                You must capture all key facts and clearly state the user's ultimate goal.
                Provide ONLY the summary, with no introductory text.`,
                userRequestText
            ),
            // Solutions
            askOracle(
                "Suggest potential solutions for this support request. as short as possible.",
                userRequestText
            ),
            // Categories
            askOracle(
                `Which of the following categories best describes this request.
                Answer only one category name.
                Available categories: ${commaSeparatedTags}.`,
                userRequestText
            ),
            // Assignee
            askOracle(
                `Pick the best Assignee Email from the following list. No introduction or explanation. Only the email:${commaSeparatedAssignees}`,
                userRequestText
            )
        ]);

        // Post-processing limits
        const FIRST_CHARACTER = 0;
        const MAX_SUMMARY_CHARACTERS = 2048;
        const MAX_TITLE_CHARACTERS = 128;
        const MAX_SOLUTION_CHARACTERS = 2048;
        const MAX_ASSIGNEE_CHARACTERS = 64;

        const cleanString = (str, maxLen) => {
            if (typeof str !== 'string') return "";
            return str
                .trim()
                .slice(FIRST_CHARACTER, maxLen)
                .replace(/^"|"$/g, '');
        };

        // Fix 1: Corrected category handling
        let cleanedCategories;
        try {
            cleanedCategories = categories.split(",").map(c => c.trim()).filter(Boolean);
            if (cleanedCategories.length === 0) throw new Error();
        } catch (err) {
            cleanedCategories = ["Uncategorized"];
        }

        // Fix 2: Variable naming (assigneeList vs commaSeparatedAssignees)
        let finalAssignee = cleanString(assignee, MAX_ASSIGNEE_CHARACTERS);
        const availableEmails = typeof extractEmails === 'function' 
            ? extractEmails(commaSeparatedAssignees) 
            : [];

        // Fix 3: Validation logic
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const isEmailInvalid = !finalAssignee || finalAssignee.toLowerCase() === "null" || !emailRegex.test(finalAssignee);
        const isEmailHallucinated = availableEmails.length > 0 && !availableEmails.includes(finalAssignee);

        if (isEmailInvalid || isEmailHallucinated) {
            console.warn(`AI failed to pick a valid assignee. Output was: "${finalAssignee}". Falling back.`);
            if (availableEmails.length > 0) {
                finalAssignee = availableEmails[Math.floor(Math.random() * availableEmails.length)];
            } else {
                // Ensure SAFETY_FALLBACK_EMAIL is defined or use a string
                finalAssignee = typeof SAFETY_FALLBACK_EMAIL !== 'undefined' ? SAFETY_FALLBACK_EMAIL : "support@company.com";
            }
        }

        // Fix 4: Properly return the object and close the try block
        return {
            title: cleanString(title, MAX_TITLE_CHARACTERS),
            summary: cleanString(summary, MAX_SUMMARY_CHARACTERS),
            suggestedSolutions: cleanString(solutions, MAX_SOLUTION_CHARACTERS),
            categories: cleanedCategories,
            suggestedAssignee: finalAssignee
        };

    } catch (error) {
        console.error("Oracle connection error:", error.message);
        if (error.response && error.response.status === 401) {
            throw new Error("Authentication failed. Check ORACLE_USER and ORACLE_PASS.");
        }
        throw new Error("Error connecting to AI service.");
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