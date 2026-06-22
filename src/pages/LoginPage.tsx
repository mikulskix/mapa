import { Navigate } from 'react-router-dom';
import AuthForm from '../components/AuthForm';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/" replace />;
  return <AuthForm mode="login" />;
}
