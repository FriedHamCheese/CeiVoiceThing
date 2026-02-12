import "dotenv/config";
import OpenAI from "openai";
const openAIClient = new OpenAI();

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
	
	const response = await openAIClient.responses.create({
		model: "gpt-4.1-nano",
		input: [
			{
				role: "user",
				content: userRequestText,
			}
		],
		instructions: "Return a short summary, title, suggested solutions and one-word categories of the input in JSON format. Summary should not be longer than the original input. \
			Summary attribute has the name of summary, title attribute has the name of title, suggested solutions attribute has the name of suggestedSolutions and categories attribute has the name of categories. \
			Categories is an Array of Strings.\
			Summary can have at most 220 words, title can have at most 10 words, suggested solutions can have at most 220 words and categories can have at most 5 elements.\
			\
		",
		stream: false,
	});
	
	let objectFromResponse;
	try{
		//Raises SyntaxError if argument is not a valid JSON.
		objectFromResponse = JSON.parse(response.output_text);
	}catch{
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
			checkedCategories.push(category.trim().substr(FIRST_CHARACTER, MAX_CATEGORY_CHARACTERS));
	}
	
	if(hasInvalidCategoryType) console.log("AI suggestion for category from user request has invalid type.");
	
	objectFromResponse.summary = objectFromResponse.summary.trim().substr(FIRST_CHARACTER, MAX_SUMMARY_CHARACTERS);
	objectFromResponse.title = objectFromResponse.title.trim().substr(FIRST_CHARACTER, MAX_TITLE_CHARACTERS);
	objectFromResponse.suggestedSolutions = objectFromResponse.suggestedSolutions.trim().substr(FIRST_CHARACTER, MAX_SOLUTION_CHARACTERS);
	objectFromResponse.categories = checkedCategories;
	
	return objectFromResponse;
}