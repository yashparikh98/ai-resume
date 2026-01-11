// Wrapper for pdf-parse to handle CommonJS module in ES module context
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParseModule = require("pdf-parse");

// pdf-parse exports an object with PDFParse class and other exports
// The actual parsing function might be the module itself or we need to use PDFParse
// For compatibility, we'll export the module and handle usage in the route
export default pdfParseModule;
