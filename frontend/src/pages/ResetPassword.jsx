import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import LoadingSpinner from "../components/LoadingSpinner";

// Optional: You can reuse the sanitization function if you want strictly consistent input cleaning
const sanitizePassword = (password) => {
  if (!password) return '';
  return password.trim().replace(/[<>]/g, '').substring(0, 128);
};

const ResetPassword = () => {
  const { id, token } = useParams(); // Get data from URL
  const navigate = useNavigate();
  const { resetPassword, loading } = useUserStore();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState({});

  // Clear errors when user types
  useEffect(() => {
    if (password || confirmPassword) {
      setError("");
      setValidationErrors({});
    }
  }, [password, confirmPassword]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setValidationErrors({});

    const sanitizedPass = sanitizePassword(password);
    const sanitizedConfirm = sanitizePassword(confirmPassword);

    // Local Validation Logic
    if (sanitizedPass.length < 6) {
      setValidationErrors({ password: "Fjalëkalimi duhet të ketë të paktën 6 karaktere" });
      return;
    }

    if (sanitizedPass !== sanitizedConfirm) {
      setValidationErrors({ confirm: "Fjalëkalimet nuk përputhen" });
      setError("Fjalëkalimet nuk përputhen");
      return;
    }

    // Call the store action
    const success = await resetPassword(id, token, sanitizedPass);

    if (success) {
      // Redirect to login after successful reset
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      
      {/* Reset Password Card */}
      <div className="bg-gray-800/80 backdrop-blur-sm p-8 rounded-2xl shadow-2xl w-full max-w-md border border-cyan-500/30">
        
        {/* Logo Integration */}
        <div className="mb-8 w-full max-w-lg">
          <a href="/" aria-label="Kthehu në faqen kryesore">
            <img 
              src="/Kosovamed.webp" 
              alt="Kosovamed Logo" 
              className="mx-auto h-14 w-auto"
            />
          </a>
        </div>
        
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white">Rivendos Fjalëkalimin</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Shkruani fjalëkalimin tuaj të ri më poshtë
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="password">
              Fjalëkalimi i Ri
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
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              maxLength={128}
              autoComplete="new-password"
            />
            {validationErrors.password && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2" htmlFor="confirmPassword">
              Konfirmo Fjalëkalimin
            </label>
            <input
              id="confirmPassword"
              type="password"
              className={`w-full px-4 py-3 bg-gray-700 text-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-opacity-75 transition duration-200 ${
                validationErrors.confirm || error
                  ? 'border-red-500 focus:ring-red-500' 
                  : 'border-gray-600 focus:border-cyan-500 focus:ring-cyan-500'
              }`}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              required
              maxLength={128}
              autoComplete="new-password"
            />
            {validationErrors.confirm && (
              <p className="text-red-500 text-sm mt-1">{validationErrors.confirm}</p>
            )}
          </div>

          {/* General Error Alert Box */}
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
            {loading ? <LoadingSpinner size="sm" /> : "Ndrysho Fjalëkalimin"}
          </button>
        </form>

      </div>
    </div>
  );
};

export default ResetPassword;