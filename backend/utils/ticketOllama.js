import axios from "axios";
import 'dotenv/config';
import { pipeline, cos_sim } from '@xenova/transformers';

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

export async function draftTicketFromUserRequest(userRequestText, commaSeparatedTags, commaSeparatedAssignees = "") {
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
        const [title, summary, solutions, categories, assignee] = await Promise.all([
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
                `Pick the best word for this request only from the given set of words separated by commas. Here are the available words: ${commaSeparatedTags}`,
                userRequestText
            ),
            // Assignee
            askOllama(
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
            return str.trim().slice(FIRST_CHARACTER, maxLen).replace(/^"|"$/g, '');
        };

        let cleanedCategories;
        try {
            cleanedCategories = categories.split(",").map(category => category.trim());
        } catch (err) {
            cleanedCategories = ["Uncategorized"];
        }

        return {
            title: cleanString(title, MAX_TITLE_CHARACTERS),
            summary: cleanString(summary, MAX_SUMMARY_CHARACTERS),
            suggestedSolutions: cleanString(solutions, MAX_SOLUTION_CHARACTERS),
            categories: cleanedCategories,
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
