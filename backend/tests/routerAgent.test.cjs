const test = require("node:test");
const assert = require("node:assert/strict");
const { routerAgent } = require("../dist/agents/routerAgent.js");

test("routes order-related queries to ORDER agent", () => {
  const { agentType } = routerAgent.route("Where is my order TRK123456?");
  assert.equal(agentType, "ORDER");
});

test("routes billing-related queries to BILLING agent", () => {
  const { agentType } = routerAgent.route("What is the status of invoice INV-1001?");
  assert.equal(agentType, "BILLING");
});

test("defaults to SUPPORT for general queries", () => {
  const { agentType } = routerAgent.route("I need help with my account settings.");
  assert.equal(agentType, "SUPPORT");
});

