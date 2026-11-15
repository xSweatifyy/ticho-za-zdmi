# Security Specification — Ticho za zdmi

## 1. Data Invariants
1. Default-deny catch-all rule (`match /{document=**}`) blocks all unspecified paths.
2. Only verified Google-authenticated users (`request.auth.token.email_verified == true`) may create stories, comments, ratings, or facility reports.
3. Only the designated administrator (`xsweatifyyy@gmail.com` with `email_verified == true` or listed in `/admins/{uid}`) may publish official editorial stories (`isOfficialEditorial: true`), edit any story, or delete any story/comment/report.
4. No PII (email, phone, real Google profile photo/name) is ever stored in public `stories`, `comments`, `storyRatings`, or `facilityReports` documents. Private author notes are isolated in `/stories/{storyId}/private/{contactId}` readable only by the author or admin.
5. Every string field has strict `.size()` bounds; every array has strict `.size()` and `.hasOnly(...)` allowlists; every timestamp enforces `request.time`.
6. Subcollections (`/comments`, `/private`) validate parent `/stories/{storyId}` existence via `exists(...)`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Write**: Create `/stories/s1` without `request.auth` -> `PERMISSION_DENIED`.
2. **Unverified Email Write**: Create `/stories/s1` with `email_verified: false` -> `PERMISSION_DENIED`.
3. **Spoofed Author UID**: Signed-in user A creates `/stories/s1` with `authorUid: "user_B"` -> `PERMISSION_DENIED`.
4. **Privilege Escalation (Official Editorial)**: Non-admin sets `isOfficialEditorial: true` on story create -> `PERMISSION_DENIED`.
5. **Shadow / Ghost Field Injection**: Payload adds `isAdmin: true` or `verifiedBadge: true` -> `PERMISSION_DENIED`.
6. **Non-Admin Story Update**: User A tries to update story belonging to another author -> `PERMISSION_DENIED`.
7. **Non-Admin Story Deletion**: User A tries to delete a story -> `PERMISSION_DENIED`.
8. **Admin Email Spoof (Unverified)**: Attacker with `email: "xsweatifyyy@gmail.com"` and `email_verified: false` -> `PERMISSION_DENIED`.
9. **Oversized Payload / Denial of Wallet**: `title` > 1024 chars or `id` > 128 chars or invalid regex -> `PERMISSION_DENIED`.
10. **Out-of-Range Rating**: `careRating: 99` or `careRating: 0` -> `PERMISSION_DENIED`.
11. **Orphaned Comment**: Create comment under nonexistent `storyId` -> `PERMISSION_DENIED`.
12. **PII Leak Attempt**: Non-admin non-author reads `/stories/{storyId}/private/{contactId}` -> `PERMISSION_DENIED`.
