import { useNavigate } from "react-router-dom";
import { auth } from "../lib/firebase";
import { LogOut } from "lucide-react";
import { logActivity } from "../lib/activity-logger";

export function Header() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logActivity("auth.logout", "User signed out");
    await auth.signOut();
    navigate("/login");
  };

  return (
    <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-4 lg:gap-8">
            <div className="flex items-center gap-3">
              <img src="/simvana-logo.png" alt="Simvana Logo" className="w-9 h-9 rounded-xl shadow-sm" />
              <div className="hidden lg:block">
                <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Simvana</h1>
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">
                  Digital Agency
                </p>
              </div>
            </div>

            <div className="hidden lg:block w-px h-8 bg-slate-200 dark:bg-slate-700" />

            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <div className="w-8 h-8 rounded-full bg-royal-100 dark:bg-royal-900/50 text-royal-700 dark:text-royal-300 flex items-center justify-center font-bold text-xs ring-2 ring-white dark:ring-slate-900">
                VW
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none">
                  Client: Vinyl Wraps Toronto
                </p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500">
                    Voice Agent Ready
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center px-3 py-2 text-sm font-medium rounded-md text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
