'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { loginAction } from '@/app/actions/auth';
import styles from './page.module.css';

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      const formData = new FormData();
      formData.append('identifier', identifier);
      formData.append('password', password);

      const result = await loginAction(formData);
      
      if (result?.error) {
        setError(result.error);
        setLoading(false);
      }
    } catch (err) {
      console.error('Client login error:', err);
      setError('Erro de conexão. Verifique sua internet.');
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBackground}>
        <Image 
          src="/login-bg.png" 
          alt="TecCosta Background" 
          fill 
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className={styles.bgOverlay}></div>
      </div>
      
      <main className={styles.loginMain}>
        <div className={styles.loginCard}>
          <div className={styles.loginHeader}>
            <div className={styles.logoWrapper}>
              <Image 
                src="/logo.png" 
                alt="TecCosta Logo" 
                width={400} 
                height={160} 
                style={{ width: '100%', height: 'auto', maxWidth: '400px' }} 
                priority 
              />
            </div>
            <h1>Bem-vindo ao Portal</h1>
            <p>Acesse com seu CPF ou CNPJ</p>
          </div>
          
          <form onSubmit={handleLogin} className={styles.loginForm}>
            {error && <div className={styles.errorMessage}>{error}</div>}
            <div className={styles.formGroup}>
              <label htmlFor="identifier">CPF ou CNPJ</label>
              <input
                type="text"
                id="identifier"
                placeholder="000.000.000-00"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div className={styles.formGroup}>
              <label htmlFor="password">Senha</label>
              <input
                type="password"
                id="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <button type="submit" className={styles.loginButton} disabled={loading}>
              {loading ? 'Validando...' : 'Entrar no Portal'}
            </button>
          </form>
          
          <div className={styles.loginFooter}>
            <a href="#">Esqueceu sua senha?</a>
          </div>
        </div>
      </main>
    </div>
  );
}
