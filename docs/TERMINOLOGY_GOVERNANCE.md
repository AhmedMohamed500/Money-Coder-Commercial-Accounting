# Arabic / English Financial Terminology Governance

`src/i18n/terminology/registry.ts` is the central UI terminology registry. The demo exposes three display modes: bilingual, Arabic and English.

Each term contains a stable key, Arabic label, English label, optional abbreviation, context, review status and last internal review date. Components should reference term keys instead of creating local accounting translations.

Rules:

1. Do not treat an internal review date as an external-standard certification.
2. Add a source reference only after an authorized accounting reviewer validates it.
3. Preserve a stable key when wording changes.
4. Use tooltips for abbreviations or ambiguous terms.
5. Test RTL and LTR presentation separately.
6. Financial statement titles should use policy-approved terminology before production release.
