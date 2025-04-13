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
    console.log("Running Gemini API connection test...");
    
    // Exact response test for automated validation
    const testKeyword = "GEMINI_TEST_1234";
    const exactResponse = await gemini.sendMessage(
      `Return ONLY the word ${testKeyword} with no punctuation, explanation, or other text.`
    );
    console.log(`Response: "${exactResponse}"`);
    
    // Validate the response programmatically
    if (exactResponse.trim() === testKeyword) {
      console.log("✅ TEST PASSED: Exact response matched expected output");
      process.exitCode = 0; // Success for CI/CD pipelines
    } else {
      console.log("❌ TEST FAILED: Response did not match expected output");
      console.log(`Expected: "${testKeyword}"`);
      console.log(`Received: "${exactResponse}"`);
      process.exitCode = 1; // Failure for CI/CD pipelines
    }
  } catch (error) {
    console.error("❌ TEST FAILED: Error running test:", error);
    process.exitCode = 1; // Failure for CI/CD pipelines
  }
}

// Run the test
runTest();