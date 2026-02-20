// backend/utils/ticketOracle.js
import axios from "axios";
import 'dotenv/config';
import { pipeline, cos_sim } from '@xenova/transformers';
import pool from "./mysqlConnection.js";

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

// Safely fetch categories when called, rather than at file load
async function getCategories() {
    try {
        const [category_raw] = await pool.query("SELECT name FROM Category");
        if (!category_raw || !Array.isArray(category_raw)) return [];
        return category_raw.map(x => x.name);
    } catch (error) {
        console.error("Database Error (Categories):", error.message);
        return []; // Fallback to an empty array so the prompt doesn't break
    }
}

export async function draftTicketFromUserRequest(userRequestText, assigneeList = "") {

    const contextInfo = assigneeList
        ? `Available assignees and their specializations:\n${assigneeList}`
        : "No specific assignees available.";

    const askOracle = async (systemPrompt, userPrompt) => {

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
            console.error("Oracle Error:", error.message);
            throw error;
        }
    };

    try {
        // Fetch categories dynamically right before we need them
        const CATEGORY_LIST = await getCategories();
        const [title, summary, solutions, categories, assignee] =
            await Promise.all([
                // title
                askOracle(
                    `Generate a title for this support ticket as short as possible.
                    Provide ONLY the title, with no introductory text.`,
                    userRequestText
                ),
                // summary
                askOracle(
                    `Summarize the user request as short as possible.
                    You must capture all key facts and clearly state the user's ultimate goal.
                    Provide ONLY the summary, with no introductory text.`,
                    userRequestText
                ),
                // solutions
                askOracle(
                    "Suggest potential solutions for this support request as short as possible.",
                    userRequestText
                ),
                // category
                askOracle(
                    `Which of the following categories best describes this request.
                     Answer only one category name.
                     Available categories: ${CATEGORY_LIST.join(', ')}.`,
                    userRequestText
                ),
                // assignee
                askOracle(
                    `Assign the ticket to the correct expert based on the user's request. 

                    First, match the request to one of these categories: ${CATEGORY_LIST.join(', ')}. 
                    Second, find the assignee matching that category from this list:
                    ${contextInfo}

                    STRICT RULES:
                    1. Output ONLY the raw email address of the chosen assignee.
                    2. The email MUST exist in the list above. No made-up addresses.
                    3. Absolutely no explanations, extra words, or formatting.`,
                    userRequestText
                )
            ]);

        const FIRST_CHARACTER = 0;
        const MAX_CATEGORY_CHARACTERS = 32;
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

        const cleanedCategory = cleanString(categories, MAX_CATEGORY_CHARACTERS);
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        let finalAssignee = cleanString(assignee, MAX_ASSIGNEE_CHARACTERS);
        const availableEmails = extractEmails(assigneeList);

        // Check 1: Is it empty or "null"?
        // Check 2: Is it a poorly formatted email?
        // Check 3: Did the AI hallucinate an email that ISN'T in our list?
        const isEmailInvalid = !finalAssignee || finalAssignee.toLowerCase() === "null" || !emailRegex.test(finalAssignee);
        const isEmailHallucinated = availableEmails.length > 0 && !availableEmails.includes(finalAssignee);

        if (isEmailInvalid || isEmailHallucinated) {
            console.warn(`AI failed to pick a valid assignee. Output was: "${finalAssignee}". Falling back to logic.`);
            
            if (availableEmails.length > 0) {
                // Let JavaScript handle the random selection reliably
                finalAssignee = availableEmails[Math.floor(Math.random() * availableEmails.length)];
            } else {
                // Default safety fallback
                finalAssignee = SAFTY_FALLBACK_EMAIL;
            }
        }

        return {
            title: cleanString(title, MAX_TITLE_CHARACTERS),
            summary: cleanString(summary, MAX_SUMMARY_CHARACTERS),
            suggestedSolutions: cleanString(solutions, MAX_SOLUTION_CHARACTERS),
            categories: cleanedCategory
                ? [cleanedCategory]
                : ["Uncategorized"],
            suggestedAssignee: finalAssignee
        };

    } catch (error) {

        console.error("Oracle connection error:", error.message);

        return "Error connecting to AI service.";
    }
}


let extractorInstance = null;

async function getExtractor() {
    if (!extractorInstance) {
        extractorInstance = await pipeline(
            'feature-extraction',
            'Xenova/all-MiniLM-L6-v2'
        );
    }
    return extractorInstance;
}

export async function findMergeRecommendations(drafts, threshold = 0.85) {

    if (drafts.length < 2) return [];

    try {
        const extractor = await getExtractor();

        const textsToEmbed = drafts.map(
            d => `${d.title}. ${d.summary}`
        );

        const output = await extractor(
            textsToEmbed,
            { pooling: 'mean', normalize: true }
        );

        const embeddings = output.tolist();

        const groups = [];
        const visited = new Set();

        for (let i = 0; i < drafts.length; i++) {

            if (visited.has(i)) continue;

            const currentGroup = [drafts[i].id];
            visited.add(i);

            for (let j = i + 1; j < drafts.length; j++) {

                if (visited.has(j)) continue;

                const similarity = cos_sim(
                    embeddings[i],
                    embeddings[j]
                );

                if (similarity >= threshold) {
                    currentGroup.push(drafts[j].id);
                    visited.add(j);
                }
            }

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