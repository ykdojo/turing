import * as fs from 'fs';
import * as path from 'path';

// The file to log to
const LOG_FILE = path.join(process.cwd(), 'debug.log');

// Clear log file on start
try {
  fs.writeFileSync(LOG_FILE, '', 'utf8');
} catch (error) {
  console.error('Failed to clear log file:', error);
}

/**
 * Log a message to the debug log file
 */
export function logDebug(message: string, data?: any): void {
  try {
    const timestamp = new Date().toISOString();
    let logMessage = `[${timestamp}] ${message}`;
    
    if (data !== undefined) {
      // Format the data to be more readable
      const formattedData = typeof data === 'object' 
        ? JSON.stringify(data, null, 2) 
        : data.toString();
      
      logMessage += `\n${formattedData}\n`;
    }
    
    logMessage += '\n---\n';
    
    // Append to log file
    fs.appendFileSync(LOG_FILE, logMessage, 'utf8');
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}