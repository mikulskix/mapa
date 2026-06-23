import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function PendingPage() {
  const { logout, user, userStatus } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const rejected = userStatus === 'rejected';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 w-full max-w-md text-center">
        {rejected ? (
          <>
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2 dark:text-white">Dostęp odrzucony</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Prośba o dostęp dla konta <strong>{user?.email}</strong> została odrzucona przez administratora.
            </p>
          </>
        ) : (
          <>
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h1 className="text-xl font-bold mb-2 dark:text-white">Oczekiwanie na zatwierdzenie</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-1">
              Twoje konto <strong>{user?.email}</strong> zostało zarejestrowane.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-6">
              Administrator musi zatwierdzić Twój dostęp. Sprawdź ponownie później.
            </p>
          </>
        )}
        <button
          onClick={logout}
          className="px-6 py-2 text-sm rounded-md bg-gray-200 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
        >
          Wyloguj się
        </button>
      </div>
    </div>
  );
}
