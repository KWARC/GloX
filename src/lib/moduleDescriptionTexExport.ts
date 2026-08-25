import {
  buildDefinitionTexPreview,
  buildModuleTexPreview,
  buildModuleDescriptionStatement,
  generateModuleDescriptionModuleTex,
  type GenerateModuleTexInput,
  type ModuleDescriptionTexPreview,
} from "@/lib/moduleDescriptionTex";
import type { TexZipFile } from "@/lib/texZipExport";

export type ModuleDescriptionTexExportFailure = {
  moduleId: string;
  phase?: string;
  message: string;
};

export type ModuleDescriptionTexExportResult = {
  files: TexZipFile[];
  failures: ModuleDescriptionTexExportFailure[];
};

export class ModuleDescriptionTexExportError extends Error {
  readonly moduleId: string;
  readonly phase?: string;

  constructor(moduleId: string, phase: string | undefined, cause: unknown) {
    const detail = cause instanceof Error ? cause.message : String(cause);
    const phaseLabel = phase ? ` (${phase})` : "";
    super(`Module ${moduleId}${phaseLabel}: ${detail}`);
    this.name = "ModuleDescriptionTexExportError";
    this.moduleId = moduleId;
    this.phase = phase;
    if (cause instanceof Error) this.cause = cause;
  }

  toFailure(): ModuleDescriptionTexExportFailure {
    return {
      moduleId: this.moduleId,
      phase: this.phase,
      message: this.message,
    };
  }
}

export class ModuleDescriptionTexBulkExportError extends Error {
  readonly failures: readonly ModuleDescriptionTexExportFailure[];
  readonly exportedFileCount: number;

  constructor(
    failures: readonly ModuleDescriptionTexExportFailure[],
    exportedFileCount: number,
  ) {
    super(formatExportFailures(failures));
    this.name = "ModuleDescriptionTexBulkExportError";
    this.failures = failures;
    this.exportedFileCount = exportedFileCount;
  }

  get partialSuccess(): boolean {
    return this.exportedFileCount > 0;
  }
}

const LOG = "[module-descriptions export]";

function log(message: string): void {
  console.info(`${LOG} ${message}`);
}

function fail(moduleId: string, phase: string, cause: unknown): never {
  console.error(`${LOG} Failed on module ${moduleId} (${phase})`, cause);
  throw new ModuleDescriptionTexExportError(moduleId, phase, cause);
}

function formatExportFailures(
  failures: readonly ModuleDescriptionTexExportFailure[],
): string {
  if (failures.length === 0) return "LaTeX export failed";
  if (failures.length === 1) return failures[0].message;
  return [
    `${failures.length} module descriptions failed to export:`,
    ...failures.map((failure) => `- ${failure.message}`),
  ].join("\n");
}

async function runPhase<T>(
  moduleId: string,
  phase: string,
  fn: () => Promise<T>,
): Promise<T> {
  try {
    return await fn();
  } catch (cause) {
    fail(moduleId, phase, cause);
  }
}

function flattenPreview(preview: ModuleDescriptionTexPreview): TexZipFile[] {
  return [preview.moduleTex, ...preview.definitionTex];
}

async function generateTrackedPreview(
  input: GenerateModuleTexInput,
  onPhase: (message: string) => void,
): Promise<ModuleDescriptionTexPreview> {
  const { moduleId } = input;

  onPhase("module file TeX");
  const moduleStatement = buildModuleDescriptionStatement(input);
  const moduleTex = buildModuleTexPreview(
    input,
    await runPhase(moduleId, "module file", () =>
      generateModuleDescriptionModuleTex(input),
    ),
    moduleStatement,
  );

  const definitionTex = [];
  for (const block of input.definitionBlocks) {
    onPhase(`definition TeX for ${block.fileName}`);
    definitionTex.push(
      await runPhase(moduleId, `definition ${block.fileName}`, () =>
        buildDefinitionTexPreview(moduleId, block, input.definitionBlocks),
      ),
    );
  }

  return { moduleTex, definitionTex };
}

export async function generateAllModuleDescriptionTexFiles(
  modules: readonly GenerateModuleTexInput[],
): Promise<ModuleDescriptionTexExportResult> {
  const files: TexZipFile[] = [];
  const failures: ModuleDescriptionTexExportFailure[] = [];

  for (let index = 0; index < modules.length; index++) {
    const input = modules[index];
    const { moduleId } = input;
    log(`Processing module ${moduleId} (${index + 1}/${modules.length})`);

    try {
      const preview = await generateTrackedPreview(input, (phase) =>
        log(`${moduleId}: ${phase}`),
      );
      files.push(...flattenPreview(preview));
      log(`${moduleId}: done`);
    } catch (error) {
      if (error instanceof ModuleDescriptionTexExportError) {
        failures.push(error.toFailure());
        log(`Skipping module ${moduleId} after failure`);
        continue;
      }
      throw error;
    }
  }

  return { files, failures };
}
