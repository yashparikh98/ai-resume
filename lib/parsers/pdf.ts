// Wrapper for pdf-parse to handle CommonJS module in ES module context
// Add polyfills for browser APIs that pdf-parse needs in serverless environments

// Polyfill DOMMatrix for serverless environments (required by pdf-parse)
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1;
    b = 0;
    c = 0;
    d = 1;
    e = 0;
    f = 0;
    m11 = 1;
    m12 = 0;
    m21 = 0;
    m22 = 1;
    m41 = 0;
    m42 = 0;

    constructor(init?: string | number[]) {
      if (init) {
        if (typeof init === "string") {
          // Parse matrix string
          const values = init.match(/[\d.+-]+/g)?.map(Number) || [];
          if (values.length >= 6) {
            this.a = values[0];
            this.b = values[1];
            this.c = values[2];
            this.d = values[3];
            this.e = values[4];
            this.f = values[5];
            this.m11 = values[0];
            this.m12 = values[1];
            this.m21 = values[2];
            this.m22 = values[3];
            this.m41 = values[4];
            this.m42 = values[5];
          }
        } else if (Array.isArray(init) && init.length >= 6) {
          this.a = init[0];
          this.b = init[1];
          this.c = init[2];
          this.d = init[3];
          this.e = init[4];
          this.f = init[5];
          this.m11 = init[0];
          this.m12 = init[1];
          this.m21 = init[2];
          this.m22 = init[3];
          this.m41 = init[4];
          this.m42 = init[5];
        }
      }
    }

    static fromMatrix(other?: any) {
      return new DOMMatrix();
    }

    multiply(other: any) {
      return new DOMMatrix();
    }

    translate(tx: number, ty: number) {
      return new DOMMatrix();
    }

    scale(sx: number, sy?: number) {
      return new DOMMatrix();
    }

    rotate(angle: number) {
      return new DOMMatrix();
    }
  };
}

// Polyfill DOMPoint if needed
if (typeof globalThis.DOMPoint === "undefined") {
  (globalThis as any).DOMPoint = class DOMPoint {
    x = 0;
    y = 0;
    z = 0;
    w = 1;
    constructor(x = 0, y = 0, z = 0, w = 1) {
      this.x = x;
      this.y = y;
      this.z = z;
      this.w = w;
    }
  };
}

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
