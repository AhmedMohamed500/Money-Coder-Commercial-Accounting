import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";

const cookieState = vi.hoisted(() => {
  const jar = new Map<string, string>();
  return { jar, store: { get(name:string){const value=jar.get(name);return value?{name,value}:undefined;},set(name:string,value:string){jar.set(name,value);},delete(name:string){jar.delete(name);} } };
});
vi.mock("next/headers", () => ({ cookies: async () => cookieState.store }));

import { db } from "@/lib/db";
import { sha256 } from "@/lib/security";
import { createDocumentUploadTicket, verifyDocumentUploadTicket } from "@/lib/document-upload";
import { configureTestStorageFailure, getStorageAdapter, resetTestStorage, testStorageHas } from "@/lib/storage";
import { POST as beginUpload } from "@/app/api/organizations/[id]/documents/uploads/route";
import { DELETE as cancelUpload } from "@/app/api/organizations/[id]/documents/uploads/route";
import { PUT as receiveUpload } from "@/app/api/private-storage/uploads/route";
import { POST as finalizeUpload } from "@/app/api/organizations/[id]/documents/route";
import { DELETE as deleteDocument, GET as downloadDocument } from "@/app/api/documents/[documentId]/route";

const enabled = process.env.RUN_DB_TESTS === "1";
const marker = randomUUID();
const ids: { users:string[];organizations:string[] } = { users:[],organizations:[] };
let ownerA = "";
let ownerB = "";
let suspendedUser = "";
let companyA = "";
let companyB = "";

const pdf = Buffer.from("%PDF-1.7\nfictional integration test\n%%EOF");
const png = Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),Buffer.from("fictional-IEND")]);
const jpeg = Buffer.from([0xff,0xd8,0xff,0x00,0x01,0x02,0xff,0xd9]);

function xlsxArchive() {
  const entries=["[Content_Types].xml","_rels/.rels","xl/workbook.xml","xl/_rels/workbook.xml.rels"];
  const prefix=Buffer.from([0x50,0x4b,0x03,0x04]);
  const central=Buffer.concat(entries.map(name=>{const encoded=Buffer.from(name);const record=Buffer.alloc(46+encoded.length);record.writeUInt32LE(0x02014b50,0);record.writeUInt16LE(encoded.length,28);encoded.copy(record,46);return record;}));
  const end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(entries.length,8);end.writeUInt16LE(entries.length,10);end.writeUInt32LE(central.length,12);end.writeUInt32LE(prefix.length,16);
  return Buffer.concat([prefix,central,end]);
}

async function loginAs(userId:string) {
  const token=`storage-${randomUUID()}`;
  await db.session.create({data:{userId,tokenHash:sha256(token),expiresAt:new Date(Date.now()+60_000)}});
  cookieState.jar.set("money_coder_session",token);
}

function jsonRequest(url:string,method:string,body:unknown) {
  return new Request(url,{method,headers:{"content-type":"application/json","x-forwarded-for":randomUUID()},body:JSON.stringify(body)});
}

async function initUpload(organizationId:string,name:string,mimeType:string,bytes:Buffer,kind="LEGAL_DOCUMENT") {
  const response=await beginUpload(jsonRequest(`http://local.test/api/organizations/${organizationId}/documents/uploads`,"POST",{title:`Test ${name}`,kind,originalName:name,mimeType,sizeBytes:bytes.length}),{params:Promise.resolve({id:organizationId})});
  const body=await response.json() as {token:string;upload:{url:string;method:"PUT";headers:Record<string,string>};error?:string};
  return {response,body};
}

async function putUpload(init:{token:string;upload:{url:string;method:"PUT";headers:Record<string,string>}},bytes:Buffer) {
  return receiveUpload(new Request(`http://local.test${init.upload.url}`,{method:"PUT",headers:init.upload.headers,body:new Uint8Array(bytes)}));
}

async function complete(organizationId:string,token:string) {
  return finalizeUpload(jsonRequest(`http://local.test/api/organizations/${organizationId}/documents`,"POST",{token}),{params:Promise.resolve({id:organizationId})});
}

async function upload(organizationId:string,name:string,mimeType:string,bytes:Buffer,kind="LEGAL_DOCUMENT") {
  const started=await initUpload(organizationId,name,mimeType,bytes,kind);
  expect(started.response.status).toBe(200);
  expect((await putUpload(started.body,bytes)).status).toBe(204);
  const finalized=await complete(organizationId,started.body.token);
  const document=await finalized.json() as {id:string;error?:string};
  expect(finalized.status,document.error).toBe(201);
  return {document,token:started.body.token,payload:verifyDocumentUploadTicket(started.body.token).payload};
}

describe.skipIf(!enabled)("private document storage lifecycle", () => {
  beforeAll(async()=>{
    await db.$connect();resetTestStorage();
    const a=await db.user.create({data:{email:`storage-a-${marker}@test.local`,displayName:"Storage Owner A",passwordHash:"test",emailVerifiedAt:new Date()}});
    const b=await db.user.create({data:{email:`storage-b-${marker}@test.local`,displayName:"Storage Owner B",passwordHash:"test",emailVerifiedAt:new Date()}});
    const suspended=await db.user.create({data:{email:`storage-s-${marker}@test.local`,displayName:"Suspended",passwordHash:"test",emailVerifiedAt:new Date()}});
    ownerA=a.id;ownerB=b.id;suspendedUser=suspended.id;ids.users.push(a.id,b.id,suspended.id);
    const orgA=await db.organization.create({data:{type:"COMMERCIAL_COMPANY",legalName:"Storage Company A",tradeName:"Untouched Trade Name",createdById:a.id,memberships:{create:[{userId:a.id,role:"COMPANY_OWNER"},{userId:suspended.id,role:"COMPANY_MANAGER",status:"SUSPENDED"}]}}});
    const orgB=await db.organization.create({data:{type:"COMMERCIAL_COMPANY",legalName:"Storage Company B",createdById:b.id,memberships:{create:{userId:b.id,role:"COMPANY_OWNER"}}}});
    companyA=orgA.id;companyB=orgB.id;ids.organizations.push(orgA.id,orgB.id);
  });
  beforeEach(()=>{configureTestStorageFailure({unavailable:false,failDelete:false,failPromote:false});cookieState.jar.clear();});
  afterAll(async()=>{cookieState.jar.clear();resetTestStorage();await db.organization.deleteMany({where:{id:{in:ids.organizations}}});await db.user.deleteMany({where:{id:{in:ids.users}}});await db.$disconnect();});

  it.each([
    ["authorized PDF","sample.pdf","application/pdf",pdf],
    ["authorized PNG","sample.png","image/png",png],
    ["authorized JPEG","sample.jpg","image/jpeg",jpeg],
    ["authorized XLSX","sample.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",xlsxArchive()],
  ])("stores, lists, and securely downloads %s",async(_label,name,mime,bytes)=>{await loginAs(ownerA);const created=await upload(companyA,name,mime,bytes);const response=await downloadDocument(new Request(`http://local.test/api/documents/${created.document.id}`),{params:Promise.resolve({documentId:created.document.id})});expect(response.status).toBe(200);expect(Buffer.from(await response.arrayBuffer())).toEqual(bytes);expect(response.headers.get("cache-control")).toContain("no-store");expect(response.headers.get("x-content-type-options")).toBe("nosniff");});

  it("rejects a missing session and cross-company upload",async()=>{let started=await initUpload(companyA,"sample.pdf","application/pdf",pdf);expect(started.response.status).toBe(403);await loginAs(ownerA);started=await initUpload(companyB,"sample.pdf","application/pdf",pdf);expect(started.response.status).toBe(403);});

  it("rejects suspended membership",async()=>{await loginAs(suspendedUser);expect((await initUpload(companyA,"sample.pdf","application/pdf",pdf)).response.status).toBe(403);});

  it("blocks cross-company download and deletion",async()=>{await loginAs(ownerB);const created=await upload(companyB,"private.pdf","application/pdf",pdf);await loginAs(ownerA);expect((await downloadDocument(new Request(`http://local.test/api/documents/${created.document.id}`),{params:Promise.resolve({documentId:created.document.id})})).status).toBe(404);expect((await deleteDocument(new Request(`http://local.test/api/documents/${created.document.id}`,{method:"DELETE"}),{params:Promise.resolve({documentId:created.document.id})})).status).toBe(404);expect(testStorageHas(created.payload.finalKey)).toBe(true);});

  it("expires authorization and cleans the pending object",async()=>{await loginAs(ownerA);const created=createDocumentUploadTicket({organizationId:companyA,userId:ownerA,originalName:"expired.pdf",mimeType:"application/pdf",sizeBytes:pdf.length,kind:"LEGAL_DOCUMENT",title:"Expired",now:1,ttlSeconds:60});const metadata={organizationId:companyA,uploadedById:ownerA,uploadId:created.payload.jti,declaredMime:created.payload.mimeType,declaredSize:String(pdf.length)};await getStorageAdapter().putObject(created.payload.pendingKey,pdf,created.payload.mimeType,metadata);expect((await complete(companyA,created.token)).status).toBe(410);expect(testStorageHas(created.payload.pendingKey)).toBe(false);});

  it("rejects replayed finalization",async()=>{await loginAs(ownerA);const created=await upload(companyA,"replay.pdf","application/pdf",pdf);expect((await complete(companyA,created.token)).status).toBe(409);expect(await db.fileAsset.count({where:{storageKey:created.payload.finalKey}})).toBe(1);});

  it("cleans a disguised upload after server validation",async()=>{await loginAs(ownerA);const fake=Buffer.from("MZ disguised executable %%EOF");const started=await initUpload(companyA,"fake.pdf","application/pdf",fake);expect(started.response.status).toBe(200);expect((await putUpload(started.body,fake)).status).toBe(204);const payload=verifyDocumentUploadTicket(started.body.token).payload;expect((await complete(companyA,started.body.token)).status).toBe(400);expect(testStorageHas(payload.pendingKey)).toBe(false);expect(testStorageHas(payload.finalKey)).toBe(false);});

  it("removes both objects when the database write fails after promotion",async()=>{await loginAs(ownerA);const started=await initUpload(companyA,"db-failure.pdf","application/pdf",pdf);expect((await putUpload(started.body,pdf)).status).toBe(204);const payload=verifyDocumentUploadTicket(started.body.token).payload;const spy=vi.spyOn(db,"$transaction").mockRejectedValueOnce(new Error("fictional db failure"));const response=await complete(companyA,started.body.token);spy.mockRestore();expect(response.status).toBe(500);expect(testStorageHas(payload.pendingKey)).toBe(false);expect(testStorageHas(payload.finalKey)).toBe(false);});

  it("returns a safe failure for a missing stored object",async()=>{await loginAs(ownerA);const asset=await db.fileAsset.create({data:{organizationId:companyA,uploadedById:ownerA,kind:"OTHER",originalName:"missing.pdf",storageKey:`organizations/${companyA}/${randomUUID()}`,mimeType:"application/pdf",sizeBytes:pdf.length,sha256:"missing",storageProvider:"test-memory"}});const document=await db.companyDocument.create({data:{organizationId:companyA,fileAssetId:asset.id,category:"OTHER",title:"Missing"}});const response=await downloadDocument(new Request(`http://local.test/api/documents/${document.id}`),{params:Promise.resolve({documentId:document.id})});expect(response.status).toBe(503);expect(JSON.stringify(await response.json())).not.toContain(process.env.AUTH_SECRET);});

  it("reports provider outage without leaking secrets",async()=>{await loginAs(ownerA);configureTestStorageFailure({unavailable:true});const started=await initUpload(companyA,"outage.pdf","application/pdf",pdf);expect(started.response.status).toBe(503);const body=JSON.stringify(started.body);expect(body).not.toContain(process.env.AUTH_SECRET);expect(body).not.toContain("AWS_");});

  it("soft-deletes, physically deletes, and safely repeats deletion",async()=>{await loginAs(ownerA);const created=await upload(companyA,"delete.pdf","application/pdf",pdf);const request=()=>new Request(`http://local.test/api/documents/${created.document.id}`,{method:"DELETE"});expect((await deleteDocument(request(),{params:Promise.resolve({documentId:created.document.id})})).status).toBe(200);expect(testStorageHas(created.payload.finalKey)).toBe(false);expect((await deleteDocument(request(),{params:Promise.resolve({documentId:created.document.id})})).status).toBe(200);expect((await db.companyDocument.findUniqueOrThrow({where:{id:created.document.id}})).deletedAt).not.toBeNull();});

  it("retains retry state when physical deletion fails",async()=>{await loginAs(ownerA);const created=await upload(companyA,"retry-delete.pdf","application/pdf",pdf);configureTestStorageFailure({failDelete:true});const response=await deleteDocument(new Request(`http://local.test/api/documents/${created.document.id}`,{method:"DELETE"}),{params:Promise.resolve({documentId:created.document.id})});expect(response.status).toBe(503);expect((await response.json()).physicalDeletionPending).toBe(true);expect((await db.companyDocument.findUniqueOrThrow({where:{id:created.document.id}})).deletedAt).not.toBeNull();configureTestStorageFailure({failDelete:false});expect((await deleteDocument(new Request(`http://local.test/api/documents/${created.document.id}`,{method:"DELETE"}),{params:Promise.resolve({documentId:created.document.id})})).status).toBe(200);});

  it("does not expose public object access or alter unrelated company data",async()=>{await loginAs(ownerA);const created=await upload(companyA,"isolated.pdf","application/pdf",pdf);expect(await getStorageAdapter().createDownloadUrl(created.payload.finalKey,"isolated.pdf","application/pdf",60)).toBeNull();const direct=await receiveUpload(new Request("http://local.test/api/private-storage/uploads",{method:"PUT",headers:{"content-type":"application/pdf"},body:new Uint8Array(pdf)}));expect(direct.status).toBe(400);expect((await db.organization.findUniqueOrThrow({where:{id:companyA}})).tradeName).toBe("Untouched Trade Name");});

  it("allows cancellation only for the issuing tenant",async()=>{await loginAs(ownerA);const started=await initUpload(companyA,"cancel.pdf","application/pdf",pdf);expect((await putUpload(started.body,pdf)).status).toBe(204);const payload=verifyDocumentUploadTicket(started.body.token).payload;await loginAs(ownerB);expect((await cancelUpload(jsonRequest(`http://local.test/api/organizations/${companyA}/documents/uploads`,"DELETE",{token:started.body.token}),{params:Promise.resolve({id:companyA})})).status).toBe(403);expect(testStorageHas(payload.pendingKey)).toBe(true);await loginAs(ownerA);expect((await cancelUpload(jsonRequest(`http://local.test/api/organizations/${companyA}/documents/uploads`,"DELETE",{token:started.body.token}),{params:Promise.resolve({id:companyA})})).status).toBe(200);expect(testStorageHas(payload.pendingKey)).toBe(false);});
});
