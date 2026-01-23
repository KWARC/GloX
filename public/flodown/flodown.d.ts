declare namespace wasm_bindgen {
	/* tslint:disable */
	/* eslint-disable */
	/**
	 * The `ReadableStreamType` enum.
	 *
	 * *This API requires the following crate features to be activated: `ReadableStreamType`*
	 */
	
	type ReadableStreamType = "bytes";
	export type FloDownBlock = { type: "blockquote"; content: FloDownBlock[] } | { type: "paragraph"; content: Inline[] } | { type: "blockmath"; text: string } | { type: "blockcode"; language: string; text: string } | { type: "heading"; level: HeadingLevel; content: Inline[] } | { type: "numberedlist"; lines: FloDownBlock[][] } | { type: "bulletlist"; lines: FloDownBlock[][] } | { type: "definition"; for_symbols: SymbolUri[]; content: FloDownBlockInDefinition[] } | { type: "thematicbreak" };
	
	export type FloDownBlockInDefinition = { type: "blockquote"; content: FloDownBlockInDefinition[] } | { type: "paragraph"; content: InlineInDefinition[] } | { type: "blockmath"; text: string } | { type: "blockcode"; language: string; text: string } | { type: "heading"; level: HeadingLevel; content: InlineInDefinition[] } | { type: "numberedlist"; lines: FloDownBlockInDefinition[][] } | { type: "bulletlist"; lines: FloDownBlockInDefinition[][] } | { type: "thematicbreak" };
	
	export type Inline = string | FloDownInline;
	
	export type FloDownInline = { type: "math"; text: string } | { type: "code"; text: string } | { type: "bold"; content: Inline[] } | { type: "italic"; content: Inline[] } | { type: "highlight"; content: Inline[] } | { type: "strikethrough"; content: Inline[] } | { type: "superscript"; content: Inline[] } | { type: "subscript"; content: Inline[] } | { type: "symref"; uri: SymbolUri; content: Inline[] } | { type: "link"; url: string; content: Inline[] };
	
	export type FloDownInlineInDefinition = { type: "math"; text: string } | { type: "code"; text: string } | { type: "bold"; content: InlineInDefinition[] } | { type: "italic"; content: InlineInDefinition[] } | { type: "highlight"; content: InlineInDefinition[] } | { type: "strikethrough"; content: InlineInDefinition[] } | { type: "superscript"; content: InlineInDefinition[] } | { type: "subscript"; content: InlineInDefinition[] } | { type: "symref"; uri: SymbolUri; content: InlineInDefinition[] } | { type: "link"; url: string; content: InlineInDefinition[] } | { type: "definiendum"; uri: SymbolUri; content: Inline[] } | { type: "definiens"; uri: SymbolUri; content: Inline[] };
	
	export type InlineInDefinition = string | FloDownInlineInDefinition;
	
	export type LogLevel = "TRACE" | "DEBUG" | "INFO" | "WARN" | "ERROR";
	
	export interface FtmlViewerConfig extends FtmlConfig {
	    redirects?: [DocumentUri, string][];
	    backendUrl?: string | undefined;
	    logLevel?: LogLevel;
	}
	
	
	export interface FtmlConfig {
	    allowHovers?:boolean;
	    allowFullscreen?:boolean;
	    allowFormalInfo?:boolean;
	    allowNotationChanges?:boolean;
	    chooseHighlightStyle?:boolean;
	    showContent?:boolean;
	    pdfLink?:boolean;
	    documentUri?:DocumentUri;
	    highlightStyle?:HighlightStyle;
	    toc?:TocSource;
	    tocProgress?:TocProgress[];
	    autoexpandLimit?:LogicalLevel;
	    sectionWrap?:SectionWrap;
	    paragraphWrap?:ParagraphWrap;
	    slideWrap?:SlideWrap;
	    problemWrap?:ProblemWrap;
	    onSectionTitle?:OnSectionTitle;
	    problemStates?:ProblemStates;
	    onProblemResponse?:ProblemContinuation;
	}
	
	
	export type SectionWrap = (u:DocumentElementUri, lvl:SectionLevel) => (LeptosContinuation | undefined);
	
	export type ProblemWrap = (u:DocumentElementUri, sub_problem:boolean, autogradable:boolean) => (LeptosContinuation | undefined);
	
	export type SlideWrap = (u:DocumentElementUri) => (LeptosContinuation | undefined);
	
	export type OnSectionTitle = (u:DocumentElementUri, lvl:SectionLevel) => (LeptosContinuation | undefined);
	
	export type ParagraphWrap = (u:DocumentElementUri, kind:ParagraphKind) => (LeptosContinuation | undefined);
	
	
	export type ProblemContinuation = (r:ProblemResponse) => void;
	
	
	/**
	 * A section that has been \"covered\" at the specified timestamp; will be marked accordingly
	 * in the TOC.
	 */
	export interface TocProgress {
	    uri: DocumentElementUri;
	    timestamp?: Timestamp | undefined;
	}
	
	export type ProblemState = { type: "Interactive"; current_response?: ProblemResponse | undefined; solution?: SolutionData[] | undefined } | { type: "Finished"; current_response?: ProblemResponse | undefined } | { type: "Graded"; feedback: ProblemFeedbackJson };
	
	export type ProblemStates = Map<DocumentElementUri,ProblemState>;
	
	
	export type LeptosContinuation = (e:HTMLDivElement,o:LeptosContext) => void;
	
	
	export type LogicalLevel = { type: "None" } | ({ type: "Section" } & SectionLevel) | { type: "Paragraph" } | { type: "BeamerSlide" };
	
	export interface DocumentMeta {
	    uri: DocumentUri | undefined;
	    language: Language | undefined;
	}
	
	export type TocSource = "None" | "Extract" | { Ready: TocElem[] } | "Get";
	
	export interface TermContainer {
	    parsed: Term | undefined;
	    checked?: Term | undefined;
	    source?: SourceRange;
	}
	
	/**
	 * Either a variable or a symbol reference
	 */
	export type VarOrSym = { Sym: SymbolUri } | { Var: Variable };
	
	export interface SourcePos {
	    line: number;
	    col: number;
	}
	
	export interface SourceRange {
	    start: SourcePos;
	    end: SourcePos;
	}
	
	/**
	 * Wrapper for [`OrderedFloat`] for serialization reasons
	 */
	export type Float = number;
	
	export type Permutation = number[];
	
	export interface DocumentRange {
	    start: number;
	    end: number;
	}
	
	export interface DocDataRef {
	    start: number;
	    end: number;
	    in_doc: DocumentUri;
	}
	
	export interface DataRef {
	    start: number;
	    end: number;
	}
	
	/**
	 * The type of FTML expressions.
	 *
	 * Similarly to
	 * [<span style=\"font-variant:small-caps;\">OpenMath</span>](https://openmath.org),
	 * FTML expressions are foundation-independent, but more expressive by hardcoding
	 * [Theories-as-Types]()-like record \"types\".
	 */
	export type Term = { Symbol: { uri: SymbolUri; presentation: VarOrSym | undefined } } | { Var: { variable: Variable; presentation: VarOrSym | undefined } } | { Application: ApplicationTerm } | { Bound: BindingTerm } | { Field: RecordFieldTerm } | { Label: { name: UriName; df?: Term | undefined; tp?: Term | undefined } } | { Opaque: OpaqueTerm } | { Number: Numeric };
	
	export type Numeric = { Int: number } | { Float: Float };
	
	export type ApplicationTerm = Application;
	
	export interface Application {
	    head: Term;
	    arguments: Argument[];
	    presentation?: VarOrSym | undefined;
	}
	
	export type BindingTerm = Binding;
	
	export interface Binding {
	    head: Term;
	    arguments: BoundArgument[];
	    presentation?: VarOrSym | undefined;
	}
	
	export type RecordFieldTerm = RecordField;
	
	export interface RecordField {
	    record: Term;
	    key: UriName;
	    /**
	     * does not count as a subterm
	     */
	    record_type?: Term | undefined;
	    presentation?: VarOrSym | undefined;
	}
	
	export type OpaqueTerm = Opaque;
	
	export interface Opaque {
	    node: OpaqueNode;
	    terms?: Term[];
	}
	
	export type AnyOpaque = { Term: number } | { Node: OpaqueNode } | { Text: string };
	
	export interface OpaqueNode {
	    tag: Id;
	    attributes?: [Id, string][];
	    children?: AnyOpaque[];
	}
	
	export type Argument = { Simple: Term } | { Sequence: MaybeSequence<Term> };
	
	export type BoundArgument = { Simple: Term } | { Sequence: MaybeSequence<Term> } | { Bound: ComponentVar } | { BoundSeq: MaybeSequence<ComponentVar> };
	
	export interface ComponentVar {
	    var: Variable;
	    tp: Term | undefined;
	    df: Term | undefined;
	}
	
	export type MaybeSequence<T> = { One: T } | { Seq: T[] };
	
	export type ArgumentMode = "Simple" | "Sequence" | "BoundVariable" | "BoundVariableSequence";
	
	export type Variable = { Name: { name: Id; notated?: Id | undefined } } | { Ref: { declaration: DocumentElementUri; is_sequence?: boolean | undefined } };
	
	export type Css = { Link: string } | { Inline: string } | { Class: { name: string; css: string } };
	
	export type Timestamp = number;
	
	export type Regex = string;
	
	export type Declaration = { NestedModule: NestedModule } | { Import: { uri: ModuleUri; source?: SourceRange } } | { Symbol: Symbol } | { MathStructure: MathStructure } | { Morphism: Morphism } | { Extension: StructureExtension } | { Rule: { id: Id; parameters: Term[]; source?: SourceRange } };
	
	export interface ModuleData {
	    uri: ModuleUri;
	    meta_module?: ModuleUri | undefined;
	    signature?: Language | undefined;
	    declarations: Declaration[];
	    source?: SourceRange;
	}
	
	export interface NestedModule {
	    uri: SymbolUri;
	    declarations: Declaration[];
	    source?: SourceRange;
	}
	
	export type ParagraphOrProblemKind = { type: "Definition" } | { type: "Example" } | ({ type: "Problem" } & CognitiveDimension) | ({ type: "SubProblem" } & CognitiveDimension);
	
	export type SlideElement = { type: "Slide"; html: string; uri: DocumentElementUri } | { type: "Paragraph"; html: string; uri: DocumentElementUri } | { type: "Inputref"; uri: DocumentUri } | { type: "Section"; uri: DocumentElementUri; title?: string | undefined; children?: SlideElement[] };
	
	export type DocumentElement = { UseModule: { uri: ModuleUri; source?: SourceRange } } | { Module: { range: DocumentRange; module: ModuleUri; children?: DocumentElement[] } } | { MathStructure: { range: DocumentRange; structure: SymbolUri; children?: DocumentElement[] } } | { Extension: { range: DocumentRange; extension: SymbolUri; target: SymbolUri; children?: DocumentElement[] } } | { Morphism: { range: DocumentRange; morphism: SymbolUri; children?: DocumentElement[] } } | { SymbolDeclaration: SymbolUri } | { ImportModule: ModuleUri } | { Section: Section } | { SkipSection: DocumentElement[] } | { Paragraph: LogicalParagraph } | { Problem: Problem } | { Slide: Slide } | { DocumentReference: { uri: DocumentElementUri; target: DocumentUri; source?: SourceRange } } | { Notation: NotationReference } | { VariableDeclaration: VariableDeclaration } | { VariableNotation: VariableNotationReference } | { Definiendum: { range: DocumentRange; uri: SymbolUri; source?: SourceRange } } | { SymbolReference: { range: DocumentRange; uri: SymbolUri; notation?: Id | undefined; source?: SourceRange } } | { VariableReference: { range: DocumentRange; uri: DocumentElementUri; notation?: Id | undefined; source?: SourceRange } } | { Term: DocumentTerm };
	
	export interface DocumentTerm {
	    uri: DocumentElementUri;
	    term: TermContainer;
	}
	
	export interface DocumentData {
	    uri: DocumentUri;
	    title?: string | undefined;
	    elements?: DocumentElement[];
	    styles: DocumentStyles;
	    top_section_level: SectionLevel;
	    kind: DocumentKind;
	}
	
	export interface DocumentStyles {
	    counters: DocumentCounter[];
	    styles: DocumentStyle[];
	}
	
	export interface DocumentCounter {
	    name: Id;
	    parent: SectionLevel | undefined;
	}
	
	export interface DocumentStyle {
	    kind: ParagraphKind;
	    name: Id | undefined;
	    counter: Id | undefined;
	}
	
	export type DocumentKind = "Article" | "Fragment" | { Exam: { date: Timestamp; course: Id; retake: boolean; num: number; term: Id | undefined } } | { Homework: { date: Timestamp; course: Id; num: number; term: Id | undefined } } | { Quiz: { date: Timestamp; course: Id; num: number; term: Id | undefined } };
	
	/**
	 * An entry in a table of contents. Either:
	 * 1. a section; the title is assumed to be an HTML string, or
	 * 2. an inputref to some other document; the URI is the one for the
	 *    inputref itself; not the referenced Document. For the TOC,
	 *    which document is inputrefed is actually irrelevant.
	 */
	export type TocElem = { type: "Section"; title?: string | undefined; uri: DocumentElementUri; id: string; children?: TocElem[] } | { type: "SkippedSection"; children?: TocElem[] } | { type: "Inputref"; uri: DocumentUri; title?: string | undefined; id: string; children?: TocElem[] } | { type: "Paragraph"; styles?: Id[]; kind: ParagraphKind } | { type: "Slide" };
	
	export interface MathStructure {
	    uri: SymbolUri;
	    elements: StructureDeclaration[];
	    macroname?: Id | undefined;
	    source?: SourceRange;
	}
	
	export type StructureDeclaration = { type: "Import"; uri: ModuleUri; source?: SourceRange } | ({ type: "Symbol" } & Symbol) | ({ type: "Morphism" } & Morphism) | { type: "Rule"; id: Id; parameters: Term[]; source?: SourceRange };
	
	export interface StructureExtension {
	    uri: SymbolUri;
	    target: SymbolUri;
	    elements: StructureDeclaration[];
	    source?: SourceRange;
	}
	
	export interface Symbol {
	    uri: SymbolUri;
	    data: SymbolData;
	}
	
	export interface SymbolData {
	    arity: ArgumentSpec;
	    macroname?: Id | undefined;
	    role?: Id[];
	    tp?: TermContainer;
	    df?: TermContainer;
	    return_type?: Term | undefined;
	    argument_types?: Term[];
	    assoctype?: AssocType | undefined;
	    reordering?: Permutation | undefined;
	    source?: SourceRange;
	}
	
	export type AssocType = "LeftAssociativeBinary" | "RightAssociativeBinary" | "Conjunctive" | "PairwiseConjunctive" | "Prenex";
	
	export type ArgumentSpec = ArgumentMode[];
	
	export interface Morphism {
	    uri: SymbolUri;
	    domain: ModuleUri;
	    total: boolean;
	    elements: Assignment[];
	    source?: SourceRange;
	}
	
	export interface Assignment {
	    original: SymbolUri;
	    morphism: SymbolUri;
	    definiens?: Term | undefined;
	    refined_type?: Term | undefined;
	    new_name?: SimpleUriName | undefined;
	    macroname?: Id | undefined;
	    source?: SourceRange;
	}
	
	export interface LogicalParagraph {
	    kind: ParagraphKind;
	    uri: DocumentElementUri;
	    formatting: ParagraphFormatting;
	    range: DocumentRange;
	    title?: string | undefined;
	    styles?: Id[];
	    children?: DocumentElement[];
	    fors?: [SymbolUri, Term | undefined][];
	    source?: SourceRange;
	}
	
	export type ParagraphFormatting = "Block" | "Inline" | "Collapsed";
	
	export type ParagraphKind = "Definition" | "Assertion" | "Paragraph" | "Proof" | "SubProof" | "Example";
	
	export interface Problem {
	    uri: DocumentElementUri;
	    range: DocumentRange;
	    children?: DocumentElement[];
	    data: ProblemData;
	}
	
	export interface ProblemData {
	    sub_problem: boolean;
	    autogradable: boolean;
	    points: number | undefined;
	    minutes: number | undefined;
	    solutions: DataRef;
	    gnotes?: DataRef[];
	    hints?: DataRef[];
	    notes?: DataRef[];
	    title: string | undefined;
	    styles?: Id[];
	    preconditions?: [CognitiveDimension, SymbolUri][];
	    objectives?: [CognitiveDimension, SymbolUri][];
	    source?: SourceRange;
	}
	
	export interface GradingNote {
	    html: string;
	    answer_classes?: AnswerClass[];
	}
	
	export interface AnswerClass {
	    id: Id;
	    feedback: string;
	    kind: AnswerKind;
	    description: string;
	}
	
	export type AnswerKind = ({ type: "Class" } & number) | ({ type: "Trait" } & number);
	
	export type CognitiveDimension = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";
	
	export interface Section {
	    range: DocumentRange;
	    uri: DocumentElementUri;
	    title?: string | undefined;
	    children?: DocumentElement[];
	    source?: SourceRange;
	}
	
	export interface Slide {
	    range: DocumentRange;
	    uri: DocumentElementUri;
	    title?: string | undefined;
	    children?: DocumentElement[];
	    source?: SourceRange;
	}
	
	export type SectionLevel = { type: "Part" } | { type: "Chapter" } | { type: "Section" } | { type: "Subsection" } | { type: "Subsubsection" } | { type: "Paragraph" } | { type: "Subparagraph" };
	
	export interface NotationReference {
	    symbol: SymbolUri;
	    uri: DocumentElementUri;
	    notation: DataRef;
	    source?: SourceRange;
	}
	
	export interface VariableNotationReference {
	    variable: DocumentElementUri;
	    uri: DocumentElementUri;
	    notation: DataRef;
	    source?: SourceRange;
	}
	
	export interface Notation {
	    precedence: number;
	    id?: Id | undefined;
	    argprecs?: number[];
	    component: NotationComponent;
	    op?: NotationNode | undefined;
	}
	
	export type NotationComponent = { type: "Node"; tag: Id; attributes?: [Id, string][]; children?: NotationComponent[] } | { type: "Argument"; index: number; mode: ArgumentMode } | { type: "ArgSep"; index: number; mode: ArgumentMode; sep?: NotationComponent[] } | { type: "ArgMap"; index: number; segments?: NotationComponent[] } | ({ type: "MainComp" } & NotationNode) | ({ type: "Comp" } & NotationNode) | ({ type: "Text" } & string);
	
	export interface NotationNode {
	    tag: Id;
	    attributes?: [Id, string][];
	    children?: NodeOrText[];
	}
	
	export type NodeOrText = NotationNode | string;
	
	export interface VariableDeclaration {
	    uri: DocumentElementUri;
	    data: VariableData;
	}
	
	export interface VariableData {
	    arity: ArgumentSpec;
	    macroname?: Id | undefined;
	    role?: Id[];
	    tp?: TermContainer;
	    df?: TermContainer;
	    bind?: boolean;
	    assoctype?: AssocType | undefined;
	    reordering?: Permutation | undefined;
	    argument_types?: Term[];
	    return_type?: Term | undefined;
	    is_seq?: boolean;
	    source?: SourceRange;
	}
	
	export interface Quiz {
	    css?: Css[];
	    title?: string | undefined;
	    elements?: QuizElement[];
	    solutions?: [DocumentElementUri,string][];
	    answer_classes?: [DocumentElementUri,AnswerClass[]][];
	}
	
	export type QuizElement = { type: "Section"; title: string; elements?: QuizElement[] } | ({ type: "Problem" } & QuizProblem) | { type: "Paragraph"; html: string };
	
	export interface QuizProblem {
	    html: string;
	    title_html?: string | undefined;
	    uri: DocumentElementUri;
	    total_points?: number | undefined;
	    preconditions?: [CognitiveDimension, SymbolUri][];
	    objectives?: [CognitiveDimension, SymbolUri][];
	}
	
	export interface ProblemFeedbackJson {
	    correct: boolean;
	    solutions?: string[];
	    data?: CheckedResult[];
	    score_fraction: number;
	}
	
	export interface BlockFeedback {
	    is_correct: boolean;
	    verdict_str: string;
	    feedback: string;
	}
	
	export interface FillinFeedback {
	    is_correct: boolean;
	    feedback: string;
	    kind: FillinFeedbackKind;
	}
	
	export type FillinFeedbackKind = { Exact: string } | { NumRange: { from: number | undefined; to: number | undefined } } | { Regex: string };
	
	export type CheckedResult = { type: "SingleChoice"; selected?: number | undefined; choices?: BlockFeedback[] } | { type: "MultipleChoice"; selected?: boolean[]; choices?: BlockFeedback[] } | { type: "FillinSol"; matching?: number | undefined; text: string; options?: FillinFeedback[] };
	
	export interface ProblemResponse {
	    uri: DocumentElementUri;
	    responses?: ProblemResponseType[];
	}
	
	/**
	 * Either a list of booleans (multiple choice), a single integer (single choice),
	 * or a string (fill-in-the-gaps)
	 */
	export type ProblemResponseType = { type: "MultipleChoice"; value?: boolean[] } | { type: "SingleChoice"; value?: number | undefined } | { type: "Fillinsol"; value: string };
	
	export type SolutionData = { Solution: { html: string; answer_class?: Id | undefined } } | { ChoiceBlock: ChoiceBlock } | { FillInSol: FillInSol };
	
	export type ChoiceBlockStyle = "Block" | "Inline" | "Dropdown";
	
	export interface ChoiceBlock {
	    multiple: boolean;
	    block_style: ChoiceBlockStyle;
	    range: DocumentRange;
	    styles?: Id[];
	    choices?: Choice[];
	}
	
	export interface Choice {
	    correct: boolean;
	    verdict: string;
	    feedback: string;
	}
	
	export interface FillInSol {
	    width?: number | undefined;
	    opts?: FillInSolOption[];
	}
	
	export type FillInSolOption = { Exact: { value: string; verdict: boolean; feedback: string } } | { NumericalRange: { from?: number | undefined; to?: number | undefined; verdict: boolean; feedback: string } } | { Regex: { regex: Regex; verdict: boolean; feedback: string } };
	
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
	  /**
	   * Only clears all text blocks (leaves symbols intact)
	   */
	  clearText(): void;
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
	
	export class LeptosContext {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  wasm_clone(): LeptosContext;
	  /**
	   * Cleans up the reactive system.
	   */
	  cleanup(): void;
	}
	
	export class LeptosMountHandle {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  /**
	   * unmounts the view and cleans up the reactive system.
	   * Not calling this is a memory leak
	   */
	  unmount(): void;
	}
	
	export class ProblemFeedback {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  to_json(): ProblemFeedbackJson;
	  static from_json(arg0: ProblemFeedbackJson): ProblemFeedback;
	  to_jstring(): string | undefined;
	  static from_jstring(s: string): ProblemFeedback | undefined;
	  correct: boolean;
	  score_fraction: number;
	}
	
	export class Solutions {
	  private constructor();
	  free(): void;
	  [Symbol.dispose](): void;
	  to_jstring(): string | undefined;
	  static from_jstring(s: string): Solutions | undefined;
	  to_solutions(): SolutionData[];
	  check_response(response: ProblemResponse): ProblemFeedback | undefined;
	  static from_solutions(solutions: SolutionData[]): Solutions;
	  default_feedback(): ProblemFeedback;
	}
	
	export enum ThemeType {
	  Light = 0,
	  Dark = 1,
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
  readonly flodown_clearText: (a: number) => void;
  readonly flodown_fromPath: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => number;
  readonly flodown_fromUri: (a: number, b: number) => number;
  readonly flodown_getFtml: (a: number, b: number) => void;
  readonly flodown_getStex: (a: number, b: number) => void;
  readonly flodown_getUri: (a: number, b: number) => void;
  readonly flodown_isModule: (a: number) => number;
  readonly flodown_mountTo: (a: number, b: number) => void;
  readonly run: () => void;
  readonly setBackendUrl: (a: number, b: number) => void;
  readonly clear_cache: () => void;
  readonly print_cache: () => void;
  readonly __wbg_leptoscontext_free: (a: number, b: number) => void;
  readonly __wbg_leptosmounthandle_free: (a: number, b: number) => void;
  readonly leptoscontext_cleanup: (a: number, b: number) => void;
  readonly leptoscontext_wasm_clone: (a: number) => number;
  readonly leptosmounthandle_unmount: (a: number, b: number) => void;
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
  readonly __wbg_get_problemfeedback_correct: (a: number) => number;
  readonly __wbg_get_problemfeedback_score_fraction: (a: number) => number;
  readonly __wbg_problemfeedback_free: (a: number, b: number) => void;
  readonly __wbg_set_problemfeedback_correct: (a: number, b: number) => void;
  readonly __wbg_set_problemfeedback_score_fraction: (a: number, b: number) => void;
  readonly __wbg_solutions_free: (a: number, b: number) => void;
  readonly problemfeedback_from_json: (a: number) => number;
  readonly problemfeedback_from_jstring: (a: number, b: number) => number;
  readonly problemfeedback_to_json: (a: number) => number;
  readonly problemfeedback_to_jstring: (a: number, b: number) => void;
  readonly solutions_check_response: (a: number, b: number) => number;
  readonly solutions_default_feedback: (a: number) => number;
  readonly solutions_from_jstring: (a: number, b: number) => number;
  readonly solutions_from_solutions: (a: number, b: number) => number;
  readonly solutions_to_jstring: (a: number, b: number) => void;
  readonly solutions_to_solutions: (a: number, b: number) => void;
  readonly rdf_encode: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_19069: (a: number, b: number, c: number) => number;
  readonly __wasm_bindgen_func_elem_18213: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26369: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26365: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26611: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_26519: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_15977: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_15520: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26370: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_27386: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_27368: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_26610: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_24012: (a: number, b: number, c: number) => void;
  readonly __wasm_bindgen_func_elem_23349: (a: number, b: number) => void;
  readonly __wasm_bindgen_func_elem_32706: (a: number, b: number, c: number, d: number) => void;
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
