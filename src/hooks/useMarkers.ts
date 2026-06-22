import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  setDoc,
  deleteDoc,
  writeBatch,
  getDocs,
  query,
  orderBy,
  limit,
  getDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { encrypt, decrypt } from '../lib/crypto';
import type { MarkerData, MarkerFormData, EncryptedMarker } from '../lib/types';
import { useAuth } from '../context/AuthContext';

export interface BackupInfo {
  id: string;
  createdAt: number;
  markerCount: number;
}

export function useMarkers() {
  const { user, cryptoKey } = useAuth();
  const [markers, setMarkers] = useState<MarkerData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !cryptoKey) {
      setMarkers([]);
      setLoading(false);
      return;
    }

    const col = collection(db, 'users', user.uid, 'markers');
    const unsub = onSnapshot(col, async (snapshot) => {
      const decrypted: MarkerData[] = [];
      for (const docSnap of snapshot.docs) {
        try {
          const data = docSnap.data() as EncryptedMarker;
          const plain = (await decrypt(data.encryptedData, data.iv, cryptoKey)) as MarkerFormData;
          decrypted.push({
            id: docSnap.id,
            ...plain,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        } catch {
          // skip markers that fail to decrypt
        }
      }
      setMarkers(decrypted);
      setLoading(false);
    });

    return unsub;
  }, [user, cryptoKey]);

  // Auto-backup: once per day
  useEffect(() => {
    if (!user || !cryptoKey || loading) return;

    const checkAndBackup = async () => {
      try {
        const backupsCol = collection(db, 'users', user.uid, 'backups');
        const q2 = query(backupsCol, orderBy('createdAt', 'desc'), limit(1));
        const snap = await getDocs(q2);
        const lastBackup = snap.docs[0]?.data()?.createdAt || 0;
        const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

        if (lastBackup < oneDayAgo && markers.length > 0) {
          await createBackupInternal();
        }
      } catch {
        // silent fail for auto-backup
      }
    };

    checkAndBackup();
  }, [user, cryptoKey, loading, markers.length]);

  const createBackupInternal = useCallback(async () => {
    if (!user || !cryptoKey) return;
    const markersCol = collection(db, 'users', user.uid, 'markers');
    const snap = await getDocs(markersCol);

    const backupId = `backup_${Date.now()}`;
    const markerDocs: Record<string, unknown> = {};
    snap.docs.forEach((d) => {
      markerDocs[d.id] = d.data();
    });

    await setDoc(doc(db, 'users', user.uid, 'backups', backupId), {
      createdAt: Date.now(),
      markerCount: snap.docs.length,
      markers: markerDocs,
    });

    // Delete backups older than 7 days
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const allBackups = await getDocs(collection(db, 'users', user.uid, 'backups'));
    for (const d of allBackups.docs) {
      if ((d.data().createdAt || 0) < sevenDaysAgo) {
        await deleteDoc(d.ref);
      }
    }

    return backupId;
  }, [user, cryptoKey]);

  const addMarker = useCallback(
    async (form: MarkerFormData) => {
      if (!user || !cryptoKey) return;
      const id = crypto.randomUUID();
      const { encryptedData, iv } = await encrypt(form, cryptoKey);
      const now = Date.now();
      await setDoc(doc(db, 'users', user.uid, 'markers', id), {
        encryptedData,
        iv,
        createdAt: now,
        updatedAt: now,
      });
    },
    [user, cryptoKey]
  );

  const updateMarker = useCallback(
    async (id: string, form: MarkerFormData) => {
      if (!user || !cryptoKey) return;
      const { encryptedData, iv } = await encrypt(form, cryptoKey);
      await setDoc(
        doc(db, 'users', user.uid, 'markers', id),
        { encryptedData, iv, updatedAt: Date.now() },
        { merge: true }
      );
    },
    [user, cryptoKey]
  );

  const removeMarker = useCallback(
    async (id: string) => {
      if (!user) return;
      await deleteDoc(doc(db, 'users', user.uid, 'markers', id));
    },
    [user]
  );

  const removeAllMarkers = useCallback(
    async () => {
      if (!user) return;
      const col = collection(db, 'users', user.uid, 'markers');
      const snap = await getDocs(col);
      const chunks = [];
      const docs = snap.docs;
      for (let i = 0; i < docs.length; i += 500) {
        chunks.push(docs.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const d of chunk) {
          batch.delete(d.ref);
        }
        await batch.commit();
      }
    },
    [user]
  );

  const importMarkers = useCallback(
    async (forms: MarkerFormData[]) => {
      if (!user || !cryptoKey) return { added: 0, skipped: 0 };

      const existing = new Set(
        markers.map((m) => `${m.name.toLowerCase()}|${m.lat.toFixed(5)}|${m.lng.toFixed(5)}`)
      );

      const toAdd: MarkerFormData[] = [];
      let skipped = 0;

      for (const form of forms) {
        const key = `${form.name.toLowerCase()}|${form.lat.toFixed(5)}|${form.lng.toFixed(5)}`;
        if (existing.has(key)) {
          skipped++;
        } else {
          existing.add(key);
          toAdd.push(form);
        }
      }

      const chunks = [];
      for (let i = 0; i < toAdd.length; i += 500) {
        chunks.push(toAdd.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const form of chunk) {
          const id = crypto.randomUUID();
          const { encryptedData, iv } = await encrypt(form, cryptoKey);
          const now = Date.now();
          batch.set(doc(db, 'users', user.uid, 'markers', id), {
            encryptedData,
            iv,
            createdAt: now,
            updatedAt: now,
          });
        }
        await batch.commit();
      }

      return { added: toAdd.length, skipped };
    },
    [user, cryptoKey, markers]
  );

  const listBackups = useCallback(async (): Promise<BackupInfo[]> => {
    if (!user) return [];
    const backupsCol = collection(db, 'users', user.uid, 'backups');
    const q2 = query(backupsCol, orderBy('createdAt', 'desc'), limit(10));
    const snap = await getDocs(q2);
    return snap.docs.map((d) => ({
      id: d.id,
      createdAt: d.data().createdAt,
      markerCount: d.data().markerCount,
    }));
  }, [user]);

  const restoreBackup = useCallback(
    async (backupId: string) => {
      if (!user || !cryptoKey) return;

      const backupDoc = await getDoc(doc(db, 'users', user.uid, 'backups', backupId));
      if (!backupDoc.exists()) throw new Error('Backup nie istnieje');

      const backupData = backupDoc.data();
      const markerDocs = backupData.markers as Record<string, { encryptedData: string; iv: string; createdAt: number; updatedAt: number }>;

      // Delete current markers
      const currentCol = collection(db, 'users', user.uid, 'markers');
      const currentSnap = await getDocs(currentCol);
      const delChunks = [];
      const currentDocs = currentSnap.docs;
      for (let i = 0; i < currentDocs.length; i += 500) {
        delChunks.push(currentDocs.slice(i, i + 500));
      }
      for (const chunk of delChunks) {
        const batch = writeBatch(db);
        for (const d of chunk) batch.delete(d.ref);
        await batch.commit();
      }

      // Restore from backup
      const entries = Object.entries(markerDocs);
      const restoreChunks = [];
      for (let i = 0; i < entries.length; i += 500) {
        restoreChunks.push(entries.slice(i, i + 500));
      }
      for (const chunk of restoreChunks) {
        const batch = writeBatch(db);
        for (const [id, data] of chunk) {
          batch.set(doc(db, 'users', user.uid, 'markers', id), data);
        }
        await batch.commit();
      }
    },
    [user, cryptoKey]
  );

  const createBackup = useCallback(async () => {
    return createBackupInternal();
  }, [createBackupInternal]);

  return {
    markers, loading,
    addMarker, updateMarker, removeMarker, removeAllMarkers,
    importMarkers, createBackup, listBackups, restoreBackup,
  };
}
