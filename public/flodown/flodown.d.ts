declare namespace wasm_bindgen {
	/* tslint:disable */
	/* eslint-disable */
	/**
	 * The `ReadableStreamType` enum.
	 *
	 * *This API requires the following crate features to be activated: `ReadableStreamType`*
	 */
	
	type ReadableStreamType = "bytes";
	export type FloDownBlock = { type: "blockquote"; content: FloDownBlock[] } | { type: "paragraph"; content: FloDownInline[] } | { type: "blockmath"; text: string } | { type: "blockcode"; language: string; text: string } | { type: "heading"; level: HeadingLevel; content: FloDownInline[] } | { type: "numberedlist"; lines: FloDownBlock[][] } | { type: "bulletlist"; lines: FloDownBlock[][] } | { type: "definition"; for_symbols: SymbolUri[]; content: FloDownBlockInDefinition[] } | { type: "thematicbreak" };
	
	export type FloDownBlockInDefinition = { type: "blockquote"; content: FloDownBlockInDefinition[] } | { type: "paragraph"; content: FloDownInlineInDefinition[] } | { type: "blockmath"; text: string } | { type: "blockcode"; language: string; text: string } | { type: "heading"; level: HeadingLevel; content: FloDownInlineInDefinition[] } | { type: "numberedlist"; lines: FloDownBlockInDefinition[][] } | { type: "bulletlist"; lines: FloDownBlockInDefinition[][] } | { type: "thematicbreak" };
	
	export type FloDownInline = { type: "text"; text: string } | { type: "math"; text: string } | { type: "code"; text: string } | { type: "bold"; content: FloDownInline[] } | { type: "italic"; content: FloDownInline[] } | { type: "highlight"; content: FloDownInline[] } | { type: "strikethrough"; content: FloDownInline[] } | { type: "superscript"; content: FloDownInline[] } | { type: "subscript"; content: FloDownInline[] } | { type: "symref"; uri: SymbolUri; content: FloDownInline[] } | { type: "link"; url: string; content: FloDownInline[] };
	
	export type FloDownInlineInDefinition = { type: "definiendum"; uri: SymbolUri; content: FloDownInline[] } | { type: "definiens"; uri: SymbolUri; content: FloDownInline[] } | ({ type: "inline" } & FloDownInline);
	
	export type Uri = string;
	
	export type DomainUri = string;
	
	export type NarrativeUri = string;
	
	export type LeafUri = string;
	
	export type Id = string;
	
	export type DocumentElementUri = string;
	
	export type BaseUri = string;
	
	export type UriPath = string;
	
	export type PathUri = string;
	
	export type UriName = string;
	
	export type ModuleUri = string;
	
	export type SymbolUri = string;
	
	export type ArchiveId = string;
	
	export type ArchiveUri = string;
	
	export const UnknownDocument = "http://unknown.source?a=no/archive&d=unknown_document&l=en"
	
	export type DocumentUri = string;
	
	export type SimpleUriName = string;
	
	
	export class FloDown {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  /**
	   * Appends a syntactic block.
	   */
	  addElement(e: FloDownBlock): void;
	  /**
	   * Adds a new symbol declaration. Afterwards, `isModule()` is `true`.
	   * If successful (i.e. the given name is valid), will return the full URI of the
	   * new symbol; otherwise `null`.
	   */
	  addSymbolDeclaration(name: string): string | undefined;
	  /**
	   * Clears all content
	   */
	  clear(): void;
	  /**
	   * The [`DocumentUri`] of this block
	   */
	  getUri(): string;
	  /**
	   * Create a new [`FloDown`] block with the given [`DocumentUri`] (will panic if the uri
	   * is invalid).
	   */
	  static fromUri(uri: string): FloDown;
	  /**
	   * Return this block as an FTML source string
	   */
	  getFtml(): string;
	  /**
	   * Return this block as an sTeX source string
	   */
	  getStex(): string;
	  /**
	   * render this flodown block to the given node (will be inserted as last child)
	   */
	  mountTo(node: HTMLElement): void;
	  /**
	   * Create a new [`FloDown`] block in the given [`ArchiveUri`],
	   * path, name and language (will panic if any of the components are ivnalid).
	   */
	  static fromPath(archive: string, path: string | null | undefined, name: string, lang: Language): FloDown | undefined;
	  /**
	   * Whether this block contains/represents a *module*; true iff a new
	   * symbol is declared in this block
	   */
	  isModule(): boolean;
	}
	
	export enum HeadingLevel {
	  Section = 0,
	  SubSection = 1,
	  SubSubSection = 2,
	  Paragraph = 3,
	  SubParagraph = 4,
	}
	
	export enum HighlightStyle {
	  Colored = 0,
	  Subtle = 1,
	  Off = 2,
	  None = 3,
	}
	
	export class IntoUnderlyingByteSource {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  pull(controller: ReadableByteStreamController): Promise<any>;
	  start(controller: ReadableByteStreamController): void;
	  cancel(): void;
	  readonly autoAllocateChunkSize: number;
	  readonly type: ReadableStreamType;
	}
	
	export class IntoUnderlyingSink {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  abort(reason: any): Promise<any>;
	  close(): Promise<any>;
	  write(chunk: any): Promise<any>;
	}
	
	export class IntoUnderlyingSource {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  pull(controller: ReadableStreamDefaultController): Promise<any>;
	  cancel(): void;
	}
	
	/**
	 * Represents supported languages in [`DocumentUri`](crate::DocumentUri)s
	 *
	 * This enum provides a ist of supported languages, their Unicode flag representations and SVG flag icons.
	 */
	export enum Language {
	  /**
	   * English language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): en)
	   *
	   * Default language variant. Uses the United Kingdom flag representation.
	   */
	  English = 0,
	  /**
	   * German language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): de)
	   *
	   * Uses the Germany flag representation.
	   */
	  German = 1,
	  /**
	   * French language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): fr)
	   *
	   * Uses the France flag representation.
	   */
	  French = 2,
	  /**
	   * Romanian language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): ro)
	   *
	   * Uses the Romania flag representation.
	   */
	  Romanian = 3,
	  /**
	   * Arabic language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): ar)
	   *
	   * Uses the United Arab Emirates flag representation.
	   */
	  Arabic = 4,
	  /**
	   * Bulgarian language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): bg)
	   *
	   * Uses the Bulgaria flag representation.
	   */
	  Bulgarian = 5,
	  /**
	   * Russian language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): ru)
	   *
	   * Uses the Russia flag representation.
	   */
	  Russian = 6,
	  /**
	   * Finnish language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): fi)
	   *
	   * Uses the Finland flag representation.
	   */
	  Finnish = 7,
	  /**
	   * Turkish language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): tr)
	   *
	   * Uses the Turkey flag representation.
	   */
	  Turkish = 8,
	  /**
	   * Slovenian language ([ISO 639-1](https://en.wikipedia.org/wiki/ISO_639): sl)
	   *
	   * Uses the Slovenia flag representation.
	   */
	  Slovenian = 9,
	}
	
	export function clear_cache(): void;
	
	export function print_cache(): void;
	
	export function rdf_encode(s: string): string | undefined;
	
	export function run(): void;
	
	/**
	 * Globally set the URL of the FTML/FLAMS backend to use
	 */
	export function setBackendUrl(url: string): void;
	
}

declare type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

declare interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_flodown_free: (a: number, b: number) => void;
  readonly flodown_addElement: (a: number, b: number) => void;
  readonly flodown_addSymbolDeclaration: (a: number, b: number, c: number, d: number) => void;
  readonly flodown_clear: (a: number) => void;
  readonly flodown_fromPath: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly flodown_fromUri: (a: number, b: number) => number;
  readonly flodown_getFtml: (a: number, b: number) => void;
  readonly flodown_getStex: (a: number, b: number) => void;
  readonly flodown_getUri: (a: number, b: number) => void;
  readonly flodown_isModule: (a: number) => number;
  readonly flodown_mountTo: (a: number, b: number) => void;
  readonly setBackendUrl: (a: number, b: number) => void;
  readonly clear_cache: () => void;
  readonly print_cache: () => void;
  readonly run: () => void;
  readonly __wbg_intounderlyingbytesource_free: (a: number, b: number) => void;
  readonly __wbg_intounderlyingsink_free: (a: number, b: number) => void;
  readonly __wbg_intounderlyingsource_free: (a: number, b: number) => void;
  readonly intounderlyingbytesource_autoAllocateChunkSize: (a: number) => number;
  readonly intounderlyingbytesource_cancel: (a: number) => void;
  readonly intounderlyingbytesource_pull: (a: number, b: number) => number;
  readonly intounderlyingbytesource_start: (a: number, b: number) => void;
  readonly intounderlyingbytesource_type: (a: number) => number;
  readonly intounderlyingsink_abort: (a: number, b: number) => number;
  readonly intounderlyingsink_close: (a: number) => number;
  readonly intounderlyingsink_write: (a: number, b: number) => number;
  readonly intounderlyingsource_cancel: (a: number) => void;
  readonly intounderlyingsource_pull: (a: number, b: number) => number;
  readonly rdf_encode: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_26144: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_26139: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_27163: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_27145: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26143: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_15622: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_15187: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26384: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_26293: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_18646: (a: number, b: number, c: number) => number;
  readonly __wasm_bindgen_func_elem_17790: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26383: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_23387: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_22661: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_31153: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_export: (a: number, b: number) => number;
  readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_export3: (a: number) => void;
  readonly __wbindgen_export4: (a: number, b: number, c: number) => void;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_start: () => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
declare function wasm_bindgen (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
