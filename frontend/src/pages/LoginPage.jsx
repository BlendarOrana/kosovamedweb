import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import LoadingSpinner from "../components/LoadingSpinner";

const sanitizeInput = (input) => {
  if (!input) return '';
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/['"]/g, '')
    .replace(/[;]/g, '')
    .replace(/--/g, '')
    .replace(/\/\*/g, '')
    .replace(/\*\//g, '')
    .replace(/\\/g, '');
};

const sanitizeName = (name) => {
  if (!name) return '';
  return sanitizeInput(name).substring(0, 50);
};

const sanitizePassword = (password) => {
  if (!password) return '';
  return password
    .trim()
    .replace(/[<>]/g, '')
    .substring(0, 128);
};

const validatePassword = (password) => {
  return password && password.length <= 128;
};

const containsSuspiciousPatterns = (input) => {
  const suspiciousPatterns = [
    /union\s+select/i,
    /insert\s+into/i,
    /delete\s+from/i,
    /drop\s+table/i,
    /update\s+set/i,
    /script\s*>/i,
    /javascript:/i,
    /on\w+\s*=/i,
    /exec\s*\(/i,
    /eval\s*\(/i
  ];
  return suspiciousPatterns.some(pattern => pattern.test(input));
};

const TARGET_KEY = "countdown_target_7d";
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function useCountdown() {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, mins: 0, secs: 0 });
  const [expired, setExpired] = useState(false);
  const targetRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem(TARGET_KEY);
    if (stored) {
      targetRef.current = parseInt(stored, 10);
    } else {
      const t = Date.now() + SEVEN_DAYS_MS;
      targetRef.current = t;
      localStorage.setItem(TARGET_KEY, String(t));
    }

    const tick = () => {
      const diff = targetRef.current - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ days: 0, hours: 0, mins: 0, secs: 0 });
        return;
      }
      const totalSecs = Math.floor(diff / 1000);
      setTimeLeft({
        days: Math.floor(totalSecs / 86400),
        hours: Math.floor((totalSecs % 86400) / 3600),
        mins: Math.floor((totalSecs % 3600) / 60),
        secs: totalSecs % 60,
      });
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return { timeLeft, expired };
}

function CountdownTimer() {
  const { timeLeft, expired } = useCountdown();
  const pad = (n) => String(n).padStart(2, "0");

  const units = [
    { value: timeLeft.days, label: "Ditë" },
    { value: timeLeft.hours, label: "Orë" },
    { value: timeLeft.mins, label: "Minuta" },
    { value: timeLeft.secs, label: "Sekonda" },
  ];

  return (
    <div className="mb-6 bg-gray-700/50 border border-gray-600 rounded-xl p-4">
      <p className="text-xs font-semibold text-gray-400 text-center uppercase tracking-widest mb-3">
        Koha e mbetur
      </p>
      {expired ? (
        <p className="text-center text-cyan-400 font-medium">Koha ka mbaruar!</p>
      ) : (
        <div className="grid grid-cols-4 gap-2">
          {units.map(({ value, label }) => (
            <div
              key={label}
              className="bg-gray-800 border border-gray-600 rounded-lg py-2 flex flex-col items-center"
            >
              <span className="text-2xl font-bold text-cyan-400 tabular-nums">
                {pad(value)}
              </span>
              <span className="text-xs text-gray-400 mt-1">{label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const { login, loading, error, user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (name || password) setValidationErrors({});
  }, [name, password]);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") navigate("/admin");
      else navigate("/");
    }
  }, [user, navigate]);

  const handleNameChange = (e) => setName(e.target.value);

  const handlePasswordChange = (e) => {
    const rawValue = e.target.value;
    if (containsSuspiciousPatterns(rawValue)) {
      setValidationErrors(prev => ({ ...prev, password: "Format i pavlefshëm i fjalëkalimit" }));
      return;
    }
    setPassword(sanitizePassword(rawValue));
  };

  const validateForm = () => {
    const errors = {};
    if (!password) {
      errors.password = "Fjalëkalimi kërkohet";
    } else if (!validatePassword(password)) {
      errors.password = "Fjalëkalimi duhet të jetë midis 6 dhe 128 karaktereve";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    const sanitizedData = {
      name: sanitizeName(name),
      password: sanitizePassword(password),
    };
    if (!sanitizedData.name || !sanitizedData.password) {
      setValidationErrors({ general: "Të dhëna të pavlefshme" });
      return;
    }
    await login(sanitizedData.name, sanitizedData.password);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-cyan-500/30">

        <div className="mb-8 w-full max-w-lg">
          <a href="/" aria-label="Kthehu në faqen kryesore">
            <img src="/Kosovamed.webp" alt="Kosovamed Logo" className="mx-auto h-14 w-auto" />
          </a>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-3xl font-bold text-white">Admin panel</h1>
        </div>

        {/* Countdown Timer */}
        <CountdownTimer />

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="name">
              Emri i përdoruesit
            </label>
            <input
              id="name"
              type="text"
              className={`w-full px-4 py-3 bg-gray-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-200 placeholder-gray-400 ${
                validationErrors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:border-cyan-500 focus:ring-cyan-500'
              }`}
              value={name}
              onChange={handleNameChange}
              placeholder="Emri juaj"
              required
              maxLength={50}
              autoComplete="username"
              spellCheck="false"
            />
            {validationErrors.name && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
              Fjalëkalimi
            </label>
            <input
              id="password"
              type="password"
              className={`w-full px-4 py-3 bg-gray-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-200 ${
                validationErrors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-600 focus:border-cyan-500 focus:ring-cyan-500'
              }`}
              value={password}
              onChange={handlePasswordChange}
              required
              maxLength={128}
              autoComplete="current-password"
              spellCheck="false"
            />
            {validationErrors.password && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>

          {validationErrors.security && (
            <div role="alert" className="p-3 bg-red-500/10 border-l-4 border-red-500 text-red-400 text-sm rounded-md">
              <p>{validationErrors.security}</p>
            </div>
          )}

          {validationErrors.general && (
            <div role="alert" className="p-3 bg-red-500/10 border-l-4 border-red-500 text-red-400 text-sm rounded-md">
              <p>{validationErrors.general}</p>
            </div>
          )}

          {error && (
            <div role="alert" className="p-3 bg-red-500/10 border-l-4 border-red-500 text-red-400 text-sm rounded-md">
              <p>{error}</p>
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex justify-center items-center shadow-lg"
            disabled={loading}
          >
            {loading ? <LoadingSpinner size="sm" /> : "Identifikohu"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginPage;