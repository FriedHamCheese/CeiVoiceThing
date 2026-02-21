import OpenAI from "openai";
import 'dotenv/config';
import pool from './mysqlConnection.js';
import AssigneeBalancer from './AssigneeBalancer.js';

const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ORACLE for classification and grouping
const ORACLE_URL = process.env.ORACLE_URL;
const ORACLE_USER = process.env.ORACLE_USER;
const ORACLE_PASS = process.env.ORACLE_PASS;
const SAFETY_FALLBACK_EMAIL = "admin@example.com";
const CLASSIFIER_URL = `${ORACLE_URL}/classifier/predict`;
const GROUPING_URL = `${ORACLE_URL}/group-drafts`;

import axios from "axios";

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

const askOpenAI = async (systemPrompt, userPrompt, jsonMode = false) => {
    try {
        const response = await openAIClient.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt }
            ],
            response_format: jsonMode ? { type: "json_object" } : undefined,
            stream: false,
        });
        return response.choices[0].message.content;
    } catch (error) {
        console.error(`OpenAI Error for prompt: ${systemPrompt.substring(0, 50)}...`, error.message);
        throw error;
    }
};

export async function draftTicketFromUserRequest(userRequestText) {
    try {
        const [summary, category] = await Promise.all([
            askOpenAI(
                `You are a helpful support assistant.
                 Summarize the user's request below into a clear, professional problem statement.
                 Do not include any introductory text like "Here is the summary". just the summary.`,
                userRequestText
            ),
            classifierService.predictCategory(userRequestText)
        ]);

        const cleanSummary = cleanString(summary, 2048);

        const title = await askOpenAI(
            `Generate a short, concise title (under 10 words) for this support ticket.
             Based ONLY on this summary: "${cleanSummary}"`,
            ""
        );

        const solutions = await askOpenAI(
            `Suggest 3 short, actionable solutions or next steps for this issue.
             Based ONLY on this summary: "${cleanSummary}"`,
            ""
        );

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
        console.error("OpenAI connection error:", error.message);
        throw new Error("Failed to draft ticket via OpenAI.");
    }
}

export async function findMergeRecommendations(drafts, threshold = 0.7) {
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
        return [];
    }
}
