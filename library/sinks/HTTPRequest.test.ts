import * as t from "tap";
import { Agent } from "../agent/Agent";
import { APIForTesting } from "../agent/api/APIForTesting";
import { Token } from "../agent/api/Token";
import { Context, runWithContext } from "../agent/Context";
import { LoggerNoop } from "../agent/logger/LoggerNoop";
import { HTTPRequest } from "./HTTPRequest";

const context: Context = {
  remoteAddress: "::1",
  method: "POST",
  url: "http://localhost:4000",
  query: {},
  headers: {},
  body: {},
  cookies: {},
  source: "express",
};

t.test("it works", async (t) => {
  const agent = new Agent(
    true,
    new LoggerNoop(),
    new APIForTesting(),
    new Token("123"),
    undefined
  );
  agent.start([new HTTPRequest()]);

  t.same(agent.getHostnames().asArray(), []);

  const http = require("http");

  runWithContext(context, () => {
    const google = http.request("http://aikido.dev");
    google.end();
  });

  t.same(agent.getHostnames().asArray(), [
    { hostname: "aikido.dev", port: 80 },
  ]);
  agent.getHostnames().clear();

  const https = require("https");

  runWithContext(context, () => {
    const google = https.request("https://aikido.dev");
    google.end();
  });
  t.same(agent.getHostnames().asArray(), [
    { hostname: "aikido.dev", port: 443 },
  ]);
  agent.getHostnames().clear();

  const google = https.request(new URL("https://aikido.dev"));
  google.end();
  t.same(agent.getHostnames().asArray(), [
    { hostname: "aikido.dev", port: 443 },
  ]);
  agent.getHostnames().clear();

  const google2 = https.request({ hostname: "aikido.dev" });
  google2.end();
  t.same(agent.getHostnames().asArray(), [
    { hostname: "aikido.dev", port: undefined },
  ]);
  agent.getHostnames().clear();

  const withPort = https.request({ hostname: "aikido.dev", port: 443 });
  withPort.end();
  t.same(agent.getHostnames().asArray(), [
    { hostname: "aikido.dev", port: 443 },
  ]);
  agent.getHostnames().clear();

  const another = https.request({ hostname: "aikido.dev", port: "443" });
  another.end();
  t.same(agent.getHostnames().asArray(), [
    { hostname: "aikido.dev", port: undefined },
  ]);
  agent.getHostnames().clear();

  t.throws(() => https.request(""));
  t.throws(() => https.request("invalid url"));
  t.same(agent.getHostnames().asArray(), []);
  agent.getHostnames().clear();
});
