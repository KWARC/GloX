# Module descriptions — engineering index

Non-binding orientation for the module description domain. Binding rules: PRD + SDDs below.

| Doc | Role |
| --- | --- |
| [`../../../prds/domains/module-descriptions.md`](../../../prds/domains/module-descriptions.md) | Binding PRD |
| [`workspace.md`](./workspace.md) | SDD — catalog, create, statement/definition semantics, reset, delete, index status |
| [`export.md`](./export.md) | SDD — module and definition TeX export |

**Code anchors:** `src/serverFns/moduleDescription.server.ts`, `src/server/modules/moduleCatalog.ts`,
`src/lib/moduleDescriptionTex.ts`, `src/routes/module-description/`, `src/routes/module-descriptions/`.

**Backfill status:** Draft SDDs; all Test mapping rows Gap. Shared FloDown mutations for module
definitions lack role/module scoping — see `workspace.md` Implementation bugs.
