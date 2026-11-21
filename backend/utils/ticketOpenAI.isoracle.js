import axios from "axios";
import 'dotenv/config';
import pool from './mysqlConnection.js';
import getAssigneeForScope from './balancer.js';
import predictCategory from './classifier.js';

// --- CONFIGURATION ---
const SAFETY_FALLBACK_EMAIL = process.env.SAFETY_FALLBACK_EMAIL || "admin@example.com";
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_MODEL = process.env.ORACLE_MODEL || "qwen2.5:1.5b-instruct";
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;
const CLASSIFIER_URL = `${ORACLE_URL}/predict`;
const GROUPING_URL = `${ORACLE_URL}/group-drafts`;
const GENERATION_URL = `${ORACLE_URL}/api/generate`;

const cleanString = (str, maxLen) => {
    if (typeof str !== 'string') return "";
    return str.trim().slice(0, maxLen).replace(/^"|"$/g, '');
};

/**
 * Asks the Oracle (LLM) for a generative response.
 * Calculates and logs Tokens Per Second (TPS) if metadata is present.
 */
const askOracle = async (prompt) => {
    try {
        const response = await axios.post(
            GENERATION_URL,
            {
                model: ORACLE_MODEL,
                prompt: prompt,
                stream: false,
                options: {
                    num_predict: 200,    
                    top_k: 1,          
                    num_thread: 4,      
                    repeat_penalty: 1.2 
                }
            },
            {
                auth: { username: ORACLE_USER, password: ORACLE_PASS }
            }
        );

        // --- SPEEDOMETER START ---
        // Most local LLM APIs (Ollama, etc.) return eval_count (tokens) and eval_duration (nanoseconds)
        const data = response.data;
        if (data.eval_count && data.eval_duration) {
            // Convert nanoseconds to seconds
            const seconds = data.eval_duration / 1e9; 
            const tps = (data.eval_count / seconds).toFixed(2);
            console.log(`⚡ Speed: ${tps} t/s | Tokens: ${data.eval_count} | Time: ${seconds.toFixed(3)}s`);
        } else {
            // Fallback if the API uses different keys or headers
            console.log("⚠️ Speed metadata unavailable in response");
        }
        // --- SPEEDOMETER END ---

        return response.data.response;
    } catch (error) {
        console.error(`Oracle LLM Error:`, error.message);
        throw error;
    }
};

export async function draftTicketFromUserRequest(userRequestText) {
    console.time("⏱️  Total Execution Time");
    
    try {
        console.time("⏱️  Step 1: Summary & Classification (Parallel)");
        const [summary, category] = await Promise.all([
            askOracle(
                `Summarize the following problem as short as possible.
                Provide ONLY the summary, with no introductory text."${userRequestText}"`
            ),
            predictCategory(CLASSIFIER_URL, ORACLE_USER, ORACLE_PASS, userRequestText)
        ]);
        console.timeEnd("⏱️  Step 1: Summary & Classification (Parallel)");

        const cleanSummary = cleanString(summary, 2048);

        console.time("⏱️  Step 2: Title & Solution Gen & Assignee (Parallel)");
        const [title, solutions, assignedAgent] = await Promise.all([
            askOracle(
                `Generate a title for this support ticket as short as possible.
                Provide ONLY the title, with no introductory text. "${cleanSummary}"`
            ),
            askOracle(
                `Suggest 3 solutions for this support request. as short and concise as possible."${cleanSummary}"`
            ),
            getAssigneeForScope(pool, category, SAFETY_FALLBACK_EMAIL)
        ]);
        console.timeEnd("⏱️  Step 2: Title & Solution Gen & Assignee (Parallel)");

        const result = {
            title: cleanString(title, 128),
            summary: cleanSummary,
            suggestedSolutions: cleanString(solutions, 2048),
            categories: [category],
            suggestedAssignee: assignedAgent
        };

        console.timeEnd("⏱️  Total Execution Time");
        
        return result;

    } catch (error) {
        console.timeEnd("⏱️  Total Execution Time");
        console.error("Oracle connection error:", error.message);
        throw new Error("Failed to draft ticket via Oracle.");
    }
}

export async function findMergeRecommendations(drafts, threshold = 0.7) {
    if (!drafts || drafts.length < 2) return [];
    
    console.time("⏱️  Merge Recommendations API");
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

        console.timeEnd("⏱️  Merge Recommendations API");
        return response.data.groups || [];

    } catch (error) {
        console.timeEnd("⏱️  Merge Recommendations API");
        console.error("Merge Recommendation API failed:", error.message);
        return [];
    }
}