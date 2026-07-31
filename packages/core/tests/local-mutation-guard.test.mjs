import test from "node:test";
import assert from "node:assert/strict";

import { rejectUntrustedLocalMutationRequest } from "../engine/runtime/local-mutation-guard.mjs";

test("local request guard allows loopback reads and trusted mutations", () => {
  const read = responseRecorder();
  assert.equal(rejectUntrustedLocalMutationRequest(request("GET", "::1"), read), false);

  const mutation = responseRecorder();
  assert.equal(rejectUntrustedLocalMutationRequest(
    request("PUT", "127.0.0.1", {
      host: "127.0.0.1:5173",
      origin: "http://127.0.0.1:5173",
      "x-openpress-local-request": "1",
    }),
    mutation,
  ), false);
});

test("local request guard rejects LAN reads and mutations", () => {
  for (const method of ["GET", "PUT"]) {
    const res = responseRecorder();
    assert.equal(rejectUntrustedLocalMutationRequest(
      request(method, "192.168.1.42", {
        host: "192.168.1.10:5173",
        origin: "http://192.168.1.10:5173",
        "x-openpress-local-request": "1",
      }),
      res,
    ), true);
    assert.equal(res.statusCode, 403);
  }
});

function request(method, remoteAddress, headers = {}) {
  return {
    method,
    headers,
    socket: { remoteAddress },
  };
}

function responseRecorder() {
  return {
    statusCode: 0,
    writeHead(statusCode) {
      this.statusCode = statusCode;
    },
    end() {},
  };
}
