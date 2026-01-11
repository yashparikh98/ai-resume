// Wrapper for pdf-parse to handle CommonJS module in ES module context
// Use dynamic require to avoid issues in serverless environments
let pdfParseModule: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  pdfParseModule = require("pdf-parse");
} catch (error) {
  console.error("Failed to load pdf-parse:", error);
  // Fallback: export a function that throws a helpful error
  pdfParseModule = () => {
    throw new Error("PDF parsing is not available in this environment. Please ensure pdf-parse is properly installed.");
  };
}

// pdf-parse exports an object with PDFParse class and other exports
// The actual parsing function might be the module itself or we need to use PDFParse
// For compatibility, we'll export the module and handle usage in the route
export default pdfParseModule;
