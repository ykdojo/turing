import { GeminiAPI } from './dist/gemini-api.js';

// Test Gemini 2.5 Pro Experimental model
const gemini = new GeminiAPI("gemini-2.5-pro-exp-03-25");

// Define sample conversation history
const history = [
  {
    role: "user",
    parts: [
      {text: "hi"},
    ],
  },
  {
    role: "model",
    parts: [
      {text: "Thinking Process:\n\n1.  **Identify the input:** The user simply said \"hi\".\n2.  **Recognize the intent:** This is a standard greeting, initiating a conversation.\n3.  **Determine the appropriate response:** A polite and friendly greeting in return is the most suitable response.\n4.  **Formulate the response:**\n    *   Start with a reciprocal greeting: \"Hi there!\" or \"Hello!\" or \"Hi!\".\n    *   Add a polite follow-up to encourage further interaction: \"How can I help you today?\" or \"What can I do for you?\" or \"Is there anything I can assist you with?\".\n    *   Combine them for a natural flow.\n5.  **Select the best option:** \"Hi there! How can I help you today?\" is friendly, polite, and directly asks how the user wants to proceed. \"Hello!\" is also good but less engaging. \"Hi!\" is too minimal.\n6.  **Final Output:** \"Hi there! How can I help you today?\""},
      {text: "Hi there! How can I help you today?"},
    ],
  },
];

// Create a function to run the test
async function runTest() {
  try {
    console.log("Running Gemini API test...");
    
    // Test simple message without history
    console.log("Testing without history:");
    const response = await gemini.sendMessage("Tell me about the history of AI in 2-3 sentences.");
    console.log(response);
    
    // Test with history (uncomment to test)
    /*
    console.log("\nTesting with conversation history:");
    const chatSession = gemini.startChat(history);
    const resultWithHistory = await chatSession.sendMessage("Tell me more about machine learning.");
    console.log(resultWithHistory.response.text());
    */
    
    console.log("\nTest completed successfully!");
  } catch (error) {
    console.error("Error running test:", error);
  }
}

// Run the test
runTest();