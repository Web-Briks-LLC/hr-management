/**
 * Sends SMS using BulkSMSBD API.
 * Supports single number or multiple numbers (comma-separated or array).
 */
export const sendBulkSMS = async (options: {
    number: string | string[];
    message: string;
}): Promise<{ response_code: number; success_message: string; error?: string }> => {
    const { number, message } = options;
    const apiKey = process.env.SMS_API_KEY;

    if (!apiKey) {
        console.error("[SMS] SMS_API_KEY is not defined in environment variables.");
        return { response_code: 401, success_message: "API Key missing" };
    }

    // 1. Prepare numbers: If array or comma-sep, clean each and join.
    const numbersArray = Array.isArray(number) ? number : number.split(",");
    const cleanNumbers = numbersArray
        .map((n) => n.trim().replace(/\D/g, "")) // Remove non-digit characters
        .filter((n) => n.length >= 10) // Basic validation for BD numbers
        .join(",");

    if (!cleanNumbers) {
        console.warn("[SMS] No valid phone numbers provided.");
        return { response_code: 400, success_message: "No valid numbers" };
    }

    const smsData = {
        api_key: apiKey,
        type: "text", // English text
        senderid: "8809617626643", // Non-masking numeric ID as per reference
        number: cleanNumbers,
        message: message,
    };

    try {
        const response = await fetch("http://bulksmsbd.net/api/smsapi", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(smsData),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data: any = await response.json();
        return data;
    } catch (error: any) {
        console.error("[SMS] API Error:", error.message);
        return {
            response_code: 500,
            success_message: "Network Error",
            error: error.message,
        };
    }
};
