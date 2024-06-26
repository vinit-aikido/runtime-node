import * as t from "tap";
import { tryDecodeAsJWT } from "./tryDecodeAsJWT";

t.test("it returns undefined for empty string", async () => {
  t.same(tryDecodeAsJWT(""), { jwt: false });
});

t.test("it returns undefined for invalid JWT", async () => {
  t.same(tryDecodeAsJWT("invalid"), { jwt: false });
  t.same(tryDecodeAsJWT("invalid.invalid"), { jwt: false });
  t.same(tryDecodeAsJWT("invalid.invalid.invalid"), { jwt: false });
  t.same(tryDecodeAsJWT("invalid.invalid.invalid.invalid"), { jwt: false });
});

t.test("it returns the decoded JWT for valid JWT", async () => {
  t.same(
    tryDecodeAsJWT(
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOnsiJG5lIjpudWxsfSwiaWF0IjoxNTE2MjM5MDIyfQ._jhGJw9WzB6gHKPSozTFHDo9NOHs3CNOlvJ8rWy6VrQ"
    ),
    {
      jwt: true,
      object: {
        sub: "1234567890",
        username: {
          $ne: null,
        },
        iat: 1516239022,
      },
    }
  );
});

t.test(
  "it returns the decoded JWT for valid JWT with bearer prefix",
  async () => {
    t.same(
      tryDecodeAsJWT(
        "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwidXNlcm5hbWUiOnsiJG5lIjpudWxsfSwiaWF0IjoxNTE2MjM5MDIyfQ._jhGJw9WzB6gHKPSozTFHDo9NOHs3CNOlvJ8rWy6VrQ"
      ),
      {
        jwt: true,
        object: {
          sub: "1234567890",
          username: {
            $ne: null,
          },
          iat: 1516239022,
        },
      }
    );
  }
);
