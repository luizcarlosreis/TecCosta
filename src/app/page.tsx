import { loginAction } from '@/app/actions/auth';

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
    
    const formData = new FormData();
    formData.append('identifier', identifier);
    formData.append('password', password);

    const result = await loginAction(formData);
    
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <Image 
          src="/login-bg.png" 
          alt="TecCosta Background" 
          fill 
          style={{ objectFit: 'cover' }}
          priority
        />
        <div className="bg-overlay"></div>
      </div>
      
      <main className="login-main animate-fade-in">
        <div className="login-card glass">
          <div className="login-header">
            <div className="logo-wrapper">
              <Image src="/logo.png" alt="TecCosta Logo" width={180} height={100} style={{ objectFit: 'contain' }} />
            </div>
            <h1>Bem-vindo ao Portal</h1>
            <p>Acesse com seu CPF ou CNPJ</p>
          </div>
          
          <form onSubmit={handleLogin} className="login-form">
            {error && <div className="error-message">{error}</div>}
            <div className="form-group">
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
            
            <div className="form-group">
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
            
            <button type="submit" className="login-button" disabled={loading}>
              {loading ? 'Validando...' : 'Entrar no Portal'}
            </button>
          </form>
          
          <div className="login-footer">
            <a href="#">Esqueceu sua senha?</a>
          </div>
        </div>
      </main>

      <style jsx>{`
        .login-container {
          position: relative;
          width: 100vw;
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }

        .login-background {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: -1;
        }

        .bg-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, rgba(0, 51, 102, 0.8) 0%, rgba(255, 102, 0, 0.4) 100%);
        }

        .login-main {
          width: 100%;
          max-width: 450px;
          padding: 20px;
          z-index: 1;
        }

        .login-card {
          padding: 40px;
          border-radius: var(--border-radius);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          text-align: center;
        }

        .login-header h1 {
          font-size: 1.8rem;
          color: var(--primary-color);
          margin: 20px 0 8px;
          font-weight: 700;
        }

        .login-header p {
          color: var(--text-secondary);
          margin-bottom: 32px;
          font-size: 0.95rem;
        }

        .logo-wrapper {
          display: flex;
          justify-content: center;
          margin-bottom: 10px;
        }

        .login-form {
          text-align: left;
        }

        .error-message {
          background: #fee2e2;
          color: #b91c1c;
          padding: 10px;
          border-radius: 6px;
          margin-bottom: 20px;
          font-size: 0.875rem;
          font-weight: 600;
          border: 1px solid #fecaca;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 8px;
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--text-primary);
        }

        .form-group input {
          width: 100%;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: rgba(255, 255, 255, 0.8);
          font-size: 1rem;
          transition: all var(--transition-speed);
        }

        .form-group input:focus {
          outline: none;
          border-color: var(--primary-color);
          box-shadow: 0 0 0 3px rgba(0, 51, 102, 0.1);
          background: white;
        }

        .login-button {
          width: 100%;
          padding: 14px;
          background-color: var(--primary-color);
          color: white;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: 700;
          margin-top: 10px;
          transition: all var(--transition-speed);
          box-shadow: 0 4px 6px rgba(0, 51, 102, 0.2);
        }

        .login-button:hover {
          background-color: var(--primary-light);
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(0, 51, 102, 0.3);
        }

        .login-button:active {
          transform: translateY(0);
        }

        .login-footer {
          margin-top: 24px;
          font-size: 0.875rem;
        }

        .login-footer a {
          color: var(--primary-color);
          font-weight: 600;
          transition: color 0.2s;
        }

        .login-footer a:hover {
          color: var(--secondary-color);
        }
      `}</style>
    </div>
  );
}
