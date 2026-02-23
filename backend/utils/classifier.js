import axios from "axios";

async function predictCategory(classifierUrl, username, password, text) {
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