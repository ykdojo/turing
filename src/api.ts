// Mock AI API service

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// Simulates getting a response from an AI service
export const getAIResponse = (userMessage: string): Promise<string> => {
  // This would be replaced with actual API call in production
  return new Promise((resolve) => {
    // Mock delay to simulate network request
    setTimeout(() => {
      // Simple mock responses based on user input
      if (userMessage.toLowerCase().includes('react component')) {
        resolve("Here's a simple React component example:\n\nfunction Greeting({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}");
      } else if (userMessage.toLowerCase().includes('typescript')) {
        resolve("TypeScript is a strongly typed programming language that builds on JavaScript. Here's an example:\n\ninterface User {\n  name: string;\n  age: number;\n}\n\nconst user: User = {\n  name: 'Alice',\n  age: 30\n};");
      } else {
        resolve(`I received your message: "${userMessage}". How can I help you further?`);
      }
    }, 2000); // 2 second delay
  });
};