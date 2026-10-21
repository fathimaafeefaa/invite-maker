import { describe, expect, it } from "vitest";
import { csvCell, toCsv } from "../csv";

describe("csvCell", () => {
  it("leaves plain values alone", () => {
    expect(csvCell("Asha")).toBe("Asha");
    expect(csvCell(3)).toBe("3");
    expect(csvCell(null)).toBe("");
  });

  it("quotes commas, quotes and newlines", () => {
    expect(csvCell("a,b")).toBe('"a,b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("line1\nline2")).toBe('"line1\nline2"');
  });

  it("neutralises spreadsheet formulas", () => {
    expect(csvCell("=HYPERLINK(\"http://evil\")")).toBe('"\'=HYPERLINK(""http://evil"")"');
    for (const v of ["+1+1", "-2", "@SUM(A1)"]) expect(csvCell(v).startsWith("'")).toBe(true);
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF", () => {
    expect(toCsv([["a", "b"], ["c", "d"]])).toBe("a,b\r\nc,d\r\n");
  });
});
