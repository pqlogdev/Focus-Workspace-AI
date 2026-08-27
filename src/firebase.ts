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
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import {
  WorkspaceConfig,
  Task,
  StickyNote,
  FocusLog,
  Streak,
  Template,
  CustomImageRecord,
  RollbackSnapshot,
} from './types';
import { PRESET_TEMPLATES } from './data/presetTemplates';

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
// USER PERSONAL TEMPLATES (Firestore: users/{userId}/templates/{templateId})
// ----------------------------------------------------

/**
 * Save or update a personal workspace template for this user
 */
export async function savePersonalTemplate(userId: string, template: Template): Promise<void> {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', template.id);
    await setDoc(templateRef, {
      ...template,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving personal template to Firestore:', error);
    throw error;
  }
}

/**
 * Load all personal templates for a user from Firestore
 */
export async function loadPersonalTemplates(userId: string): Promise<Template[]> {
  try {
    const templatesCol = collection(db, 'users', userId, 'templates');
    const snap = await getDocs(templatesCol);
    const templates: Template[] = [];
    snap.forEach((d) => {
      templates.push(d.data() as Template);
    });
    return templates.sort((a, b) => new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime());
  } catch (error) {
    console.warn('Failed to load personal templates:', error);
    return [];
  }
}

/**
 * Delete a personal template from Firestore
 */
export async function deletePersonalTemplate(userId: string, templateId: string): Promise<void> {
  try {
    const templateRef = doc(db, 'users', userId, 'templates', templateId);
    await deleteDoc(templateRef);
  } catch (error) {
    console.error('Error deleting personal template:', error);
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

