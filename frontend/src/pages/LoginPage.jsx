import { useState, useEffect, useRef } from "react";

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

export default function ComingSoon() {
  const { timeLeft, expired } = useCountdown();
  const pad = (n) => String(n).padStart(2, "0");

  const units = [
    { value: timeLeft.days, label: "Ditë" },
    { value: timeLeft.hours, label: "Orë" },
    { value: timeLeft.mins, label: "Minuta" },
    { value: timeLeft.secs, label: "Sekonda" },
  ];

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center px-4">

      <div className="mb-10">
        <img src="/Kosovamed.webp" alt="Kosovamed Logo" className="h-16 w-auto mx-auto" />
      </div>

      <p className="text-white text-2xl md:text-3xl font-bold mb-10 text-center">
        Pom doket po shkojme viral 😊
      </p>

      {expired ? (
        <p className="text-cyan-400 text-3xl font-bold">Koha ka mbaruar!</p>
      ) : (
        <div className="grid grid-cols-4 gap-4 md:gap-6 w-full max-w-2xl">
          {units.map(({ value, label }) => (
            <div
              key={label}
              className="bg-gray-800 border border-cyan-500/30 rounded-2xl py-6 md:py-10 flex flex-col items-center shadow-lg"
            >
              <span className="text-5xl md:text-7xl font-bold text-cyan-400 tabular-nums">
                {pad(value)}
              </span>
              <span className="text-sm md:text-base text-gray-400 mt-3 uppercase tracking-widest">
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}