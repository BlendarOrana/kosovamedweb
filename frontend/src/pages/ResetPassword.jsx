import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useUserStore } from "../stores/useUserStore";
import { Lock } from "lucide-react"; // Assuming you have lucide-react or generic icon

const ResetPassword = () => {
  const { id, token } = useParams(); // Get data from URL
  const navigate = useNavigate();
  const { resetPassword, loading } = useUserStore(); // Use Zustand

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Fjalëkalimet nuk përputhen");
      return;
    }

    if (password.length < 6) {
      setError("Fjalëkalimi duhet të ketë të paktën 6 karaktere");
      return;
    }

    // Call the store action
    const success = await resetPassword(id, token, password);

    if (success) {
      // Redirect to login after successful reset
      navigate("/");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl overflow-hidden border border-slate-200">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-blue-100 mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">
              Rivendos Fjalëkalimin
            </h2>
            <p className="text-slate-500 mt-2 text-sm">
              Shkruani fjalëkalimin tuaj të ri më poshtë
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Fjalëkalimi i Ri
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Konfirmo Fjalëkalimin
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="text-red-500 text-sm bg-red-50 p-3 rounded-lg text-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-2.5 px-4 rounded-lg text-white font-medium transition-all
                ${loading 
                  ? "bg-blue-400 cursor-not-allowed" 
                  : "bg-blue-600 hover:bg-blue-700 active:transform active:scale-95 shadow-md hover:shadow-lg"
                }`}
            >
              {loading ? "Duke procesuar..." : "Ndrysho Fjalëkalimin"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;