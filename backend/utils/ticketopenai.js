import OpenAI from "openai";
import 'dotenv/config';
const openAIClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function draftTicketFromUserRequest(userRequestText) {
    /*
    Returns:
    - {
        .summary: str (requested at most 220 words, trim and truncate to 2048 characters),
        .title: str (requested at most 10 words, trim and truncate to 128 characters),
        .suggested_solutions: str (requested at most 220 words, trim and truncate to 2048 characters),
        (assuming 6 characters/word on average, so 1.5x of that is 9.)
    }
    - str: describing error with JSON parsing or missing attributes.
    
    Throws undocumented exceptions
    */

    const response = await openAIClient.responses.create({
        model: "gpt-3.5-turbo", // Changed to a valid OpenAI model
        input: [ // Changed 'input' to 'messages' for chat models
            {
                role: "user",
                content: userRequestText,
            }
        ],
        instructions: "Return a short summary, title, suggested solutions, one-word categories, and a suggested assignee of the input in JSON format. Summary should not be longer than the original input. \
            Summary attribute has the name of summary, title attribute has the name of title, suggested solutions attribute has the name of suggestedSolutions, categories attribute has the name of categories, and assignee attribute has the name of suggestedAssignee. \
            Categories is an Array of Strings. suggestedAssignee should be a string representing a department or role (e.g., IT, HR, Billing, Technical Support) matching the categories. \
            Summary can have at most 220 words, title can have at most 10 words, suggested solutions can have at most 220 words and categories can have at most 5 elements.\
        ",
        stream: false,
    });

    let objectFromResponse;
    try {
        //Raises SyntaxError if argument is not a valid JSON.
        objectFromResponse = JSON.parse(response.choices[0].message.content); // Corrected access to content
    } catch (err) { // 'err' was undefined in the original catch block.
        if (err instanceof SyntaxError) return "Malformed JSON from LLM.";
        else throw err;
    }

    if (typeof objectFromResponse.summary !== "string")
        return ".summary attribute not string type.";
    if (typeof objectFromResponse.title !== "string")
        return ".title attribute not string type.";
    if (typeof objectFromResponse.suggestedSolutions !== "string")
        return ".suggestedSolutions attribute not string type.";
    if (!(objectFromResponse.categories instanceof Array))
        return ".categories attribute not Array type.";
    if (typeof objectFromResponse.suggestedAssignee !== "string")
        return ".suggestedAssignee attribute not string type.";


    const FIRST_CHARACTER = 0;
    const MAX_CATEGORY_CHARACTERS = 32;
    const MAX_SUMMARY_CHARACTERS = 2048;
    const MAX_TITLE_CHARACTERS = 128;
    const MAX_SOLUTION_CHARACTERS = 2048;

    const checkedCategories = [];
    //So we log one category error instead of 5 or something
    let hasInvalidCategoryType = false;
    for (const category of objectFromResponse.categories) {
        if (typeof category !== "string")
            hasInvalidCategoryType = true;
        else
            checkedCategories.push(category.trim().slice(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS)); // Changed substr to slice
    }

    if (hasInvalidCategoryType) console.log("AI suggestion for category from user request has invalid type.");

    objectFromResponse.summary = objectFromResponse.summary.trim().slice(FIRST_CHARACTER, MAX_SUMMARY_CHARACTERS); // Changed substr to slice
    objectFromResponse.title = objectFromResponse.title.trim().slice(FIRST_CHARACTER, MAX_TITLE_CHARACTERS); // Changed substr to slice
    objectFromResponse.suggestedSolutions = objectFromResponse.suggestedSolutions.trim().slice(FIRST_CHARACTER, MAX_SOLUTION_CHARACTERS); // Changed substr to slice
    objectFromResponse.categories = checkedCategories;
    objectFromResponse.suggestedAssignee = objectFromResponse.suggestedAssignee.trim().slice(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS);

    return objectFromResponse;
}

export async function findMergeRecommendations(drafts) {
    if (drafts.length < 2) return [];

    const prompt = drafts.map(d => `ID ${d.id}: Title: ${d.title}. Summary: ${d.summary}`).join('\n\n');

    try {
        const response = await openAIClient.responses.create({
            model: "gpt-3.5-turbo",
            input: [
                {
                    role: "user",
                    content: prompt
                }
            ],
            instructions: "Analyze the following support ticket drafts and identify groups of IDs that are highly similar and could be merged into a single ticket. Return only a JSON array of arrays, where each inner array contains the IDs of tickets that should be merged (e.g., [[1, 3], [4, 7, 8]]). If no similarities are found, return [].",
            stream: false,
        });

        const groups = JSON.parse(response.choices[0].message.content);
        return Array.isArray(groups) ? groups : [];
    } catch (error) {
        console.error("Similarity analysis failed:", error);
        return [];
    }
}
