export class ModuleError extends Error {
  readonly code: string;
  readonly moduleId: string;

  constructor(moduleId: string, code: string, message: string, options?: { cause?: unknown }) {
    super(message, options?.cause ? { cause: options.cause } : undefined);
    this.name = "ModuleError";
    this.code = code;
    this.moduleId = moduleId;
  }
}
