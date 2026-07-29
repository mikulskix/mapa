import { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

// Typ mapy: wartość koloru (np. '#ef4444') → nazwa kategorii (np. 'Niebezpieczne miejsca')
export type CategoryMap = Record<string, string>;

/**
 * Hook do zarządzania kategoriami pinezek (kolor → nazwa).
 * Dane przechowywane w Firestore: dokument categories/config, pole "colors".
 * Nie szyfrowane — admin zarządza nimi jawnie.
 */
export function useCategories() {
  const [categories, setCategories] = useState<CategoryMap>({});
  const [loading, setLoading] = useState(true);

  // Nasłuchuj zmian na żywo (React hook z onSnapshot)
  useEffect(() => {
    const ref = doc(db, 'categories', 'config');
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        // Pole "colors" to mapa kolor→nazwa
        setCategories((data.colors as CategoryMap) || {});
      } else {
        setCategories({});
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  /**
   * Zapisuje całą mapę kategorii do Firestore.
   * Wywołuj z panelu admina po edycji.
   *
   * UWAGA: zapis BEZ merge — nadpisujemy całe pole "colors". Dzięki temu
   * kategorie usunięte lokalnie faktycznie znikają. (Z merge:true klucze
   * nieobecne w nowym obiekcie zostałyby w bazie i usuwanie by nie działało.)
   * Dokument categories/config przechowuje wyłącznie pole "colors", więc
   * nadpisanie całości jest bezpieczne.
   */
  const saveCategories = useCallback(async (newCategories: CategoryMap) => {
    const ref = doc(db, 'categories', 'config');
    await setDoc(ref, { colors: newCategories });
  }, []);

  return { categories, loading, saveCategories };
}
