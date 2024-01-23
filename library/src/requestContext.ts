import { AsyncLocalStorage } from "node:async_hooks";

type RequestContext = {
  method: string;
};

const requestContext = new AsyncLocalStorage<RequestContext>();

export function getContext() {
  return requestContext.getStore();
}

export function runWithContext<T>(context: RequestContext, fn: () => T) {
  return requestContext.run(context, fn);
}