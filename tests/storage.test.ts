import { describe, expect, it } from "vitest";
import { validateUpload } from "@/lib/storage";

describe("upload content validation", () => {
  it("accepts a PDF signature", async () => {
    const file = new File([Buffer.from("%PDF-1.7 safe test")], "test.pdf", { type: "application/pdf" });
    await expect(validateUpload(file)).resolves.toBeInstanceOf(Buffer);
  });
  it("rejects an executable renamed to PDF", async () => {
    const file = new File([Buffer.from("MZ not a pdf")], "fake.pdf", { type: "application/pdf" });
    await expect(validateUpload(file)).rejects.toThrow("لا يطابق");
  });
});
