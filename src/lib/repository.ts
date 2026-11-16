import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from 'firebase/firestore';
import { decryptText, encryptText } from '@/src/lib/crypto';
import { auth, db, handleFirestoreError, OperationType } from '@/src/lib/firebase';
import { generateSafeId } from '@/src/lib/utils';
import type {
  CountryCode,
  DeficiencyCategory,
  FacilityReport,
  FacilityType,
  Story,
  StoryComment,
  StoryRating,
  StorySubmission,
  StorySubmissionStatus,
} from '@/src/types/domain';

function toDate(val: unknown): Date | null {
  if (val instanceof Timestamp) return val.toDate();
  if (val instanceof Date) return val;
  return null;
}

function clampString(val: string, maxLen: number): string {
  return val.trim().slice(0, maxLen);
}

export interface CreateStoryInput {
  title: string;
  excerpt: string;
  content: string;
  facilityName: string;
  facilityType: FacilityType;
  country: CountryCode;
  city: string;
  placeId?: string;
  deficiencyCategories: DeficiencyCategory[];
  deficienciesSummary: string;
  isAnonymous: boolean;
  isOfficialEditorial: boolean;
  isVerified?: boolean;
  authorName?: string;
  authorAge?: string;
  initialCareRating: number;
  initialStaffRating: number;
  initialBuildingRating: number;
  initialAccessibilityRating: number;
  coverImage?: string;
  privateAdminNote?: string;
}

export function subscribeStories(
  onData: (stories: Story[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'stories';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const decryptedStories = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const raw = docSnap.data();
            const [title, excerpt, content, deficienciesSummary, authorName, authorAge] =
              await Promise.all([
                decryptText(raw.title),
                decryptText(raw.excerpt),
                decryptText(raw.content),
                decryptText(raw.deficienciesSummary),
                raw.authorName ? decryptText(raw.authorName) : Promise.resolve(''),
                raw.authorAge ? decryptText(raw.authorAge) : Promise.resolve(''),
              ]);

            return {
              id: docSnap.id,
              title,
              excerpt,
              content,
              facilityName: String(raw.facilityName || ''),
              facilityType: raw.facilityType as FacilityType,
              country: (raw.country === 'SK' ? 'SK' : 'CZ') as CountryCode,
              city: String(raw.city || ''),
              placeId: raw.placeId ? String(raw.placeId) : undefined,
              deficiencyCategories: Array.isArray(raw.deficiencyCategories)
                ? (raw.deficiencyCategories as DeficiencyCategory[])
                : [],
              deficienciesSummary,
              isAnonymous: Boolean(raw.isAnonymous),
              isOfficialEditorial: Boolean(raw.isOfficialEditorial),
              isVerified: Boolean(raw.isVerified),
              authorName: authorName || undefined,
              authorAge: authorAge || undefined,
              initialCareRating: Number(raw.initialCareRating ?? 0),
              initialStaffRating: Number(raw.initialStaffRating ?? 0),
              initialBuildingRating: Number(raw.initialBuildingRating ?? 0),
              initialAccessibilityRating: Number(raw.initialAccessibilityRating ?? 0),
              coverImage: raw.coverImage ? String(raw.coverImage) : undefined,
              isEncrypted: Boolean(raw.isEncrypted),
              authorUid: String(raw.authorUid || ''),
              createdAt: toDate(raw.createdAt),
              updatedAt: toDate(raw.updatedAt),
            } satisfies Story;
          })
        );
        onData(decryptedStories);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createStory(input: CreateStoryInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pro uložení příběhu je nutné přihlášení.');
  }

  const storyId = generateSafeId('story');
  const storyPath = `stories/${storyId}`;

  const [
    encTitle,
    encExcerpt,
    encContent,
    encDefSummary,
    encAuthorName,
    encAuthorAge,
  ] = await Promise.all([
    encryptText(clampString(input.title, 400)),
    encryptText(clampString(input.excerpt, 800)),
    encryptText(clampString(input.content, 20000)),
    encryptText(clampString(input.deficienciesSummary, 3500)),
    input.authorName?.trim() ? encryptText(clampString(input.authorName, 120)) : Promise.resolve(''),
    input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
  ]);

  const payload: Record<string, unknown> = {
    id: storyId,
    title: clampString(encTitle, 1024),
    excerpt: clampString(encExcerpt, 2048),
    content: clampString(encContent, 40000),
    facilityName: clampString(input.facilityName, 512),
    facilityType: input.facilityType,
    country: input.country,
    city: clampString(input.city, 256),
    deficiencyCategories: input.deficiencyCategories.slice(0, 8),
    deficienciesSummary: clampString(encDefSummary, 8192),
    isAnonymous: input.isAnonymous,
    isOfficialEditorial: input.isOfficialEditorial,
    isVerified: Boolean(input.isVerified),
    initialCareRating: Number(input.initialCareRating) || 0,
    initialStaffRating: Number(input.initialStaffRating) || 0,
    initialBuildingRating: Number(input.initialBuildingRating) || 0,
    initialAccessibilityRating: Number(input.initialAccessibilityRating) || 0,
    isEncrypted: true,
    authorUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.placeId?.trim()) {
    payload.placeId = clampString(input.placeId, 256);
  }
  if (encAuthorName) {
    payload.authorName = clampString(encAuthorName, 512);
  }
  if (encAuthorAge) {
    payload.authorAge = clampString(encAuthorAge, 256);
  }
  if (input.coverImage?.trim()) {
    payload.coverImage = clampString(input.coverImage, 512);
  }

  try {
    await setDoc(doc(db, 'stories', storyId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, storyPath);
  }

  if (input.privateAdminNote?.trim()) {
    const privatePath = `stories/${storyId}/private/contact`;
    try {
      const encPrivate = await encryptText(clampString(input.privateAdminNote, 3500));
      await setDoc(doc(db, 'stories', storyId, 'private', 'contact'), {
        storyId,
        authorUid: user.uid,
        encryptedNote: clampString(encPrivate, 8192),
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, privatePath);
    }
  }

  return storyId;
}

export async function updateStory(storyId: string, input: CreateStoryInput): Promise<void> {
  const storyPath = `stories/${storyId}`;
  const [
    encTitle,
    encExcerpt,
    encContent,
    encDefSummary,
    encAuthorName,
    encAuthorAge,
  ] = await Promise.all([
    encryptText(clampString(input.title, 400)),
    encryptText(clampString(input.excerpt, 800)),
    encryptText(clampString(input.content, 20000)),
    encryptText(clampString(input.deficienciesSummary, 3500)),
    input.authorName?.trim() ? encryptText(clampString(input.authorName, 120)) : Promise.resolve(''),
    input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
  ]);

  const updatePayload: Record<string, unknown> = {
    title: clampString(encTitle, 1024),
    excerpt: clampString(encExcerpt, 2048),
    content: clampString(encContent, 40000),
    facilityName: clampString(input.facilityName, 512),
    facilityType: input.facilityType,
    country: input.country,
    city: clampString(input.city, 256),
    deficiencyCategories: input.deficiencyCategories.slice(0, 8),
    deficienciesSummary: clampString(encDefSummary, 8192),
    isAnonymous: input.isAnonymous,
    isOfficialEditorial: input.isOfficialEditorial,
    isVerified: Boolean(input.isVerified),
    authorName: encAuthorName ? clampString(encAuthorName, 512) : '',
    authorAge: encAuthorAge ? clampString(encAuthorAge, 256) : '',
    initialCareRating: Number(input.initialCareRating) || 0,
    initialStaffRating: Number(input.initialStaffRating) || 0,
    initialBuildingRating: Number(input.initialBuildingRating) || 0,
    initialAccessibilityRating: Number(input.initialAccessibilityRating) || 0,
    placeId: input.placeId?.trim() ? clampString(input.placeId, 256) : '',
    coverImage: input.coverImage?.trim() ? clampString(input.coverImage, 512) : '',
    isEncrypted: true,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'stories', storyId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, storyPath);
  }
}

export async function setStoryVerified(storyId: string, isVerified: boolean): Promise<void> {
  const storyPath = `stories/${storyId}`;
  try {
    await updateDoc(doc(db, 'stories', storyId), {
      isVerified,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, storyPath);
  }
}

export async function deleteStory(storyId: string): Promise<void> {
  const storyPath = `stories/${storyId}`;
  try {
    await deleteDoc(doc(db, 'stories', storyId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, storyPath);
  }
}

async function mapSubmissionSnapshotDocs(
  docs: Array<{ id: string; data: () => Record<string, unknown> }>
): Promise<StorySubmission[]> {
  const asOptionalStr = (val: unknown): string | undefined =>
    typeof val === 'string' && val.length > 0 ? val : undefined;

  return Promise.all(
    docs.map(async (docSnap) => {
      const raw = docSnap.data();
      const [
        title,
        excerpt,
        content,
        deficienciesSummary,
        authorName,
        authorAge,
        privateAdminNote,
        reviewNote,
      ] = await Promise.all([
        decryptText(asOptionalStr(raw.title)),
        decryptText(asOptionalStr(raw.excerpt)),
        decryptText(asOptionalStr(raw.content)),
        decryptText(asOptionalStr(raw.deficienciesSummary)),
        asOptionalStr(raw.authorName)
          ? decryptText(asOptionalStr(raw.authorName))
          : Promise.resolve(''),
        asOptionalStr(raw.authorAge)
          ? decryptText(asOptionalStr(raw.authorAge))
          : Promise.resolve(''),
        asOptionalStr(raw.privateAdminNote)
          ? decryptText(asOptionalStr(raw.privateAdminNote))
          : Promise.resolve(''),
        asOptionalStr(raw.reviewNote)
          ? decryptText(asOptionalStr(raw.reviewNote))
          : Promise.resolve(''),
      ]);

      return {
        id: docSnap.id,
        title,
        excerpt,
        content,
        facilityName: String(raw.facilityName || ''),
        facilityType: raw.facilityType as FacilityType,
        country: (raw.country === 'SK' ? 'SK' : 'CZ') as CountryCode,
        city: String(raw.city || ''),
        placeId: raw.placeId ? String(raw.placeId) : undefined,
        deficiencyCategories: Array.isArray(raw.deficiencyCategories)
          ? (raw.deficiencyCategories as DeficiencyCategory[])
          : [],
        deficienciesSummary,
        isAnonymous: Boolean(raw.isAnonymous),
        authorName: authorName || undefined,
        authorAge: authorAge || undefined,
        initialCareRating: Number(raw.initialCareRating ?? 0),
        initialStaffRating: Number(raw.initialStaffRating ?? 0),
        initialBuildingRating: Number(raw.initialBuildingRating ?? 0),
        initialAccessibilityRating: Number(raw.initialAccessibilityRating ?? 0),
        coverImage: raw.coverImage ? String(raw.coverImage) : undefined,
        privateAdminNote: privateAdminNote || undefined,
        isEncrypted: Boolean(raw.isEncrypted),
        status: (raw.status === 'approved' || raw.status === 'rejected'
          ? raw.status
          : 'pending') as StorySubmissionStatus,
        reviewNote: reviewNote || undefined,
        publishedStoryId: raw.publishedStoryId ? String(raw.publishedStoryId) : undefined,
        authorUid: String(raw.authorUid || ''),
        createdAt: toDate(raw.createdAt),
        updatedAt: toDate(raw.updatedAt),
      } satisfies StorySubmission;
    })
  );
}

export function subscribeAllStorySubmissions(
  onData: (submissions: StorySubmission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'storySubmissions';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const items = await mapSubmissionSnapshotDocs(snapshot.docs);
        onData(items);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export function subscribeUserStorySubmissions(
  uid: string,
  onData: (submissions: StorySubmission[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'storySubmissions';
  const q = query(collection(db, path), where('authorUid', '==', uid));

  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const items = await mapSubmissionSnapshotDocs(snapshot.docs);
        items.sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
        onData(items);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createStorySubmission(input: CreateStoryInput): Promise<string> {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Pro odeslání příběhu ke schválení je nutné přihlášení.');
  }

  const submissionId = generateSafeId('sub');
  const submissionPath = `storySubmissions/${submissionId}`;

  const [
    encTitle,
    encExcerpt,
    encContent,
    encDefSummary,
    encAuthorName,
    encAuthorAge,
    encPrivateNote,
  ] = await Promise.all([
    encryptText(clampString(input.title, 400)),
    encryptText(clampString(input.excerpt, 800)),
    encryptText(clampString(input.content, 20000)),
    encryptText(clampString(input.deficienciesSummary, 3500)),
    input.authorName?.trim() ? encryptText(clampString(input.authorName, 120)) : Promise.resolve(''),
    input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
    input.privateAdminNote?.trim()
      ? encryptText(clampString(input.privateAdminNote, 3500))
      : Promise.resolve(''),
  ]);

  const payload: Record<string, unknown> = {
    id: submissionId,
    title: clampString(encTitle, 1024),
    excerpt: clampString(encExcerpt, 2048),
    content: clampString(encContent, 40000),
    facilityName: clampString(input.facilityName, 512),
    facilityType: input.facilityType,
    country: input.country,
    city: clampString(input.city, 256),
    deficiencyCategories: input.deficiencyCategories.slice(0, 8),
    deficienciesSummary: clampString(encDefSummary, 8192),
    isAnonymous: input.isAnonymous,
    initialCareRating: Number(input.initialCareRating) || 0,
    initialStaffRating: Number(input.initialStaffRating) || 0,
    initialBuildingRating: Number(input.initialBuildingRating) || 0,
    initialAccessibilityRating: Number(input.initialAccessibilityRating) || 0,
    isEncrypted: true,
    status: 'pending',
    authorUid: user.uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  if (input.placeId?.trim()) payload.placeId = clampString(input.placeId, 256);
  if (encAuthorName) payload.authorName = clampString(encAuthorName, 512);
  if (encAuthorAge) payload.authorAge = clampString(encAuthorAge, 256);
  if (input.coverImage?.trim()) payload.coverImage = clampString(input.coverImage, 512);
  if (encPrivateNote) payload.privateAdminNote = clampString(encPrivateNote, 8192);

  try {
    await setDoc(doc(db, 'storySubmissions', submissionId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, submissionPath);
  }

  return submissionId;
}

export async function updateStorySubmission(
  submissionId: string,
  input: CreateStoryInput
): Promise<void> {
  const submissionPath = `storySubmissions/${submissionId}`;
  const [encTitle, encExcerpt, encContent, encDefSummary, encAuthorName, encAuthorAge] =
    await Promise.all([
      encryptText(clampString(input.title, 400)),
      encryptText(clampString(input.excerpt, 800)),
      encryptText(clampString(input.content, 20000)),
      encryptText(clampString(input.deficienciesSummary, 3500)),
      input.authorName?.trim()
        ? encryptText(clampString(input.authorName, 120))
        : Promise.resolve(''),
      input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
    ]);

  const updatePayload: Record<string, unknown> = {
    title: clampString(encTitle, 1024),
    excerpt: clampString(encExcerpt, 2048),
    content: clampString(encContent, 40000),
    facilityName: clampString(input.facilityName, 512),
    facilityType: input.facilityType,
    country: input.country,
    city: clampString(input.city, 256),
    placeId: input.placeId?.trim() ? clampString(input.placeId, 256) : '',
    deficiencyCategories: input.deficiencyCategories.slice(0, 8),
    deficienciesSummary: clampString(encDefSummary, 8192),
    isAnonymous: input.isAnonymous,
    authorName: encAuthorName ? clampString(encAuthorName, 512) : '',
    authorAge: encAuthorAge ? clampString(encAuthorAge, 256) : '',
    initialCareRating: Number(input.initialCareRating) || 0,
    initialStaffRating: Number(input.initialStaffRating) || 0,
    initialBuildingRating: Number(input.initialBuildingRating) || 0,
    initialAccessibilityRating: Number(input.initialAccessibilityRating) || 0,
    coverImage: input.coverImage?.trim() ? clampString(input.coverImage, 512) : '',
    isEncrypted: true,
    updatedAt: serverTimestamp(),
  };

  try {
    await updateDoc(doc(db, 'storySubmissions', submissionId), updatePayload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, submissionPath);
  }
}

export async function approveAndPublishSubmission(
  submissionId: string,
  input: CreateStoryInput
): Promise<string> {
  const storyId = await createStory({
    ...input,
    privateAdminNote: undefined,
  });

  const submissionPath = `storySubmissions/${submissionId}`;
  const [encTitle, encExcerpt, encContent, encDefSummary, encAuthorName, encAuthorAge] =
    await Promise.all([
      encryptText(clampString(input.title, 400)),
      encryptText(clampString(input.excerpt, 800)),
      encryptText(clampString(input.content, 20000)),
      encryptText(clampString(input.deficienciesSummary, 3500)),
      input.authorName?.trim()
        ? encryptText(clampString(input.authorName, 120))
        : Promise.resolve(''),
      input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
    ]);

  try {
    await updateDoc(doc(db, 'storySubmissions', submissionId), {
      title: clampString(encTitle, 1024),
      excerpt: clampString(encExcerpt, 2048),
      content: clampString(encContent, 40000),
      facilityName: clampString(input.facilityName, 512),
      facilityType: input.facilityType,
      country: input.country,
      city: clampString(input.city, 256),
      placeId: input.placeId?.trim() ? clampString(input.placeId, 256) : '',
      deficiencyCategories: input.deficiencyCategories.slice(0, 8),
      deficienciesSummary: clampString(encDefSummary, 8192),
      isAnonymous: input.isAnonymous,
      authorName: encAuthorName ? clampString(encAuthorName, 512) : '',
      authorAge: encAuthorAge ? clampString(encAuthorAge, 256) : '',
      initialCareRating: Number(input.initialCareRating) || 0,
      initialStaffRating: Number(input.initialStaffRating) || 0,
      initialBuildingRating: Number(input.initialBuildingRating) || 0,
      initialAccessibilityRating: Number(input.initialAccessibilityRating) || 0,
      coverImage: input.coverImage?.trim() ? clampString(input.coverImage, 512) : '',
      status: 'approved',
      publishedStoryId: storyId,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, submissionPath);
  }

  return storyId;
}

export async function rejectStorySubmission(
  submissionId: string,
  reviewNote?: string
): Promise<void> {
  const submissionPath = `storySubmissions/${submissionId}`;
  const encReviewNote = reviewNote?.trim()
    ? await encryptText(clampString(reviewNote, 900))
    : '';
  const payload: Record<string, unknown> = {
    status: 'rejected',
    updatedAt: serverTimestamp(),
  };
  if (encReviewNote) {
    payload.reviewNote = clampString(encReviewNote, 2048);
  }

  try {
    await updateDoc(doc(db, 'storySubmissions', submissionId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, submissionPath);
  }
}

export async function deleteStorySubmission(submissionId: string): Promise<void> {
  const submissionPath = `storySubmissions/${submissionId}`;
  try {
    await deleteDoc(doc(db, 'storySubmissions', submissionId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, submissionPath);
  }
}

export function subscribeStoryComments(
  storyId: string,
  onData: (comments: StoryComment[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `stories/${storyId}/comments`;
  const q = query(collection(db, 'stories', storyId, 'comments'), orderBy('createdAt', 'asc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const items = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const raw = docSnap.data();
            const [body, authorNickname, authorAge] = await Promise.all([
              decryptText(raw.body),
              raw.authorNickname ? decryptText(raw.authorNickname) : Promise.resolve(''),
              raw.authorAge ? decryptText(raw.authorAge) : Promise.resolve(''),
            ]);
            return {
              id: docSnap.id,
              storyId: String(raw.storyId || storyId),
              body,
              authorNickname: authorNickname || undefined,
              authorAge: authorAge || undefined,
              isAnonymous: Boolean(raw.isAnonymous),
              isEncrypted: Boolean(raw.isEncrypted),
              authorUid: String(raw.authorUid || ''),
              createdAt: toDate(raw.createdAt),
            } satisfies StoryComment;
          })
        );
        onData(items);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createComment(input: {
  storyId: string;
  body: string;
  authorNickname?: string;
  authorAge?: string;
  isAnonymous: boolean;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Pro přidání komentáře se prosím přihlaste.');

  const commentId = generateSafeId('cmt');
  const path = `stories/${input.storyId}/comments/${commentId}`;

  const [encBody, encNickname, encAge] = await Promise.all([
    encryptText(clampString(input.body, 3500)),
    input.authorNickname?.trim()
      ? encryptText(clampString(input.authorNickname, 120))
      : Promise.resolve(''),
    input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
  ]);

  const payload: Record<string, unknown> = {
    id: commentId,
    storyId: input.storyId,
    body: clampString(encBody, 8192),
    isAnonymous: input.isAnonymous,
    isEncrypted: true,
    authorUid: user.uid,
    createdAt: serverTimestamp(),
  };

  if (encNickname) payload.authorNickname = clampString(encNickname, 512);
  if (encAge) payload.authorAge = clampString(encAge, 256);

  try {
    await setDoc(doc(db, 'stories', input.storyId, 'comments', commentId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return commentId;
}

export async function deleteComment(storyId: string, commentId: string): Promise<void> {
  const path = `stories/${storyId}/comments/${commentId}`;
  try {
    await deleteDoc(doc(db, 'stories', storyId, 'comments', commentId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export function subscribeStoryRatings(
  onData: (ratings: StoryRating[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'storyRatings';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items = snapshot.docs.map((docSnap) => {
        const raw = docSnap.data();
        return {
          id: docSnap.id,
          storyId: String(raw.storyId || ''),
          raterUid: String(raw.raterUid || ''),
          careRating: Number(raw.careRating || 0),
          staffRating: Number(raw.staffRating || 0),
          buildingRating: Number(raw.buildingRating || 0),
          accessibilityRating: Number(raw.accessibilityRating || 0),
          createdAt: toDate(raw.createdAt),
          updatedAt: toDate(raw.updatedAt),
        } satisfies StoryRating;
      });
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function upsertStoryRating(input: {
  storyId: string;
  careRating: number;
  staffRating: number;
  buildingRating: number;
  accessibilityRating: number;
  existingRating?: StoryRating;
}): Promise<void> {
  const user = auth.currentUser;
  if (!user) throw new Error('Pro hodnocení příběhu se prosím přihlaste.');

  const ratingId = `${input.storyId}_${user.uid}`;
  const path = `storyRatings/${ratingId}`;

  try {
    if (input.existingRating) {
      await updateDoc(doc(db, 'storyRatings', ratingId), {
        careRating: input.careRating,
        staffRating: input.staffRating,
        buildingRating: input.buildingRating,
        accessibilityRating: input.accessibilityRating,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'storyRatings', ratingId), {
        id: ratingId,
        storyId: input.storyId,
        raterUid: user.uid,
        careRating: input.careRating,
        staffRating: input.staffRating,
        buildingRating: input.buildingRating,
        accessibilityRating: input.accessibilityRating,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      input.existingRating ? OperationType.UPDATE : OperationType.CREATE,
      path
    );
  }
}

export function subscribeFacilityReports(
  onData: (reports: FacilityReport[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'facilityReports';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const items = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const raw = docSnap.data();
            const [note, authorNickname, authorAge] = await Promise.all([
              decryptText(raw.note),
              raw.authorNickname ? decryptText(raw.authorNickname) : Promise.resolve(''),
              raw.authorAge ? decryptText(raw.authorAge) : Promise.resolve(''),
            ]);
            return {
              id: docSnap.id,
              placeId: String(raw.placeId || ''),
              facilityName: String(raw.facilityName || ''),
              facilityAddress: raw.facilityAddress ? String(raw.facilityAddress) : undefined,
              facilityType: raw.facilityType as FacilityType,
              country: (raw.country === 'SK' ? 'SK' : 'CZ') as CountryCode,
              lat: Number(raw.lat || 0),
              lng: Number(raw.lng || 0),
              careRating: Number(raw.careRating || 0),
              staffRating: Number(raw.staffRating || 0),
              buildingRating: Number(raw.buildingRating || 0),
              accessibilityRating: Number(raw.accessibilityRating || 0),
              deficiencies: Array.isArray(raw.deficiencies)
                ? (raw.deficiencies as DeficiencyCategory[])
                : [],
              note,
              authorNickname: authorNickname || undefined,
              authorAge: authorAge || undefined,
              isAnonymous: Boolean(raw.isAnonymous),
              isEncrypted: Boolean(raw.isEncrypted),
              authorUid: String(raw.authorUid || ''),
              createdAt: toDate(raw.createdAt),
            } satisfies FacilityReport;
          })
        );
        onData(items);
      } catch (err) {
        if (onError) onError(err instanceof Error ? err : new Error(String(err)));
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError) onError(wrapped as Error);
      }
    }
  );
}

export async function createFacilityReport(input: {
  placeId: string;
  facilityName: string;
  facilityAddress?: string;
  facilityType: FacilityType;
  country: CountryCode;
  lat: number;
  lng: number;
  careRating: number;
  staffRating: number;
  buildingRating: number;
  accessibilityRating: number;
  deficiencies: DeficiencyCategory[];
  note: string;
  authorNickname?: string;
  authorAge?: string;
  isAnonymous: boolean;
}): Promise<string> {
  const user = auth.currentUser;
  if (!user) throw new Error('Pro přidání hodnocení zařízení se prosím přihlaste.');

  const reportId = generateSafeId('rep');
  const path = `facilityReports/${reportId}`;

  const [encNote, encNickname, encAge] = await Promise.all([
    encryptText(clampString(input.note, 3500)),
    input.authorNickname?.trim()
      ? encryptText(clampString(input.authorNickname, 120))
      : Promise.resolve(''),
    input.authorAge?.trim() ? encryptText(clampString(input.authorAge, 32)) : Promise.resolve(''),
  ]);

  const payload: Record<string, unknown> = {
    id: reportId,
    placeId: clampString(input.placeId, 256),
    facilityName: clampString(input.facilityName, 512),
    facilityType: input.facilityType,
    country: input.country,
    lat: input.lat,
    lng: input.lng,
    careRating: input.careRating,
    staffRating: input.staffRating,
    buildingRating: input.buildingRating,
    accessibilityRating: input.accessibilityRating,
    deficiencies: input.deficiencies.slice(0, 8),
    note: clampString(encNote, 8192),
    isAnonymous: input.isAnonymous,
    isEncrypted: true,
    authorUid: user.uid,
    createdAt: serverTimestamp(),
  };

  if (input.facilityAddress?.trim()) {
    payload.facilityAddress = clampString(input.facilityAddress, 512);
  }
  if (encNickname) payload.authorNickname = clampString(encNickname, 512);
  if (encAge) payload.authorAge = clampString(encAge, 256);

  try {
    await setDoc(doc(db, 'facilityReports', reportId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return reportId;
}

export async function deleteFacilityReport(reportId: string): Promise<void> {
  const path = `facilityReports/${reportId}`;
  try {
    await deleteDoc(doc(db, 'facilityReports', reportId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
