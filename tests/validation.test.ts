import { signupSchema, loginSchema, createLoanSchema } from "@/lib/validation";

describe("validation", () => {
  test("signup rejects empty payload", () => {
    expect(() => signupSchema.parse({})).toThrow();
  });

  test("signup accepts valid payload and normalizes email", () => {
    const result = signupSchema.parse({
      name: "Alex",
      email: "ALEX@example.com",
      password: "secret123",
    });
    expect(result.email).toBe("alex@example.com");
  });

  test("login accepts valid payload", () => {
    const result = loginSchema.parse({
      email: "alex@example.com",
      password: "secret",
    });
    expect(result.email).toBe("alex@example.com");
  });

  test("createLoanSchema rejects empty itemId", () => {
    expect(() => createLoanSchema.parse({})).toThrow();
  });
});
