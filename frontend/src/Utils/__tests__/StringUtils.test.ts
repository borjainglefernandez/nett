import capitalizeWords from "../StringUtils";

describe("capitalizeWords", () => {
  it("capitalizes every word in a sentence", () => {
    expect(capitalizeWords("hello world")).toBe("Hello World");
  });

  it("returns empty string when given falsy input", () => {
    expect(capitalizeWords("")).toBe("");
    // @ts-expect-error testing runtime guard
    expect(capitalizeWords(undefined)).toBe("");
  });
});
