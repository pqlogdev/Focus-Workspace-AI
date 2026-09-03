import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  getDocs,
  writeBatch,
  serverTimestamp,
  deleteDoc,
  query,
  orderBy,
  updateDoc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  WorkspaceConfig,
  Task,
  StickyNote,
  FocusLog,
  Streak,
  Template,
  TemplateMember,
  CustomImageRecord,
  CustomAudioRecord,
  RollbackSnapshot,
} from './types';
import { PRESET_TEMPLATES } from './data/presetTemplates';

// Operation Types for error diagnosis
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): void {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
    },
    operationType,
    path,
  };
  console.warn('Firestore Operation Error:', JSON.stringify(errInfo));
}

// Initialize Firebase Application
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Initialize Cloud Firestore
export const db = firebaseConfig.firestoreDatabaseId
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Helper to deeply strip undefined values so Firestore never throws unsupported field value: undefined
export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === undefined || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj
      .filter((item) => item !== undefined)
      .map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof obj === 'object') {
    const res: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        res[key] = sanitizeForFirestore(val);
      }
    }
    return res as T;
  }
  return obj;
}

// Connection test helper
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'system', 'connection_test'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.info('Firestore client running offline / local fallback');
    }
    return false;
  }
}
testFirestoreConnection().catch(() => {});

/**
 * Sign in with Google using popup
 */
export async function signInWithGoogle(): Promise<User | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      await recordUserLogin(result.user);
    }
    return result.user;
  } catch (error: any) {
    console.warn('Google popup sign-in failed or closed:', error);
    throw error;
  }
}

/**
 * Sign out of Firebase Authentication
 */
export async function signOut(): Promise<void> {
  try {
    await fbSignOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw error;
  }
}

/**
 * Record user profile in Firestore on login
 */
async function recordUserLogin(user: User): Promise<void> {
  try {
    const userRef = doc(db, 'users', user.uid);
    await setDoc(
      userRef,
      {
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName || 'Focus Explorer',
        photoURL: user.photoURL || '',
        lastLoginAt: new Date().toISOString(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.warn('Failed to record user login in Firestore:', error);
  }
}

/**
 * Save user workspace settings to Firestore
 */
export async function saveUserWorkspace(userId: string, config: WorkspaceConfig): Promise<void> {
  try {
    const configRef = doc(db, 'users', userId, 'workspace', 'config');
    await setDoc(configRef, {
      ...config,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.warn('Failed to save user workspace to Firestore:', error);
  }
}

/**
 * Load user workspace settings from Firestore
 */
export async function loadUserWorkspace(userId: string): Promise<WorkspaceConfig | null> {
  try {
    const configRef = doc(db, 'users', userId, 'workspace', 'config');
    const snap = await getDoc(configRef);
    if (snap.exists()) {
      return snap.data() as WorkspaceConfig;
    }
    return null;
  } catch (error) {
    console.warn('Failed to load user workspace from Firestore:', error);
    return null;
  }
}

/**
 * Save all user workspace data (notes, tasks, notepad, streak, logs, custom images, rollback snapshots)
 */
export async function saveUserDataToCloud(
  userId: string,
  data: {
    config?: WorkspaceConfig;
    tasks?: Task[];
    stickyNotes?: StickyNote[];
    notepad?: string;
    logs?: FocusLog[];
    streak?: Streak;
    customImages?: CustomImageRecord[];
    customAudio?: CustomAudioRecord[];
    rollbackSnapshot?: RollbackSnapshot | null;
  }
): Promise<void> {
  if (!userId || userId === 'guest' || userId === 'anonymous') return;

  try {
    const batch = writeBatch(db);
    const nowIso = new Date().toISOString();

    if (data.config) {
      const configRef = doc(db, 'users', userId, 'workspace', 'config');
      batch.set(configRef, sanitizeForFirestore({ ...data.config, updatedAt: nowIso }), { merge: true });
    }

    if (data.notepad !== undefined) {
      const notepadRef = doc(db, 'users', userId, 'notepad', 'current');
      batch.set(notepadRef, { content: data.notepad, updatedAt: nowIso }, { merge: true });
    }

    if (data.streak) {
      const streakRef = doc(db, 'users', userId, 'streak', 'current');
      batch.set(streakRef, sanitizeForFirestore({ ...data.streak, updatedAt: nowIso }), { merge: true });
    }

    if (data.tasks) {
      const tasksRef = doc(db, 'users', userId, 'tasks', 'all');
      batch.set(tasksRef, { items: sanitizeForFirestore(data.tasks), updatedAt: nowIso }, { merge: true });
    }

    if (data.stickyNotes) {
      const notesRef = doc(db, 'users', userId, 'stickyNotes', 'all');
      batch.set(notesRef, { items: sanitizeForFirestore(data.stickyNotes), updatedAt: nowIso }, { merge: true });
    }

    if (data.logs) {
      const logsRef = doc(db, 'users', userId, 'focusLogs', 'all');
      batch.set(logsRef, { items: sanitizeForFirestore(data.logs.slice(0, 100)), updatedAt: nowIso }, { merge: true });
    }

    if (data.customImages) {
      const imagesRef = doc(db, 'users', userId, 'imageLibrary', 'all');
      batch.set(imagesRef, { items: sanitizeForFirestore(data.customImages), updatedAt: nowIso }, { merge: true });
    }

    if (data.customAudio) {
      const audioRef = doc(db, 'users', userId, 'audioLibrary', 'all');
      batch.set(audioRef, { items: sanitizeForFirestore(data.customAudio), updatedAt: nowIso }, { merge: true });
    }

    if (data.rollbackSnapshot !== undefined) {
      const snapRef = doc(db, 'users', userId, 'rollbackSnapshot', 'latest');
      if (data.rollbackSnapshot) {
        batch.set(snapRef, sanitizeForFirestore({ ...data.rollbackSnapshot, updatedAt: nowIso }), { merge: true });
      } else {
        batch.delete(snapRef);
      }
    }

    await batch.commit();
  } catch (error) {
    console.warn('Batched cloud save warning:', error);
    handleFirestoreError(error, OperationType.WRITE, `users/${userId}`);
  }
}

/**
 * Load all user cloud data
 */
export async function loadUserDataFromCloud(userId: string): Promise<{
  config?: WorkspaceConfig;
  tasks?: Task[];
  stickyNotes?: StickyNote[];
  notepad?: string;
  logs?: FocusLog[];
  streak?: Streak;
  customImages?: CustomImageRecord[];
  customAudio?: CustomAudioRecord[];
  rollbackSnapshot?: RollbackSnapshot | null;
} | null> {
  try {
    const configSnap = await getDoc(doc(db, 'users', userId, 'workspace', 'config'));
    const notepadSnap = await getDoc(doc(db, 'users', userId, 'notepad', 'current'));
    const streakSnap = await getDoc(doc(db, 'users', userId, 'streak', 'current'));
    const tasksSnap = await getDoc(doc(db, 'users', userId, 'tasks', 'all'));
    const notesSnap = await getDoc(doc(db, 'users', userId, 'stickyNotes', 'all'));
    const logsSnap = await getDoc(doc(db, 'users', userId, 'focusLogs', 'all'));
    const imagesSnap = await getDoc(doc(db, 'users', userId, 'imageLibrary', 'all'));
    const audioSnap = await getDoc(doc(db, 'users', userId, 'audioLibrary', 'all'));
    const rollbackSnap = await getDoc(doc(db, 'users', userId, 'rollbackSnapshot', 'latest'));

    const hasAnyDoc =
      configSnap.exists() ||
      notepadSnap.exists() ||
      streakSnap.exists() ||
      tasksSnap.exists() ||
      notesSnap.exists() ||
      logsSnap.exists() ||
      imagesSnap.exists() ||
      audioSnap.exists() ||
      rollbackSnap.exists();

    if (!hasAnyDoc) {
      return null;
    }

    return {
      config: configSnap.exists() ? (configSnap.data() as WorkspaceConfig) : undefined,
      notepad: notepadSnap.exists() ? notepadSnap.data()?.content : undefined,
      streak: streakSnap.exists() ? (streakSnap.data() as Streak) : undefined,
      tasks: tasksSnap.exists() ? tasksSnap.data()?.items : undefined,
      stickyNotes: notesSnap.exists() ? notesSnap.data()?.items : undefined,
      logs: logsSnap.exists() ? logsSnap.data()?.items : undefined,
      customImages: imagesSnap.exists() ? (imagesSnap.data()?.items as CustomImageRecord[]) : undefined,
      customAudio: audioSnap.exists() ? (audioSnap.data()?.items as CustomAudioRecord[]) : undefined,
      rollbackSnapshot: rollbackSnap.exists() ? (rollbackSnap.data() as RollbackSnapshot) : null,
    };
  } catch (error) {
    console.warn('Failed to load user data from cloud:', error);
    return null;
  }
}

/**
 * Save custom audio library to cloud
 */
export async function saveCustomAudioToCloud(userId: string, items: CustomAudioRecord[]): Promise<void> {
  try {
    const audioRef = doc(db, 'users', userId, 'audioLibrary', 'all');
    await setDoc(audioRef, { items, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Failed to save custom audio to cloud:', error);
  }
}

/**
 * Load custom audio library from cloud
 */
export async function loadCustomAudioFromCloud(userId: string): Promise<CustomAudioRecord[]> {
  try {
    const audioRef = doc(db, 'users', userId, 'audioLibrary', 'all');
    const snap = await getDoc(audioRef);
    if (snap.exists() && snap.data()?.items) {
      return snap.data().items as CustomAudioRecord[];
    }
    return [];
  } catch (error) {
    console.warn('Failed to load custom audio from cloud:', error);
    return [];
  }
}

/**
 * Save custom images library to cloud
 */
export async function saveCustomImagesToCloud(userId: string, items: CustomImageRecord[]): Promise<void> {
  try {
    const imagesRef = doc(db, 'users', userId, 'imageLibrary', 'all');
    await setDoc(imagesRef, { items, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Failed to save custom images to cloud:', error);
  }
}

/**
 * Save rollback snapshot to cloud
 */
export async function saveRollbackSnapshotToCloud(userId: string, snapshot: RollbackSnapshot): Promise<void> {
  try {
    const snapRef = doc(db, 'users', userId, 'rollbackSnapshot', 'latest');
    await setDoc(snapRef, { ...snapshot, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.warn('Failed to save rollback snapshot to cloud:', error);
  }
}

/**
 * Clear rollback snapshot from cloud
 */
export async function clearRollbackSnapshotFromCloud(userId: string): Promise<void> {
  try {
    const snapRef = doc(db, 'users', userId, 'rollbackSnapshot', 'latest');
    await deleteDoc(snapRef);
  } catch (error) {
    console.warn('Failed to clear rollback snapshot from cloud:', error);
  }
}

// ----------------------------------------------------
// USER PERSONAL & GROUP TEMPLATES (Firestore: templates/{templateId} & users/{userId}/templates/{templateId})
// Note: We do NOT store a separate groups table in the database;
// the template stores isGroup (0 or 1) and the user list (max 5 members) directly in the template data.
// ----------------------------------------------------

/**
 * Validate and cap template members to maximum 5 members
 */
export function sanitizeTemplateMembers(
  creatorId: string,
  creatorName?: string,
  creatorPhoto?: string,
  members?: TemplateMember[]
): { members: TemplateMember[]; memberUids: string[] } {
  const result: TemplateMember[] = [];
  const uids = new Set<string>();

  // Ensure creator is included
  if (creatorId) {
    result.push({
      uid: creatorId,
      displayName: creatorName || 'Creator',
      photoURL: creatorPhoto,
      role: 'owner',
      addedAt: new Date().toISOString(),
    });
    uids.add(creatorId);
  }

  // Add additional members up to a hard maximum of 5 members total
  if (members && Array.isArray(members)) {
    for (const m of members) {
      if (result.length >= 5) break; // Strict 5-member limit per prompt
      if (m.uid && !uids.has(m.uid)) {
        result.push({
          uid: m.uid,
          email: m.email || '',
          displayName: m.displayName || m.email?.split('@')[0] || 'Member',
          photoURL: m.photoURL,
          role: m.role || 'member',
          addedAt: m.addedAt || new Date().toISOString(),
        });
        uids.add(m.uid);
      } else if (m.email && !result.some((r) => r.email === m.email)) {
        result.push({
          uid: m.uid || `user-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          email: m.email,
          displayName: m.displayName || m.email.split('@')[0],
          photoURL: m.photoURL,
          role: m.role || 'member',
          addedAt: m.addedAt || new Date().toISOString(),
        });
      }
    }
  }

  return {
    members: result.slice(0, 5),
    memberUids: Array.from(uids).slice(0, 5),
  };
}

/**
 * Save or update a workspace template (Personal with isGroup: 0, or Group with isGroup: 1, max 5 members)
 */
export async function savePersonalTemplate(userId: string, template: Template): Promise<Template> {
  try {
    const isGroup = template.isGroup === 1 ? 1 : 0;
    const effectiveUserId = userId || auth.currentUser?.uid || 'guest';
    const effectiveUserName = template.creatorName || auth.currentUser?.displayName || 'Focus Explorer';

    const { members, memberUids } = sanitizeTemplateMembers(
      template.creatorId || effectiveUserId,
      effectiveUserName,
      template.creatorPhoto || auth.currentUser?.photoURL || undefined,
      template.members
    );

    const cleanTemplate: Template = {
      ...template,
      creatorId: template.creatorId || effectiveUserId,
      creatorName: effectiveUserName,
      creatorPhoto: template.creatorPhoto || auth.currentUser?.photoURL || '',
      isGroup,
      members,
      memberUids,
      tasks: template.tasks || [],
      stickyNotes: template.stickyNotes || [],
      notepad: template.notepad || '',
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    };

    // 1. Always update local storage cache for instant offline & guest access
    try {
      const raw = localStorage.getItem('airiser_personal_templates');
      const existing: Template[] = raw ? JSON.parse(raw) : [];
      const updated = [cleanTemplate, ...existing.filter((t) => t.id !== cleanTemplate.id)];
      localStorage.setItem('airiser_personal_templates', JSON.stringify(updated));
    } catch (e) {
      console.warn('Local storage template cache error:', e);
    }

    // 2. If user is authenticated, persist to Firestore
    if (auth.currentUser && effectiveUserId && effectiveUserId !== 'guest' && effectiveUserId !== 'anonymous') {
      try {
        const firestorePayload = sanitizeForFirestore(cleanTemplate);
        const userTemplateRef = doc(db, 'users', effectiveUserId, 'templates', template.id);
        await setDoc(userTemplateRef, firestorePayload, { merge: true });

        // If it is a group template (isGroup: 1) or public marketplace template, also persist to root templates collection
        if (isGroup === 1 || cleanTemplate.isPublic) {
          const rootTemplateRef = doc(db, 'templates', template.id);
          await setDoc(rootTemplateRef, firestorePayload, { merge: true });
        }
      } catch (cloudErr) {
        console.warn('Firestore template write warning (local fallback succeeded):', cloudErr);
        handleFirestoreError(cloudErr, OperationType.WRITE, `users/${effectiveUserId}/templates/${template.id}`);
      }
    }

    return cleanTemplate;
  } catch (error) {
    console.error('Error saving template:', error);
    throw error;
  }
}

/**
 * Load all personal (isGroup: 0) and group (isGroup: 1) templates accessible to the user
 */
export async function loadPersonalTemplates(userId?: string | null, userEmail?: string | null): Promise<Template[]> {
  const templatesMap = new Map<string, Template>();

  // 1. First load from localStorage to ensure instant availability & guest mode support
  try {
    const raw = localStorage.getItem('airiser_personal_templates');
    if (raw) {
      const localList: Template[] = JSON.parse(raw);
      localList.forEach((t) => {
        if (t && t.id) {
          templatesMap.set(t.id, t);
        }
      });
    }
  } catch (e) {
    console.warn('Local personal templates parse error:', e);
  }

  // 2. Fetch from user's subcollection in Firestore if authenticated
  const effectiveUserId = userId || auth.currentUser?.uid;
  if (effectiveUserId && effectiveUserId !== 'guest' && effectiveUserId !== 'anonymous' && auth.currentUser) {
    try {
      const userTemplatesCol = collection(db, 'users', effectiveUserId, 'templates');
      const snap = await getDocs(userTemplatesCol);
      snap.forEach((d) => {
        const data = d.data() as Template;
        templatesMap.set(data.id, {
          ...data,
          id: d.id,
          isGroup: data.isGroup === 1 ? 1 : 0,
          members: data.members || [],
          memberUids: data.memberUids || [data.creatorId || effectiveUserId],
        });
      });
    } catch (e) {
      console.warn('Could not fetch user subcollection templates:', e);
    }

    // 3. Fetch from root templates collection to find Group templates where user is in members list
    try {
      const rootTemplatesCol = collection(db, 'templates');
      const rootSnap = await getDocs(rootTemplatesCol);
      rootSnap.forEach((d) => {
        const data = d.data() as Template;
        const isMember =
          data.creatorId === effectiveUserId ||
          (data.memberUids && data.memberUids.includes(effectiveUserId)) ||
          (data.members && data.members.some((m) => m.uid === effectiveUserId || (userEmail && m.email === userEmail)));

        if (isMember) {
          templatesMap.set(data.id, {
            ...data,
            id: d.id,
            isGroup: data.isGroup === 1 ? 1 : 0,
            members: data.members || [],
            memberUids: data.memberUids || (data.members ? data.members.map((m) => m.uid) : [data.creatorId]),
          });
        }
      });
    } catch (e) {
      console.warn('Could not fetch root group templates:', e);
    }
  }

  const templates = Array.from(templatesMap.values());
  return templates.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || '').getTime() - new Date(a.updatedAt || a.createdAt || '').getTime()
  );
}

/**
 * Update member roster for an existing group template (strictly maximum 5 members)
 */
export async function updateTemplateMembers(
  templateId: string,
  members: TemplateMember[]
): Promise<TemplateMember[]> {
  try {
    const cappedMembers = members.slice(0, 5);
    const memberUids = cappedMembers.map((m) => m.uid).filter(Boolean);

    // Update local cache
    try {
      const raw = localStorage.getItem('airiser_personal_templates');
      if (raw) {
        const existing: Template[] = JSON.parse(raw);
        const updated = existing.map((t) =>
          t.id === templateId ? { ...t, members: cappedMembers, memberUids, updatedAt: new Date().toISOString() } : t
        );
        localStorage.setItem('airiser_personal_templates', JSON.stringify(updated));
      }
    } catch (e) {}

    // Update Firestore if authenticated
    if (auth.currentUser) {
      const rootRef = doc(db, 'templates', templateId);
      await updateDoc(rootRef, sanitizeForFirestore({
        members: cappedMembers,
        memberUids,
        updatedAt: new Date().toISOString(),
      })).catch(() => {});
    }

    return cappedMembers;
  } catch (error) {
    console.error('Error updating template members:', error);
    throw error;
  }
}

/**
 * Delete a template from Firestore & local cache
 */
export async function deletePersonalTemplate(userId: string, templateId: string): Promise<void> {
  try {
    // 1. Remove from local storage cache
    try {
      const raw = localStorage.getItem('airiser_personal_templates');
      if (raw) {
        const localList: Template[] = JSON.parse(raw);
        const filtered = localList.filter((t) => t.id !== templateId);
        localStorage.setItem('airiser_personal_templates', JSON.stringify(filtered));
      }
    } catch (e) {}

    // 2. Remove from Firestore if authenticated
    const effectiveUserId = userId || auth.currentUser?.uid;
    if (effectiveUserId && effectiveUserId !== 'guest' && effectiveUserId !== 'anonymous' && auth.currentUser) {
      const templateRef = doc(db, 'users', effectiveUserId, 'templates', templateId);
      await deleteDoc(templateRef).catch(() => {});

      const rootTemplateRef = doc(db, 'templates', templateId);
      await deleteDoc(rootTemplateRef).catch(() => {});
    }
  } catch (error) {
    console.error('Error deleting template:', error);
    throw error;
  }
}

// ----------------------------------------------------
// ROOM-SCOPED TEMPLATES (Firestore: rooms/{roomId}/templates/{templateId})
// ----------------------------------------------------

/**
 * Save or update a room-scoped template
 */
export async function saveRoomTemplate(roomId: string, template: Template): Promise<Template> {
  try {
    const creatorId = template.creatorId || auth.currentUser?.uid || 'guest';
    const creatorName = template.creatorName || auth.currentUser?.displayName || 'Room Member';

    const cleanTemplate: Template = {
      ...template,
      roomId,
      contextType: 'room',
      creatorId,
      creatorName,
      creatorPhoto: template.creatorPhoto || auth.currentUser?.photoURL || '',
      tasks: template.tasks || [],
      stickyNotes: template.stickyNotes || [],
      notepad: template.notepad || '',
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    };

    // 1. Cache to localStorage for this room
    try {
      const cacheKey = `airiser_room_templates_${roomId}`;
      const raw = localStorage.getItem(cacheKey);
      const existing: Template[] = raw ? JSON.parse(raw) : [];
      const updated = [cleanTemplate, ...existing.filter((t) => t.id !== cleanTemplate.id)];
      localStorage.setItem(cacheKey, JSON.stringify(updated));
    } catch (e) {
      console.warn('Local storage room template cache error:', e);
    }

    // 2. Persist to Firestore under rooms/{roomId}/templates/{templateId}
    if (auth.currentUser) {
      try {
        const firestorePayload = sanitizeForFirestore(cleanTemplate);
        const roomTemplateRef = doc(db, 'rooms', roomId, 'templates', template.id);
        await setDoc(roomTemplateRef, firestorePayload, { merge: true });
      } catch (cloudErr) {
        console.warn('Firestore room template write warning (local fallback used):', cloudErr);
        handleFirestoreError(cloudErr, OperationType.WRITE, `rooms/${roomId}/templates/${template.id}`);
      }
    }

    return cleanTemplate;
  } catch (error) {
    console.error('Error saving room template:', error);
    throw error;
  }
}

/**
 * Load all room-scoped templates for an active room
 */
export async function loadRoomTemplates(roomId: string): Promise<Template[]> {
  const templatesMap = new Map<string, Template>();

  // 1. First load from localStorage cache
  try {
    const cacheKey = `airiser_room_templates_${roomId}`;
    const raw = localStorage.getItem(cacheKey);
    if (raw) {
      const localList: Template[] = JSON.parse(raw);
      localList.forEach((t) => {
        if (t && t.id) {
          templatesMap.set(t.id, { ...t, contextType: 'room', roomId });
        }
      });
    }
  } catch (e) {
    console.warn('Local room templates parse error:', e);
  }

  // 2. Fetch from Firestore subcollection rooms/{roomId}/templates
  if (auth.currentUser) {
    try {
      const roomTemplatesCol = collection(db, 'rooms', roomId, 'templates');
      const snap = await getDocs(roomTemplatesCol);
      snap.forEach((d) => {
        const data = d.data() as Template;
        templatesMap.set(data.id, {
          ...data,
          id: d.id,
          contextType: 'room',
          roomId,
        });
      });
    } catch (e) {
      console.warn('Could not fetch room templates from Firestore:', e);
    }
  }

  const templates = Array.from(templatesMap.values());
  return templates.sort(
    (a, b) => new Date(b.updatedAt || b.createdAt || '').getTime() - new Date(a.updatedAt || a.createdAt || '').getTime()
  );
}

/**
 * Delete a room template
 */
export async function deleteRoomTemplate(roomId: string, templateId: string): Promise<void> {
  try {
    // 1. Remove from local storage
    try {
      const cacheKey = `airiser_room_templates_${roomId}`;
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const localList: Template[] = JSON.parse(raw);
        const filtered = localList.filter((t) => t.id !== templateId);
        localStorage.setItem(cacheKey, JSON.stringify(filtered));
      }
    } catch (e) {}

    // 2. Remove from Firestore
    if (auth.currentUser) {
      const roomTemplateRef = doc(db, 'rooms', roomId, 'templates', templateId);
      await deleteDoc(roomTemplateRef).catch(() => {});
    }
  } catch (error) {
    console.error('Error deleting room template:', error);
    throw error;
  }
}

// ----------------------------------------------------
// PUBLIC MARKETPLACE TEMPLATES (Firestore: templates/{templateId})
// ----------------------------------------------------

/**
 * Publish or update a template to the Public Marketplace
 */
export async function publishTemplateToMarketplace(template: Template): Promise<Template> {
  try {
    const templateRef = doc(db, 'templates', template.id);
    const cleanTemplate: Template = {
      ...template,
      isPublic: true,
      downloadCount: template.downloadCount ?? 0,
      likesCount: template.likesCount ?? 0,
      likedBy: template.likedBy ?? [],
      tasks: template.tasks || [],
      stickyNotes: template.stickyNotes || [],
      notepad: template.notepad || '',
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    };

    const sanitized = sanitizeForFirestore(cleanTemplate);
    await setDoc(templateRef, sanitized, { merge: true });
    return cleanTemplate;
  } catch (error) {
    console.error('Error publishing template to marketplace:', error);
    handleFirestoreError(error, OperationType.WRITE, `templates/${template.id}`);
    throw error;
  }
}

/**
 * Fetch all public marketplace templates from Firestore, merged with curated presets
 */
export async function fetchMarketplaceTemplates(): Promise<Template[]> {
  try {
    const templatesCol = collection(db, 'templates');
    const snap = await getDocs(templatesCol);
    const cloudTemplates: Template[] = [];

    snap.forEach((d) => {
      cloudTemplates.push({ ...d.data(), id: d.id } as Template);
    });

    // Merge curated presets with cloud community templates (cloud versions take precedence)
    const map = new Map<string, Template>();
    PRESET_TEMPLATES.forEach((p) => map.set(p.id, p));
    cloudTemplates.forEach((c) => map.set(c.id, c));

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.updatedAt || b.createdAt || '').getTime() - new Date(a.updatedAt || a.createdAt || '').getTime()
    );
  } catch (error) {
    console.warn('Failed to fetch marketplace templates from Firestore, falling back to presets:', error);
    return PRESET_TEMPLATES;
  }
}

/**
 * Update an existing marketplace template
 */
export async function updateMarketplaceTemplate(
  templateId: string,
  updates: Partial<Template>
): Promise<void> {
  try {
    const templateRef = doc(db, 'templates', templateId);
    const sanitized = sanitizeForFirestore({
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    await updateDoc(templateRef, sanitized);
  } catch (error) {
    console.error('Error updating marketplace template:', error);
    handleFirestoreError(error, OperationType.UPDATE, `templates/${templateId}`);
    throw error;
  }
}

/**
 * Delete a template from the Public Marketplace
 */
export async function deleteMarketplaceTemplate(templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, 'templates', templateId);
    await deleteDoc(templateRef);
  } catch (error) {
    console.error('Error deleting template from marketplace:', error);
    throw error;
  }
}

/**
 * Increment download/clone count for a template in Firestore
 */
export async function recordTemplateClone(templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, 'templates', templateId);
    await updateDoc(templateRef, {
      downloadCount: increment(1),
    });
  } catch (error) {
    // Non-fatal if preset template not yet saved in cloud
  }
}

/**
 * Toggle like for a marketplace template in Firestore
 */
export async function toggleTemplateLike(templateId: string, userId: string, isLiked: boolean): Promise<void> {
  try {
    const templateRef = doc(db, 'templates', templateId);
    if (isLiked) {
      await updateDoc(templateRef, {
        likesCount: increment(-1),
        likedBy: arrayRemove(userId),
      });
    } else {
      await updateDoc(templateRef, {
        likesCount: increment(1),
        likedBy: arrayUnion(userId),
      });
    }
  } catch (error) {
    console.warn('Error toggling template like:', error);
  }
}

// ----------------------------------------------------
// USER STREAK & FOCUS LOGS (Firestore: users/{userId}/streak/current)
// ----------------------------------------------------

/**
 * Save user streak data directly to Firestore document users/{userId}/streak/current
 */
export async function saveUserStreak(userId: string, streak: Streak): Promise<void> {
  const streakPath = `users/${userId}/streak/current`;
  try {
    const streakRef = doc(db, 'users', userId, 'streak', 'current');
    await setDoc(
      streakRef,
      {
        ...streak,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, streakPath);
  }
}

/**
 * Load user streak data from Firestore
 */
export async function loadUserStreak(userId: string): Promise<Streak | null> {
  const streakPath = `users/${userId}/streak/current`;
  try {
    const streakRef = doc(db, 'users', userId, 'streak', 'current');
    const snap = await getDoc(streakRef);
    if (snap.exists()) {
      return snap.data() as Streak;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, streakPath);
    return null;
  }
}

/**
 * Subscribe in real-time to user streak updates in Firestore
 */
export function subscribeToUserStreak(
  userId: string,
  onUpdate: (streak: Streak) => void,
  onError?: (err: any) => void
): () => void {
  const streakPath = `users/${userId}/streak/current`;
  const streakRef = doc(db, 'users', userId, 'streak', 'current');
  return onSnapshot(
    streakRef,
    (snap) => {
      if (snap.exists()) {
        onUpdate(snap.data() as Streak);
      }
    },
    (err) => {
      handleFirestoreError(err, OperationType.GET, streakPath);
      onError?.(err);
    }
  );
}


