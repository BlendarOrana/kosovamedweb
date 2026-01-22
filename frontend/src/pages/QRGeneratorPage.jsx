import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import * as OTPAuth from "otpauth";

function QRGeneratorPage() {
  // --- Configuration ---
  const BRAND_COLOR = "#09a8fa";
  const TOTP_SECRET = "JBSWY3DPEHPK3PXP"; 
  const ADMIN_PASSWORD = "Kosovamed.2024";
  
  // !!! PASTE YOUR APP LINKS HERE !!!
  // --- Official Badge Image URLs (Standard CDNs) ---
  const APP_STORE_BADGE = "https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg";
  const PLAY_STORE_BADGE = "https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg";

  // --- State ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  
  const [currentCode, setCurrentCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(300);
  const [qrValue, setQrValue] = useState("");

  // --- Login Logic ---
  const handleLogin = (e) => {
    e.preventDefault();
    if (passwordInput === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError("");
    } else {
      setLoginError("Fjalëkalimi i pasaktë!");
      setPasswordInput("");
    }
  };

  // --- TOTP Logic ---
  useEffect(() => {
    if (!isAuthenticated) return;

    const totp = new OTPAuth.TOTP({
      issuer: "Diell",
      label: "Attendance",
      algorithm: "SHA1",
      digits: 6,
      period: 300,
      secret: OTPAuth.Secret.fromBase32(TOTP_SECRET),
    });

    const generateCode = () => {
      const code = totp.generate();
      setCurrentCode(code);

      const qrData = JSON.stringify({
        code: code,
        timestamp: Date.now(),
        issuer: "Diell",
      });
      setQrValue(qrData);
    };

    const updateTimer = () => {
      const now = Math.floor(Date.now() / 1000);
      const remaining = 300 - (now % 300);
      setTimeLeft(remaining);
    };

    generateCode();
    updateTimer();

    const codeInterval = setInterval(generateCode, 300000); 
    const timerInterval = setInterval(updateTimer, 1000);

    return () => {
      clearInterval(codeInterval);
      clearInterval(timerInterval);
    };
  }, [isAuthenticated]);

  // --- Helpers ---
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (timeLeft / 300) * 100;

  // --- Render ---
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 relative p-4 font-sans">
      
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 pointer-events-none" />

      <div className="z-10 w-full max-w-md flex flex-col items-center">
        
        {/* LOGO */}
        <div className="mb-8">
           <img 
              src="/Kosovamed.webp" 
              alt="Kosovamed Logo" 
              className="h-20 w-auto object-contain drop-shadow-lg"
           />
        </div>

        {/* MAIN CARD */}
        <div className="w-full bg-slate-800/80 backdrop-blur-md border border-slate-700 p-8 rounded-3xl shadow-2xl">
          
          {!isAuthenticated ? (
            // ================= LOGIN FORM =================
            <form onSubmit={handleLogin} className="flex flex-col space-y-6">
              <div className="text-center">
                <h2 className="text-xl font-semibold text-white">Paneli i Administratorit</h2>
                <p className="text-slate-400 text-sm mt-1">Identifikohuni për të gjeneruar kodin</p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-[#09a8fa] uppercase tracking-wider ml-1">
                  Fjalëkalimi
                </label>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-900/50 border border-slate-600 focus:border-[#09a8fa] text-white rounded-xl px-4 py-3 outline-none transition-all duration-200 focus:ring-2 focus:ring-[#09a8fa]/20 placeholder-slate-600"
                />
                {loginError && (
                  <p className="text-red-400 text-xs ml-1 font-medium">{loginError}</p>
                )}
              </div>

              <button
                type="submit"
                className="w-full text-white font-bold py-3.5 rounded-xl shadow-lg transition-all duration-200 hover:brightness-110 active:scale-[0.98]"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Hyr
              </button>
            </form>
          ) : (
            // ================= QR DISPLAY =================
            <div className="animate-in fade-in zoom-in duration-300">
              <div className="text-center mb-6">
                <h1 className="text-xl font-bold text-white">Skanoni Qr Kodin</h1>
                <p className="text-slate-400 text-xs mt-1">Skanoni qr kodin me aplikacionin e Kosovamed</p>
              </div>

              {/* QR Container */}
              <div className="bg-white p-4 rounded-2xl mb-8 shadow-inner flex justify-center items-center mx-auto max-w-[280px]">
                {qrValue && (
                  <QRCodeSVG
                    value={qrValue}
                    size={220}
                    level="H"
                    includeMargin={true}
                    fgColor={BRAND_COLOR} 
                    bgColor={"#ffffff"}
                  />
                )}
              </div>

    

              <button 
                onClick={() => setIsAuthenticated(false)}
                className="text-xs text-slate-500 hover:text-[#09a8fa] transition-colors w-full text-center py-2"
              >
                Dilni nga sesioni
              </button>
            </div>
          )}
        </div>

        {/* ================= OFFICIAL APP STORE BADGES ================= */}
        <div className="mt-10 flex flex-col items-center w-full">
            <p className="text-slate-500 text-[10px] mb-4 font-bold uppercase tracking-widest opacity-80">
                Shkarkoni aplikacionin
            </p>
            
            <div className="flex flex-wrap justify-center items-center gap-4">
                {/* Apple Store Badge */}
                <a 
           
                    rel="noreferrer"
                    className="transition-transform "
                >
                    <img 
                        src={APP_STORE_BADGE} 
                        alt="Download on the App Store" 
                        className="h-10 w-auto"
                    />
                </a>

                {/* Google Play Badge */}
                <a 
                    
                    rel="noreferrer"
                    className="transition-transform  "
                >
                    <img 
                        src={PLAY_STORE_BADGE} 
                        alt="Get it on Google Play" 
                        className="h-10 w-auto"
                    />
                </a>
            </div>
        </div>

        {/* Footer Copyright */}
        <div className="mt-12 text-center opacity-30">
           <p className="text-[10px] text-slate-400">© 2024 Kosovamed. All rights reserved.</p>
        </div>

      </div>
    </div>
  );
}

export default QRGeneratorPage;