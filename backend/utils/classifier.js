import axios from "axios";
import { classifierSchema } from "../middleware/validate.js";

async function predictCategory(classifierUrl, username, password, text) {
    const validated = classifierSchema.safeParse({classifierUrl, username, password, text});
    if (!validated.success) {
        console.error("predictCategory Error: ", validated.error.errors);
        return "Others";
    }
    if (!text) return "Others";
    try {
        const response = await axios.post(
            classifierUrl,
            { text: text },
            {
                auth: { username, password },
                timeout: 10000
            }
        );
        return response.data.category || "Others";
    } catch (error) {
        console.error(`[Classifier] API Failed: ${error.message}`);
        return "Others";
    }
}

export default predictCategory;