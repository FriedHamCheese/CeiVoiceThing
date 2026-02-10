import axios from "axios";
import 'dotenv/config';
const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434/api/chat";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL;

export async function draftTicketFromUserRequest(userRequestText){
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
    
    let response;
    try {
        response = await axios.post(OLLAMA_URL, {
            model: OLLAMA_MODEL,
            messages: [
                {
                    role: "system",
                    content: "Return a short summary, title, suggested solutions and categories of the input in JSON format. \
                        Summary should not be longer than the original input. \
                        Summary attribute has the name of summary, title attribute has the name of title, suggested solutions attribute has the name of suggestedSolutions, and categories attribute has the name of categories. \
                        Categories is an Array of Strings of one word. \
                        Suggested solutions must have 1 to 3 actionable steps. suggestedSolutions is a string and not an array.\
                        Summary can have at most 50 words, title can have at most 10 words, suggested solutions can have at most 50 words and categories can have at most 5 elements.\
                    ",
                },
                {
                    role: "user", 
                    content: userRequestText,
                }
            ],
            stream: false,
            format: "json",
        });
    } catch (error) {
        console.error("Ollama connection error:", error.message);
        if (error.response && error.response.status === 404) {
            console.error(`Model '${OLLAMA_MODEL}' not found. Run 'ollama pull ${OLLAMA_MODEL}' in your terminal.`);
            return `AI Model '${OLLAMA_MODEL}' not found on server.`;
        }
        return "Error connecting to AI service.";
    }
    
    let objectFromResponse;
    try{
        //Raises SyntaxError if argument is not a valid JSON.
        objectFromResponse = JSON.parse(response.data.message.content); 
    }catch(err){ // 'err' was undefined in the original catch block.
        if(err instanceof SyntaxError) return "Malformed JSON from LLM.";
        else throw err;
    }
    
    if(typeof objectFromResponse.summary !== "string")
        return ".summary attribute not string type.";
    if(typeof objectFromResponse.title !== "string")
        return ".title attribute not string type.";	
    if(typeof objectFromResponse.suggestedSolutions !== "string")
        return ".suggestedSolutions attribute not string type.";	
    if(!(objectFromResponse.categories instanceof Array))
        return ".categories attribute not Array type.";
    
    
    const FIRST_CHARACTER = 0;
    const MAX_CATEGORY_CHARACTERS = 32;
    const MAX_SUMMARY_CHARACTERS = 2048;
    const MAX_TITLE_CHARACTERS = 128;
    const MAX_SOLUTION_CHARACTERS = 2048;	
    
    const checkedCategories = [];
    //So we log one category error instead of 5 or something
    let hasInvalidCategoryType = false;
    for(const category of objectFromResponse.categories){
        if(typeof category !== "string")
            hasInvalidCategoryType = true;
        else
            checkedCategories.push(category.trim().slice(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS)); // Changed substr to slice
    }
    
    if(hasInvalidCategoryType) console.log("AI suggestion for category from user request has invalid type.");
    
    objectFromResponse.summary = objectFromResponse.summary.trim().slice(FIRST_CHARACTER, MAX_SUMMARY_CHARACTERS); // Changed substr to slice
    objectFromResponse.title = objectFromResponse.title.trim().slice(FIRST_CHARACTER, MAX_TITLE_CHARACTERS); // Changed substr to slice
    objectFromResponse.suggestedSolutions = objectFromResponse.suggestedSolutions.trim().slice(FIRST_CHARACTER, MAX_SOLUTION_CHARACTERS); // Changed substr to slice
    objectFromResponse.categories = checkedCategories;
    
    return objectFromResponse;
}