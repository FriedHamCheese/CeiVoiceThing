import axios from "axios";
import 'dotenv/config';
import pool from './mysqlConnection.js';

import AssigneeBalancer from './AssigneeBalancer.js';

// --- CONFIGURATION ---
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_MODEL = process.env.ORACLE_MODEL || "qwen2.5:1.5b-instruct";
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;
const SAFETY_FALLBACK_EMAIL = "admin@example.com";
const CLASSIFIER_URL = `${ORACLE_URL}/classifier/predict`;
const GROUPING_URL = `${ORACLE_URL}/group-drafts`;
const GENERATION_URL = `${ORACLE_URL}/api/generate`;
// --- INITIALIZE SERVICES ---

const assigneeBalancer = new AssigneeBalancer(pool);

/**
 * Helper to clean up LLM text output
 */
const cleanString = (str, maxLen) => {
    if (typeof str !== 'string') return "";
    return str.trim().slice(0, maxLen).replace(/^"|"$/g, '');
};

/**
 * 
 */
class ClassifierService {
    constructor(classifierUrl, username, password) {
        // Prepare the specific endpoint
        // Example: http://140.245.x.x:8080/classifier/predict
        this.apiUrl = classifierUrl;
        this.auth = { username, password };
    }

    /**
     * Sends text to Python model and returns the category.
     * @param {string} text - The ticket content
     * @returns {Promise<string>} - Category name (e.g. "Finance", "Medical", "Others")
     */
    async predictCategory(text) {
        if (!text) return "Others";

        const startTimer = Date.now();
        try {
            const response = await axios.post(
                this.apiUrl,
                { text: text },
                {
                    auth: this.auth
                }
            );

            console.log(`[Stopwatch] predictCategory took ${Date.now() - startTimer}ms`);
            // The Python API returns: { category: "...", confidence: 0.9, ... }
            return response.data.category || "Others";

        } catch (error) {
            console.log(`[Stopwatch] predictCategory failed after ${Date.now() - startTimer}ms`);
            console.error(`[Classifier] API Failed: ${error.message}`);
            // Fail gracefully so the ticket system doesn't crash
            return "Others";
        }
    }
}

const classifierService = new ClassifierService(CLASSIFIER_URL, ORACLE_USER, ORACLE_PASS);
/**
 * Asks the Oracle (LLM) for a generative response.
 */
const askOracle = async (prompt) => {
    const startTimer = Date.now();
    try {
        const response = await axios.post(
            GENERATION_URL,
            {
                model: ORACLE_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    num_predict: 200,    // Hard limit on length (Reasoning models need tokens to think first)
                    top_k: 1,          // Smaller search space = faster
                    num_thread: 4,      // Match your Oracle OCPUs
                    repeat_penalty: 1.2 // Prevents the model from getting stuck in a loop
                }
            },
            {
                auth: { username: ORACLE_USER, password: ORACLE_PASS }
            }
        );
        console.log(`[Stopwatch] askOracle took ${Date.now() - startTimer}ms`);
        return response.data.response;
    } catch (error) {
        console.log(`[Stopwatch] askOracle failed after ${Date.now() - startTimer}ms`);
        console.error(`Oracle LLM Error:`, error.message);
        return ""; // Return empty string so Promise.all doesn't crash everything
    }
};
/**
 * Main Function: Generates a full ticket draft.
 * STRATEGY: Sequential Chain-of-Thought for maximum quality.
 * 1. Summary (Ground Truth)
 * 2. Title (Derived from Summary)
 * 3. Solution (Derived from Summary)
 */
export async function draftTicketFromUserRequest(userRequestText) {
    const startTimer = Date.now();
    try {
        console.log("Drafting Ticket: Starting Sequential Chain...");

        // --- STEP 1: The Foundation (Summary & Category) ---
        // We run these two in parallel because they don't depend on each other.
        // This saves about ~200ms without hurting quality.
        const [summary, category] = await Promise.all([
            askOracle(
                `Summarize the following problem as short as possible.
                Provide ONLY the summary, with no introductory text."${userRequestText}"`
            ),
            classifierService.predictCategory(userRequestText)
        ]);

        // Clean the summary immediately so subsequent steps get good input
        let cleanSummary = cleanString(summary, 2048);
        console.log(` -> Step 1 Done. Category: ${category}`);

        const title = await askOracle(
            `Generate a title for this support ticket as short as possible.
            Provide ONLY the title, with no introductory text. "${cleanSummary}"`
        );
        console.log(" -> Step 2 Done (Title).");


        // --- STEP 3: The Solution (Dependent on Summary) ---
        // We ask for a solution based on the *Summary*.
        const solutions = await askOracle(
            `Suggest 3 solutions for this support request. as short and concise as possible."${cleanSummary}"`
        );
        console.log(" -> Step 3 Done (Solution).");


        // --- STEP 4: The Assignee (Dependent on Category) ---
        let assignedAgent = await assigneeBalancer.getAssigneeForScope(category);
        if (!assignedAgent) assignedAgent = SAFETY_FALLBACK_EMAIL;

        console.log(`[Stopwatch] draftTicketFromUserRequest took ${Date.now() - startTimer}ms`);
        return {
            title: cleanString(title, 256),
            summary: cleanString(summary, 2048),
            suggestedSolutions: cleanString(solutions, 2048),
            categories: [category],
            suggestedAssignee: assignedAgent
        };

    } catch (error) {
        console.log(`[Stopwatch] draftTicketFromUserRequest failed after ${Date.now() - startTimer}ms`);
        console.error("Drafting failed:", error);
        throw new Error("Failed to draft ticket.");
    }
}

/**
 * Finds highly similar drafts using the Python Backend.
 * Replaces the local Xenova transformer.
 */
export async function findMergeRecommendations(drafts, threshold = 0.85) {
    if (!drafts || drafts.length < 2) return [];
    try {
        const response = await axios.post(
            GROUPING_URL,
            {
                drafts: drafts,
                threshold: threshold
            },
            {
                auth: { username: ORACLE_USER, password: ORACLE_PASS }
            }
        );
        return response.data.groups || [];

    } catch (error) {
        console.error("Merge Recommendation API failed:", error.message);
        return []; // Fail gracefully (return no recommendations)
    }
}