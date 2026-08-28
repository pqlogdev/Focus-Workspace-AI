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
    rollbackSnapshot?: RollbackSnapshot | null;
  }
): Promise<void> {
  try {
    const batch = writeBatch(db);

    if (data.config) {
      const configRef = doc(db, 'users', userId, 'workspace', 'config');
      batch.set(configRef, { ...data.config, updatedAt: new Date().toISOString() });
    }

    if (data.notepad !== undefined) {
      const notepadRef = doc(db, 'users', userId, 'notepad', 'current');
      batch.set(notepadRef, { content: data.notepad, updatedAt: new Date().toISOString() });
    }

    if (data.streak) {
      const streakRef = doc(db, 'users', userId, 'streak', 'current');
      batch.set(streakRef, { ...data.streak, updatedAt: new Date().toISOString() });
    }

    await batch.commit();

    // Save tasks and sticky notes
    if (data.tasks) {
      const tasksRef = doc(db, 'users', userId, 'tasks', 'all');
      await setDoc(tasksRef, { items: data.tasks, updatedAt: new Date().toISOString() });
    }

    if (data.stickyNotes) {
      const notesRef = doc(db, 'users', userId, 'stickyNotes', 'all');
      await setDoc(notesRef, { items: data.stickyNotes, updatedAt: new Date().toISOString() });
    }

    if (data.logs) {
      const logsRef = doc(db, 'users', userId, 'focusLogs', 'all');
      await setDoc(logsRef, { items: data.logs.slice(0, 100), updatedAt: new Date().toISOString() });
    }

    if (data.customImages) {
      const imagesRef = doc(db, 'users', userId, 'imageLibrary', 'all');
      await setDoc(imagesRef, { items: data.customImages, updatedAt: new Date().toISOString() });
    }

    if (data.rollbackSnapshot !== undefined) {
      const snapRef = doc(db, 'users', userId, 'rollbackSnapshot', 'latest');
      if (data.rollbackSnapshot) {
        await setDoc(snapRef, { ...data.rollbackSnapshot, updatedAt: new Date().toISOString() });
      } else {
        await deleteDoc(snapRef).catch(() => {});
      }
    }
  } catch (error) {
    console.warn('Failed to batch save user data to cloud:', error);
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
    const rollbackSnap = await getDoc(doc(db, 'users', userId, 'rollbackSnapshot', 'latest'));

    const hasAnyDoc =
      configSnap.exists() ||
      notepadSnap.exists() ||
      streakSnap.exists() ||
      tasksSnap.exists() ||
      notesSnap.exists() ||
      logsSnap.exists() ||
      imagesSnap.exists() ||
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
      rollbackSnapshot: rollbackSnap.exists() ? (rollbackSnap.data() as RollbackSnapshot) : null,
    };
  } catch (error) {
    console.warn('Failed to load user data from cloud:', error);
    return null;
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
    const { members, memberUids } = sanitizeTemplateMembers(
      template.creatorId || userId,
      template.creatorName,
      template.creatorPhoto,
      template.members
    );

    const cleanTemplate: Template = {
      ...template,
      isGroup,
      members,
      memberUids,
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    };

    // Save to user subcollection
    const userTemplateRef = doc(db, 'users', userId, 'templates', template.id);
    await setDoc(userTemplateRef, cleanTemplate);

    // If it is a group template (isGroup: 1) or public marketplace template, also persist to root templates collection
    if (isGroup === 1 || cleanTemplate.isPublic) {
      const rootTemplateRef = doc(db, 'templates', template.id);
      await setDoc(rootTemplateRef, cleanTemplate, { merge: true });
    }

    return cleanTemplate;
  } catch (error) {
    console.error('Error saving template to Firestore:', error);
    throw error;
  }
}

/**
 * Load all personal (isGroup: 0) and group (isGroup: 1) templates accessible to the user
 */
export async function loadPersonalTemplates(userId: string, userEmail?: string | null): Promise<Template[]> {
  try {
    const templatesMap = new Map<string, Template>();

    // 1. Fetch from user's subcollection
    try {
      const userTemplatesCol = collection(db, 'users', userId, 'templates');
      const snap = await getDocs(userTemplatesCol);
      snap.forEach((d) => {
        const data = d.data() as Template;
        templatesMap.set(data.id, {
          ...data,
          isGroup: data.isGroup === 1 ? 1 : 0,
          members: data.members || [],
          memberUids: data.memberUids || [data.creatorId],
        });
      });
    } catch (e) {
      console.warn('Could not fetch user subcollection templates:', e);
    }

    // 2. Fetch from root templates collection to find Group templates where user is in members list
    try {
      const rootTemplatesCol = collection(db, 'templates');
      const rootSnap = await getDocs(rootTemplatesCol);
      rootSnap.forEach((d) => {
        const data = d.data() as Template;
        const isMember =
          data.creatorId === userId ||
          (data.memberUids && data.memberUids.includes(userId)) ||
          (data.members && data.members.some((m) => m.uid === userId || (userEmail && m.email === userEmail)));

        if (isMember) {
          templatesMap.set(data.id, {
            ...data,
            isGroup: data.isGroup === 1 ? 1 : 0,
            members: data.members || [],
            memberUids: data.memberUids || (data.members ? data.members.map((m) => m.uid) : [data.creatorId]),
          });
        }
      });
    } catch (e) {
      console.warn('Could not fetch root group templates:', e);
    }

    const templates = Array.from(templatesMap.values());
    return templates.sort(
      (a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime()
    );
  } catch (error) {
    console.warn('Failed to load personal & group templates:', error);
    return [];
  }
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

    const rootRef = doc(db, 'templates', templateId);
    await updateDoc(rootRef, {
      members: cappedMembers,
      memberUids,
      updatedAt: new Date().toISOString(),
    });

    return cappedMembers;
  } catch (error) {
    console.error('Error updating template members:', error);
    throw error;
  }
}

/**
 * Delete a template from Firestore
 */
export async function deletePersonalTemplate(userId: string, templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', templateId);
    await deleteDoc(templateRef).catch(() => {});

    const rootTemplateRef = doc(db, 'templates', templateId);
    await deleteDoc(rootTemplateRef).catch(() => {});
  } catch (error) {
    console.error('Error deleting template:', error);
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
      updatedAt: new Date().toISOString(),
      createdAt: template.createdAt || new Date().toISOString(),
    };

    await setDoc(templateRef, cleanTemplate, { merge: true });
    return cleanTemplate;
  } catch (error) {
    console.error('Error publishing template to marketplace:', error);
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
    await updateDoc(templateRef, {
      ...updates,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating marketplace template:', error);
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


