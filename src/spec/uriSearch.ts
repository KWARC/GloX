import axios from "axios";
import { rdfEncodeUri } from "@flexiformal/ftml";



const MULTIPLE_URI_PARAM_REGEX = /[<](_multiuri_[a-zA-Z0-9-_]+)[>]/g;
const SINGLE_URI_PARAM_REGEX = /[<"](_uri_[a-zA-Z0-9-_]+)[>"]/g;
const DEFAULT_URI_PARAM_PREFIX = '_uri_param';

function encodeSpecialChars(value: string) {
  return value.replace(/ /g, '%20');
}

export function createUriParamMapping(parts: string[]) {
  return Object.fromEntries(
    parts.map((part, idx) => [
      `${DEFAULT_URI_PARAM_PREFIX}${idx}`,
      part,
    ])
  );
}

export function buildSearchUriQuery(parts: string[]): string {
  if (parts.length === 0)
    return `SELECT DISTINCT ?uri WHERE { ?uri ?r ?o. } LIMIT 60`;

  const filterConditions = parts
    .map(
      (_part, idx) =>
        `FILTER(CONTAINS(LCASE(STR(?uri)), LCASE("${DEFAULT_URI_PARAM_PREFIX}${idx}")))`
    )
    .join(".\n  ");

  return `
SELECT DISTINCT ?uri WHERE {
  ?uri ?r ?o. 
  ${filterConditions} 
} 
LIMIT 60`;
}

export async function getParameterizedQueryResults(
  parameterizedQuery: string,
  uriParams: Record<string, string | string[]> = {}
) {
  const query = createSafeFlamsQuery(parameterizedQuery, uriParams);

  const resp = await axios.post(
    `${process.env["NEXT_PUBLIC_FLAMS_URL"]}/api/backend/query`,
    new URLSearchParams({ query }),
    {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      validateStatus: () => true,
    }
  );

  return resp.data;
}

export function createSafeFlamsQuery(
  parameterizedQuery: string,
  uriParams: Record<string, string | string[]>,
  useRdfEncodeUri = false
) {
  let result = parameterizedQuery;
  const encodeUriFn = useRdfEncodeUri ? rdfEncodeUri : encodeSpecialChars;

  result = result.replace(MULTIPLE_URI_PARAM_REGEX, (match, paramName) => {
    const value = uriParams[paramName];
    if (!Array.isArray(value) || !value.length) return match;
    return value.map((uri) => `${match[0]}${encodeUriFn(uri)}${match.at(-1)}`).join(" ");
  });

  result = result.replace(SINGLE_URI_PARAM_REGEX, (match, paramName) => {
    const value = uriParams[paramName];
    if (typeof value !== "string") return match;
    return `${match[0]}${encodeUriFn(value)}${match.at(-1)}`;
  });

  return result;
}
