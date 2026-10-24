import { describe, expect, it } from "vitest";
import { createDocumentUploadTicket, verifyDocumentUploadTicket } from "@/lib/document-upload";
import { normalizeOriginalFilename, validateDeclaredDocument, validateStoredDocument, validateUpload } from "@/lib/document-files";

process.env.AUTH_SECRET = "unit-test-upload-ticket-secret-with-32-characters";

function xlsxArchive(entries = ["[Content_Types].xml", "_rels/.rels", "xl/workbook.xml", "xl/_rels/workbook.xml.rels"]) {
  const prefix = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
  const records = entries.map(name => {
    const encoded = Buffer.from(name);
    const record = Buffer.alloc(46 + encoded.length);
    record.writeUInt32LE(0x02014b50, 0);
    record.writeUInt16LE(encoded.length, 28);
    encoded.copy(record, 46);
    return record;
  });
  const central = Buffer.concat(records);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(central.length, 12);
  end.writeUInt32LE(prefix.length, 16);
  return Buffer.concat([prefix, central, end]);
}

describe("upload content validation", () => {
  it("accepts a PDF signature", async () => {
    const file = new File([Buffer.from("%PDF-1.7 safe test\n%%EOF")], "test.pdf", { type: "application/pdf" });
    await expect(validateUpload(file)).resolves.toBeInstanceOf(Buffer);
  });
  it("rejects an executable renamed to PDF", async () => {
    const file = new File([Buffer.from("MZ not a pdf")], "fake.pdf", { type: "application/pdf" });
    await expect(validateUpload(file)).rejects.toThrow("لا يطابق");
  });
  it("accepts PNG and JPEG signatures", () => {
    expect(validateStoredDocument(Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from("IEND")]), "image/png", "chart.png").sha256).toHaveLength(64);
    expect(validateStoredDocument(Buffer.from([0xff,0xd8,0xff,0x00,0xff,0xd9]), "image/jpeg", "scan.jpeg").mimeType).toBe("image/jpeg");
  });
  it("accepts a structurally identified XLSX archive", () => {
    expect(validateStoredDocument(xlsxArchive(), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "ledger.xlsx").sha256).toHaveLength(64);
  });
  it("rejects a generic ZIP renamed to XLSX", () => {
    expect(() => validateStoredDocument(xlsxArchive(["notes.txt"]), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "ledger.xlsx")).toThrow("ليس مصنف XLSX");
  });
  it("rejects mismatched extensions, empty files, and oversize declarations", () => {
    expect(() => validateDeclaredDocument({ originalName:"bad.jpg",mimeType:"application/pdf",sizeBytes:20 })).toThrow("امتداد");
    expect(() => validateDeclaredDocument({ originalName:"empty.pdf",mimeType:"application/pdf",sizeBytes:0 })).toThrow("حجم");
    expect(() => validateDeclaredDocument({ originalName:"large.pdf",mimeType:"application/pdf",sizeBytes:11_000_000 })).toThrow("حجم");
  });
  it("normalizes path components and rejects unsafe names", () => {
    expect(normalizeOriginalFilename("C:\\fakepath\\invoice.pdf")).toBe("invoice.pdf");
    expect(() => normalizeOriginalFilename("..\\..")).toThrow("اسم الملف");
  });
});

describe("short-lived upload authorization", () => {
  const input = { organizationId:"11111111-1111-4111-8111-111111111111",userId:"22222222-2222-4222-8222-222222222222",originalName:"invoice.pdf",mimeType:"application/pdf" as const,sizeBytes:25,kind:"LEGAL_DOCUMENT" as const,title:"Invoice" };
  it("round-trips an intact scoped ticket", () => {
    const created = createDocumentUploadTicket({ ...input, now:100, ttlSeconds:60 });
    expect(verifyDocumentUploadTicket(created.token,{now:120}).payload.organizationId).toBe(input.organizationId);
  });
  it("rejects a modified ticket", () => {
    const created = createDocumentUploadTicket({ ...input, now:100, ttlSeconds:60 });
    expect(() => verifyDocumentUploadTicket(`${created.token.slice(0,-1)}x`,{now:120})).toThrow("غير صالح");
  });
  it("rejects expiry unless cleanup explicitly allows it", () => {
    const created = createDocumentUploadTicket({ ...input, now:100, ttlSeconds:60 });
    expect(() => verifyDocumentUploadTicket(created.token,{now:160})).toThrow("انتهت");
    expect(verifyDocumentUploadTicket(created.token,{now:160,allowExpired:true}).expired).toBe(true);
  });
});
