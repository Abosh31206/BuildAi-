# BuildAI KZ Firestore Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Identity Isolation**: Users may only create or modify their own profile (`/users/{userId}`) and private PII (`/users/{userId}/private/{docId}`). Email PII never appears in public `/users/{userId}` documents.
2. **Project Ownership**: A building project (`/projects/{projectId}`) belongs strictly to `ownerId == request.auth.uid`. Non-owners cannot read, list, update, or delete another user's project.
3. **Immutable Ownership & Creation Timestamps**: `ownerId` and `createdAt` are immutable after creation; `createdAt == request.time` on create and `updatedAt == request.time` on create/update.
4. **Standards Library Governance**: Any verified signed-in engineer can read public `standards_documents` and their `pages` subcollection, and upload/create new normative documents owned by `ownerId == request.auth.uid`; only the document uploader or the bootstrapped admin (`abomyn06@gmail.com` with `email_verified == true` or `/admins/{uid}`) may update or delete a standard or its extracted pages.
5. **Path Hardening & Volumetric Bounds**: All document IDs (`userId`, `projectId`, `documentId`, `pageId`) match `^[a-zA-Z0-9_-]+$` and `size() <= 128`. All strings enforce strict upper bounds (`<= 50000` for page text, `<= 400` for titles).

## 2. Dirty Dozen Adversarial Payloads (Expected: PERMISSION_DENIED)
1. **Shadow Update**: Updating `/projects/{id}` with extra field `isVerified: true` -> denied by `affectedKeys().hasOnly(...)`.
2. **Self-Assigned Admin Role**: Creating `/users/{uid}` with `role: "admin"` -> denied by `isValidUserProfile` enum check (`role == 'engineer'`).
3. **Email Spoofing**: Writing `/standards_documents/{id}` as non-owner claiming admin email with `email_verified: false` -> denied by `email_verified == true` check.
4. **PII Leak Read**: Reading `/users/otherUid/private/info` as signed-in user `myUid` -> denied by `request.auth.uid == userId`.
5. **Blanket List Scraping**: Listing `/projects` without `where('ownerId', '==', auth.uid)` -> denied by `resource.data.ownerId == request.auth.uid`.
6. **ID Poisoning**: Creating `/projects/abc$invalid!123...` or 500-char ID -> denied by `isValidId(projectId)`.
7. **Ownership Hijack on Update**: Updating `/projects/{id}` changing `ownerId` -> denied by `incoming().ownerId == existing().ownerId`.
8. **Timestamp Forgery**: Creating `/projects/{id}` with client `createdAt` in the past -> denied by `incoming().createdAt == request.time`.
9. **Orphan Page Write**: Creating `/standards_documents/nonexistent/pages/p1` -> denied by parent `exists()` / `get()` Master Gate check.
10. **Payload Poisoning**: Sending 100KB string in `officialTitleRu` or `documentNumber` -> denied by `.size() <= 400` / `.size() <= 120`.
11. **Non-Owner Standard Delete**: Deleting another user's `/standards_documents/{id}` as regular user -> denied by `existing().ownerId == request.auth.uid || isAdmin()`.
12. **Unverified Write**: Attempting `create`/`update` when `request.auth.token.email_verified != true` -> denied by verified-user gate.
