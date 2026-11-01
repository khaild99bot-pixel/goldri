# GOLDRIX Firestore Security Specification

## 1. Authentication & Roles
- **Standard Authenticated Users (`isAuthenticated()`)**: Must be signed in via Firebase Authentication (`request.auth != null`).
- **Chief Administrator (`isAdmin()`)**:
  - Verified by checking `/users/$(request.auth.uid).data.role == 'ADMIN'` OR the bootstrapped Chief Admin email (`request.auth.token.email == "hha253ee@gmail.com" && request.auth.token.email_verified == true`).

## 2. Collection Access Control & Data Validation

### `/users/{userId}` (`UserProfile`)
- **Read (`get`, `list`)**: Allowed only if the requester is the document owner (`request.auth.uid == userId`) or an Admin (`isAdmin()`). No public reads.
- **Create (`create`)**: Allowed if `isAuthenticated()`, `request.auth.uid == userId`, valid schema (`isValidUserProfile`), and either `request.resource.data.role == 'USER'` or `isAdmin()`.
- **Update (`update`)**: Allowed if `isAuthenticated()`, `request.auth.uid == userId`, valid schema (`isValidUserProfile`), `uid` is immutable, and `role` cannot be escalated unless `isAdmin()`.
- **Delete (`delete`)**: Allowed only for `isAdmin()`.

### `/email_logs/{emailId}` (`EmailLog`)
- **Read (`get`, `list`)**: Allowed if `isAuthenticated()` and (`resource.data.uid == request.auth.uid` or `isAdmin()`).
- **Create (`create`)**: Allowed if `isAuthenticated()`, `request.resource.data.uid == request.auth.uid`, and valid schema (`isValidEmailLog`).
- **Update (`update`)**: Disallowed for standard users (immutable audit log); allowed only for `isAdmin()` with valid schema.
- **Delete (`delete`)**: Allowed only for `isAdmin()`.

### `/cloud_backups/{userId}` (`CloudAccountBackup`)
- **Read (`get`, `list`)**: Allowed if `isOwner(userId)` or `isAdmin()`.
- **Create (`create`)**: Allowed if `isOwner(userId)` and valid schema (`isValidCloudBackup`).
- **Update (`update`)**: Allowed if `isOwner(userId)`, `uid` is immutable, and valid schema (`isValidCloudBackup`).
- **Delete (`delete`)**: Allowed only for `isAdmin()`.
