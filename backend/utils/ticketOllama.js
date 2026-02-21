import axios from "axios";
import 'dotenv/config';
import pool from './mysqlConnection.js';
import AssigneeBalancer from './AssigneeBalancer.js';

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

// ORACLE for classification and grouping
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;
const SAFETY_FALLBACK_EMAIL = "admin@example.com";
const CLASSIFIER_URL = `${ORACLE_URL}/classifier/predict`;
const GROUPING_URL = `${ORACLE_URL}/group-drafts`;

class ClassifierService {
    constructor(classifierUrl, username, password) {
        this.apiUrl = classifierUrl;
        this.auth = { username, password };
    }

    async predictCategory(text) {
        if (!text) return "Others";
        try {
            const response = await axios.post(
                this.apiUrl,
                { text: text },
                {
                    auth: this.auth,
                    timeout: 5000
                }
            );
            return response.data.category || "Others";
        } catch (error) {
            console.error(`[Classifier] API Failed: ${error.message}`);
            return "Others";
        }
    }
}

const classifierService = new ClassifierService(CLASSIFIER_URL, ORACLE_USER, ORACLE_PASS);
const assigneeBalancer = new AssigneeBalancer(pool);

const cleanString = (str, maxLen) => {
    if (typeof str !== 'string') return "";
    return str.trim().slice(0, maxLen).replace(/^"|"$/g, '');
};

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

export async function draftTicketFromUserRequest(userRequestText) {
    try {
        console.log("Drafting Ticket (Ollama): Starting Sequential Chain...");

        const [summary, category] = await Promise.all([
            askOllama(
                `You are a helpful support assistant.
                 Summarize the user's request below into a clear, professional problem statement.
                 Do not include any introductory text like "Here is the summary". just the summary.`,
                userRequestText
            ),
            classifierService.predictCategory(userRequestText)
        ]);

        const cleanSummary = cleanString(summary, 2048);
        console.log(` -> Step 1 Done. Category: ${category}`);

        const title = await askOllama(
            `Generate a short, concise title (under 10 words) for this support ticket.
             Based ONLY on this summary: "${cleanSummary}"`,
            ""
        );
        console.log(" -> Step 2 Done (Title).");

        const solutions = await askOllama(
            `Suggest 3 short, actionable solutions or next steps for this issue.
             Based ONLY on this summary: "${cleanSummary}"`,
            ""
        );
        console.log(" -> Step 3 Done (Solution).");

        let assignedAgent = await assigneeBalancer.getAssigneeForScope(category);
        if (!assignedAgent) assignedAgent = SAFETY_FALLBACK_EMAIL;

        return {
            title: cleanString(title, 128),
            summary: cleanSummary,
            suggestedSolutions: cleanString(solutions, 2048),
            categories: [category],
            suggestedAssignee: assignedAgent
        };

    } catch (error) {
        console.error("Ollama connection error:", error.message);
        if (error.response && error.response.status === 404) {
            console.error(`Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}' in your terminal.`);
            return `AI Model '${OLLAMA_MODEL}' not found on server.`;
        }
        throw new Error("Failed to draft ticket via Ollama.");
    }
}

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
                auth: { username: ORACLE_USER, password: ORACLE_PASS },
                timeout: 5000
            }
        );

        return response.data.groups || [];

    } catch (error) {
        console.error("Merge Recommendation API failed:", error.message);
        return [];
    }
}
