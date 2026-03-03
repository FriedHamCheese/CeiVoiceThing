import OpenAI from "openai";
import 'dotenv/config';
import axios from "axios";
import pool from './mysqlConnection.js';
import getAssigneeForScope from './balancer.js';
import predictCategory from './classifier.js';

const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ORACLE for classification and grouping
const SAFETY_FALLBACK_EMAIL = process.env.SAFETY_FALLBACK_EMAIL || "admin@example.com";
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;
const CLASSIFIER_URL = `${ORACLE_URL}/predict`;
const GROUPING_URL = `${ORACLE_URL}/group-drafts`;

const cleanString = (str, maxLen) => {
    if (typeof str !== 'string') return "";
    return str.trim().slice(0, maxLen).replace(/^"|"$/g, '');
};

const askOpenAI = async (prompt, jsonMode = false) => {
    const start = Date.now(); // Start timer for this specific call
    try {
        const response = await openAIClient.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: "You are a helpful support assistant." },
                { role: "user", content: prompt }, 
            ],
            response_format: jsonMode ? { type: "json_object" } : undefined,
            stream: false,
        }, { timeout: 15000 }); // 15 seconds timeout

        // --- SPEEDOMETER START ---
        const end = Date.now();
        const durationSeconds = (end - start) / 1000;
        const usage = response.usage; // OpenAI returns { prompt_tokens, completion_tokens, total_tokens }
        
        if (usage && usage.completion_tokens > 0) {
            const tps = (usage.completion_tokens / durationSeconds).toFixed(2);
            console.log(`⚡ Speed: ${tps} t/s | Tokens: ${usage.completion_tokens} | Time: ${durationSeconds.toFixed(3)}s`);
        } else {
            console.log(`⚡ Time: ${durationSeconds.toFixed(3)}s (Token stats unavailable)`);
        }
        // --- SPEEDOMETER END ---

        return response.choices[0].message.content;
    } catch (error) {
        console.error(`OpenAI Error for prompt: ${prompt.substring(0, 50)}...`, error.message);
        throw error;
    }
};

export async function draftTicketFromUserRequest(userRequestText) {
    // 1. Start Total Timer
    console.time("⏱️  Total Execution Time");

    try {
        // 2. Timer for Phase 1 (Parallel Summary & Classification)
        console.time("⏱️  Step 1: Summary & Classification (Parallel)");
        const [summary, category] = await Promise.all([
            askOpenAI(
                `Summarize the user's request below into a clear, professional problem statement.
                 Do not include any introductory text like "Here is the summary". just the summary. ${userRequestText}`
            ),
            predictCategory(CLASSIFIER_URL, ORACLE_USER, ORACLE_PASS, userRequestText)
        ]);
        console.timeEnd("⏱️  Step 1: Summary & Classification (Parallel)");

        const cleanSummary = cleanString(summary, 2048);

        // 3. Timer for Phase 2 (Parallel Title & Solution Gen)
        console.time("⏱️  Step 2: Title & Solution Gen & Assignee (Parallel)");
        const [title, solutions, assignedAgent] = await Promise.all([
            askOpenAI(
                `Generate a short, concise title (under 10 words) for this support ticket.
                 Based ONLY on this summary: "${cleanSummary}"`
            ),
            askOpenAI(
                `Suggest 3 short, actionable solutions or next steps for this issue.
                 Based ONLY on this summary: "${cleanSummary}"`
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

        // 5. End Total Timer
        console.timeEnd("⏱️  Total Execution Time");

        return result;

    } catch (error) {
        console.timeEnd("⏱️  Total Execution Time"); // Ensure timer ends even on error
        console.error("OpenAI connection error:", error.message);
        throw new Error("Failed to draft ticket via OpenAI.");
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