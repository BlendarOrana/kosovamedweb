import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import LoadingSpinner from "../components/LoadingSpinner";

// Note: All validation and sanitization utility functions remain the same.
// They are essential for security and have been kept from your original code.

// Input sanitization utilities
const sanitizeInput = (input) => {
  if (!input) return '';
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove HTML tags
    .replace(/['"]/g, '') // Remove quotes that could be used for SQL injection
    .replace(/[;]/g, '') // Remove semicolons
    .replace(/--/g, '') // Remove SQL comments
    .replace(/\/\*/g, '') // Remove /* comments
    .replace(/\*\//g, '') // Remove */ comments
    .replace(/\\/g, ''); // Remove backslashes
};

const sanitizeName = (name) => {
  if (!name) return '';
  return sanitizeInput(name)
    .replace(/[^a-zA-ZÀ-ÿ\s-']/g, '') // Only allow letters, spaces, hyphens, and apostrophes
    .substring(0, 50); // Reasonable name length limit
};

const sanitizePassword = (password) => {
  if (!password) return '';
  return password
    .trim()
    .replace(/[<>]/g, '') // Only remove HTML tags, keep other chars for password complexity
    .substring(0, 128); // Reasonable password length limit
};

// Validation utilities
const validateName = (name) => {
  const nameRegex = /^[a-zA-ZÀ-ÿ\s-']{2,50}$/; // Letters, spaces, hyphens, apostrophes, 2-50 chars
  return nameRegex.test(name) && name.length >= 2 && name.length <= 50;
};

const validatePassword = (password) => {
  return password && password.length <= 128;
};

// Check for suspicious patterns that might indicate injection attempts
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


function LoginPage() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [validationErrors, setValidationErrors] = useState({});
  const { login, loading, error, user } = useUserStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (name || password) {
      setValidationErrors({});
    }
  }, [name, password]);

  useEffect(() => {
    if (user) {
      if (user.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/");
      }
    }
  }, [user, navigate]);

  const handleNameChange = (e) => {
    const rawValue = e.target.value;
    if (containsSuspiciousPatterns(rawValue)) {
      setValidationErrors(prev => ({ ...prev, name: "Format i pavlefshëm i emrit" }));
      return;
    }
    const sanitizedName = sanitizeName(rawValue);
    setName(sanitizedName);
  };

  const handlePasswordChange = (e) => {
    const rawValue = e.target.value;
    if (containsSuspiciousPatterns(rawValue)) {
      setValidationErrors(prev => ({ ...prev, password: "Format i pavlefshëm i fjalëkalimit" }));
      return;
    }
    const sanitizedPassword = sanitizePassword(rawValue);
    setPassword(sanitizedPassword);
  };

  const validateForm = () => {
    const errors = {};
    if (!name) {
      errors.name = "Emri kërkohet";
    } else if (!validateName(name)) {
      errors.name = "Emri duhet të përmbajë midis 2 dhe 50 karaktereve (vetëm shkronja, hapësira, viza dhe apostrofa)";
    }
    if (!password) {
      errors.password = "Fjalëkalimi kërkohet";
    } else if (!validatePassword(password)) {
      errors.password = "Fjalëkalimi duhet të jetë midis 6 dhe 128 karaktereve";
    }
    if (containsSuspiciousPatterns(name) || containsSuspiciousPatterns(password)) {
      errors.security = "Të dhëna të pavlefshme të zbuluara";
    }
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    const sanitizedData = {
      name: sanitizeName(name),
      password: sanitizePassword(password)
    };
    if (!sanitizedData.name || !sanitizedData.password) {
      setValidationErrors({ general: "Të dhëna të pavlefshme" });
      return;
    }
    if (containsSuspiciousPatterns(sanitizedData.name) || containsSuspiciousPatterns(sanitizedData.password)) {
      setValidationErrors({ security: "Të dhëna të dyshimta të zbuluara" });
      return;
    }
    await login(sanitizedData.name, sanitizedData.password);
  };
  
  // Main container with a dark, professional gradient background.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      
      {/* Login Card */}
      <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-cyan-500/30">
        
        {/* Logo Integration */}
        <div className="mb-8 w-full max-w-lg">
          <a href="/" aria-label="Kthehu në faqen kryesore">
             {/* The path should match where you place the logo in your public folder */}
            <img src="/Kosovamed.webp" alt="Kosovamed Logo" className="mx-auto h-14 w-auto"/>
          </a>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Admin panel</h1>
        </div>
        
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
            className="w-full bg-cyan-500 hover:bg-cyan-600 disabled:bg-cyan-500/50 text-white font-bold py-3 px-4 rounded-lg transition duration-300 flex justify-center items-center shadow-lg "
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