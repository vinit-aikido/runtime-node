import * as t from "tap";
import { Agent } from "../agent/Agent";
import { setInstance } from "../agent/AgentSingleton";
import { APIForTesting } from "../agent/api/APIForTesting";
import { Token } from "../agent/api/Token";
import { runWithContext, type Context } from "../agent/Context";
import { applyHooks } from "../agent/applyHooks";
import { Hooks } from "../agent/hooks/Hooks";
import { LoggerNoop } from "../agent/logger/LoggerNoop";
import { Postgres } from "./Postgres";
import type { Client } from "pg";

const context: Context = {
  remoteAddress: "::1",
  method: "POST",
  url: "http://localhost:4000",
  query: {},
  headers: {},
  body: {
    myTitle: `-- should be blocked`,
  },
  cookies: {},
};

t.test("We can hijack Postgres class", async () => {
  const hooks = new Hooks();
  new Postgres().wrap(hooks);
  applyHooks(hooks);

  const agent = new Agent(
    true,
    new LoggerNoop(),
    new APIForTesting(),
    new Token("123"),
    false,
    {}
  );
  agent.start();
  setInstance(agent);

  const { Client } = require("pg");
  const client = new Client({
    user: "root",
    host: "127.0.0.1",
    database: "main_db",
    password: "password",
    port: 27016,
  });
  await client.connect();

  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS cats (
        petname varchar(255)
      );
    `);
    await client.query("TRUNCATE cats");
    t.same((await client.query("SELECT petname FROM cats;")).rows, []);

    // @ts-expect-error Private property
    t.same(agent.stats, {
      postgres: {
        blocked: 0,
        total: 3,
        allowed: 3,
        withoutContext: 3,
      },
    });

    const bulkError = await t.rejects(async () => {
      await runWithContext(context, () => {
        return client.query("-- should be blocked");
      });
    });
    if (bulkError instanceof Error) {
      t.equal(
        bulkError.message,
        "Aikido guard has blocked a SQL injection: -- should be blocked originating from body"
      );
    }

    setInstance(null); // We want to check if the code works when an Agent is not defined.
    await runWithContext(context, () => {
      // Normally this should be detected, but since the agent
      // is not defined we let it through.
      return client.query("-- should be blocked");
    });
    setInstance(agent); // Put the agent back for the following tests

    const undefinedQueryError = await t.rejects(async () => {
      await runWithContext(context, () => {
        return client.query(null);
      });
    });
    if (undefinedQueryError instanceof Error) {
      t.equal(
        undefinedQueryError.message,
        "Client was passed a null or undefined query"
      );
    }

    await runWithContext(
      {
        remoteAddress: "::1",
        method: "POST",
        url: "http://localhost:4000/",
        query: {},
        headers: {},
        body: {},
        cookies: {},
      },
      () => {
        return client.query("-- This is a comment");
      }
    );
  } catch (error: any) {
    t.fail(error);
  } finally {
    await client.end();
  }
});