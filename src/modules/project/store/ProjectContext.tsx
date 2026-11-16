import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  where,
  deleteDoc,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../../lib/firebase';
import { useFirebase } from '../../../components/FirebaseProvider';
import { UnifiedBuildingProject, GeometryIssue } from '../types';
import { createDefaultUnifiedProject, validateProjectGeometry } from '../engine/projectSync';

const LOCAL_PROJECT_KEY = 'buildai_kz_unified_project_v1';
const LOCAL_PROJECTS_LIST_KEY = 'buildai_kz_saved_projects_v1';

interface SavedProjectMeta {
  id: string;
  name: string;
  projectCode: string;
  updatedAt: string;
}

interface ProjectContextValue {
  project: UnifiedBuildingProject;
  savedProjects: SavedProjectMeta[];
  geometryIssues: GeometryIssue[];
  activeFloorIndex: number;
  setActiveFloorIndex: (idx: number) => void;
  updateProject: (
    updater: UnifiedBuildingProject | ((prev: UnifiedBuildingProject) => UnifiedBuildingProject),
    recordHistory?: boolean
  ) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  resetToDefault: () => void;
  saveCloudProject: (customName?: string) => Promise<void>;
  loadProjectById: (id: string) => void;
  deleteSavedProject: (id: string) => Promise<void>;
  isSavingCloud: boolean;
  lastSavedAt: string | null;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

export const useProject = () => {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProject must be used inside ProjectProvider');
  }
  return ctx;
};

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthReady } = useFirebase();

  const [project, setProject] = useState<UnifiedBuildingProject>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_PROJECT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.floors) && Array.isArray(parsed.walls)) {
          return parsed;
        }
      }
    } catch {
      // Fallback to default
    }
    return createDefaultUnifiedProject();
  });

  const [savedProjectsMap, setSavedProjectsMap] = useState<Record<string, UnifiedBuildingProject>>(() => {
    try {
      const raw = localStorage.getItem(LOCAL_PROJECTS_LIST_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      // ignore
    }
    return {};
  });

  const [activeFloorIndex, setActiveFloorIndex] = useState<number>(0);
  const [undoStack, setUndoStack] = useState<UnifiedBuildingProject[]>([]);
  const [redoStack, setRedoStack] = useState<UnifiedBuildingProject[]>([]);
  const [isSavingCloud, setIsSavingCloud] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const cloudProjectsRef = useRef<Record<string, UnifiedBuildingProject>>({});

  // Subscribe to user's Firestore projects when signed in
  useEffect(() => {
    if (!isAuthReady || !user || !user.emailVerified) return;

    const q = query(collection(db, 'projects'), where('ownerId', '==', user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const map: Record<string, UnifiedBuildingProject> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (data?.model) {
            map[docSnap.id] = data.model as UnifiedBuildingProject;
          }
        });
        cloudProjectsRef.current = map;
        setSavedProjectsMap((prev) => ({ ...prev, ...map }));
      },
      (err) => {
        console.warn('Projects snapshot warning:', err.message);
      }
    );

    return () => unsubscribe();
  }, [user, isAuthReady]);

  // Autosave active project to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(LOCAL_PROJECT_KEY, JSON.stringify(project));
      setLastSavedAt(new Date().toLocaleTimeString('ru-RU'));
    } catch (e) {
      console.warn('Local project autosave skipped:', e);
    }
  }, [project]);

  const updateProject = useCallback(
    (
      updater: UnifiedBuildingProject | ((prev: UnifiedBuildingProject) => UnifiedBuildingProject),
      recordHistory: boolean = true
    ) => {
      setProject((prev) => {
        const next = typeof updater === 'function' ? updater(prev) : updater;
        const stamped: UnifiedBuildingProject = {
          ...next,
          updatedAt: new Date().toISOString(),
        };
        if (recordHistory) {
          setUndoStack((u) => [...u.slice(-49), prev]);
          setRedoStack([]);
        }
        return stamped;
      });
    },
    []
  );

  const undo = useCallback(() => {
    setUndoStack((u) => {
      if (u.length === 0) return u;
      const previous = u[u.length - 1];
      setProject((curr) => {
        setRedoStack((r) => [...r, curr]);
        return previous;
      });
      return u.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStack((r) => {
      if (r.length === 0) return r;
      const next = r[r.length - 1];
      setProject((curr) => {
        setUndoStack((u) => [...u, curr]);
        return next;
      });
      return r.slice(0, -1);
    });
  }, []);

  const resetToDefault = useCallback(() => {
    const def = createDefaultUnifiedProject();
    updateProject(def, true);
    setActiveFloorIndex(0);
  }, [updateProject]);

  const saveCloudProject = useCallback(
    async (customName?: string) => {
      const projectId =
        project.id && /^[a-zA-Z0-9_-]+$/.test(project.id)
          ? project.id
          : `proj_${Date.now()}`;
      const toSave: UnifiedBuildingProject = {
        ...project,
        id: projectId,
        name: (customName || project.name).slice(0, 200),
        updatedAt: new Date().toISOString(),
      };
      setProject(toSave);

      // Save locally first
      setSavedProjectsMap((prev) => {
        const next = { ...prev, [projectId]: toSave };
        try {
          localStorage.setItem(LOCAL_PROJECTS_LIST_KEY, JSON.stringify(next));
        } catch {
          // ignore
        }
        return next;
      });

      if (user && user.emailVerified) {
        setIsSavingCloud(true);
        const path = `projects/${projectId}`;
        try {
          const existsInCloud = Boolean(cloudProjectsRef.current[projectId]);
          const payload: Record<string, unknown> = {
            id: projectId,
            ownerId: user.uid,
            name: toSave.name.slice(0, 200),
            projectCode: (toSave.projectCode || 'KZ-2025/АР').slice(0, 64),
            city: (toSave.city || 'Астана').slice(0, 80),
            stage: toSave.stage || 'АР',
            schemaVersion: toSave.schemaVersion || 1,
            model: JSON.parse(JSON.stringify(toSave)),
            updatedAt: serverTimestamp(),
          };
          if (!existsInCloud) {
            payload.createdAt = serverTimestamp();
          }
          await setDoc(doc(db, 'projects', projectId), payload, { merge: existsInCloud });
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, path);
        } finally {
          setIsSavingCloud(false);
        }
      }
    },
    [project, user]
  );

  const loadProjectById = useCallback(
    (id: string) => {
      const target = savedProjectsMap[id];
      if (target) {
        updateProject(target, true);
        setActiveFloorIndex(0);
      }
    },
    [savedProjectsMap, updateProject]
  );

  const deleteSavedProject = useCallback(
    async (id: string) => {
      setSavedProjectsMap((prev) => {
        const copy = { ...prev };
        delete copy[id];
        try {
          localStorage.setItem(LOCAL_PROJECTS_LIST_KEY, JSON.stringify(copy));
        } catch {
          // ignore
        }
        return copy;
      });
      if (user && user.emailVerified && cloudProjectsRef.current[id]) {
        try {
          await deleteDoc(doc(db, 'projects', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `projects/${id}`);
        }
      }
    },
    [user]
  );

  const savedProjects = useMemo<SavedProjectMeta[]>(
    () =>
      Object.values(savedProjectsMap)
        .map((p) => ({
          id: p.id,
          name: p.name,
          projectCode: p.projectCode,
          updatedAt: p.updatedAt,
        }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [savedProjectsMap]
  );

  const geometryIssues = useMemo(() => validateProjectGeometry(project), [project]);

  return (
    <ProjectContext.Provider
      value={{
        project,
        savedProjects,
        geometryIssues,
        activeFloorIndex: Math.min(activeFloorIndex, Math.max(0, project.floors.length - 1)),
        setActiveFloorIndex,
        updateProject,
        undo,
        redo,
        canUndo: undoStack.length > 0,
        canRedo: redoStack.length > 0,
        resetToDefault,
        saveCloudProject,
        loadProjectById,
        deleteSavedProject,
        isSavingCloud,
        lastSavedAt,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};
