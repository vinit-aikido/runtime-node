import { isDeepStrictEqual } from "node:util";
import { isPlainObject } from "./isPlainObject";
import { Request } from "./RequestContext";

type DetectionResult =
  | { injection: true; source: "query" }
  | { injection: true; source: "body" }
  | { injection: true; source: "headers" }
  | { injection: false };

export function friendlyName(source: "query" | "body" | "headers"): string {
  switch (source) {
    case "query":
      return "query parameters";
    case "body":
      return "body";
    case "headers":
      return "headers";
  }
}

const COMPARISON_OPERATORS = [
  "$eq",
  "$gt",
  "$gte",
  "$in",
  "$lt",
  "$lte",
  "$ne",
  "$nin",
];

function findInjectionInObject(
  userControlledValue: unknown,
  filter: unknown
): boolean {
  if (!isPlainObject(userControlledValue) || !isPlainObject(filter)) {
    return false;
  }

  const fields = Object.keys(filter);
  for (const field of fields) {
    const value = filter[field];

    if (field === "$and" || field === "$or" || field === "$nor") {
      if (!Array.isArray(value)) {
        continue;
      }

      if (
        value.find((nested) =>
          findInjectionInObject(userControlledValue, nested)
        )
      ) {
        return true;
      }

      continue;
    }

    if (field === "$not") {
      if (findInjectionInObject(userControlledValue, value)) {
        return true;
      }

      continue;
    }

    if (
      isPlainObject(value) &&
      Object.keys(value).length === 1 &&
      COMPARISON_OPERATORS.includes(Object.keys(value)[0]) &&
      Object.keys(userControlledValue).find((key) =>
        isDeepStrictEqual(userControlledValue[key], value)
      )
    ) {
      return true;
    }
  }

  return false;
}

export function detectNoSQLInjection(
  request: Request,
  filter: unknown
): DetectionResult {
  if (findInjectionInObject(request.body, filter)) {
    return { injection: true, source: "body" };
  }

  if (findInjectionInObject(request.query, filter)) {
    return { injection: true, source: "query" };
  }

  if (findInjectionInObject(request.headers, filter)) {
    return { injection: true, source: "headers" };
  }

  return { injection: false };
}