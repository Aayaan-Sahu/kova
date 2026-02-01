/**
 * Chat API utility for communicating with the Protective Companion chatbot.
 */

const API_BASE_URL = 'http://localhost:8000';

export interface ChatResponse {
    response: string;
}

/**
 * Send a message to the chatbot and get a response.
 * Requires an active call session to provide context.
 */
export async function sendChatMessage(sessionId: string, query: string): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            session_id: sessionId,
            query: query,
        }),
    });

    if (!response.ok) {
        if (response.status === 404) {
            throw new Error('No active call session. Please start listening first.');
        }
        throw new Error('Failed to get response from chatbot');
    }

    const data: ChatResponse = await response.json();
    return data.response;
}
