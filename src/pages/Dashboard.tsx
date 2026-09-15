import { useEffect, useMemo, useState } from "react";
import { Header } from "../components/Header";
import { CallDetailModal } from "../components/CallDetailModal";
import {
  Loader2,
  PhoneIncoming,
  Search,
  RefreshCw,
  ArrowRightLeft,
  Voicemail,
  PhoneMissed,
} from "lucide-react";
import { format } from "date-fns";
import { formatDuration, formatOutcome, formatPhoneNumber } from "../lib/utils";
import { fetchDashboardCalls, type DashboardCall } from "../lib/retell";
import { logActivity } from "../lib/activity-logger";

function outcomeBadge(outcome: string | null) {
  if (outcome === "transferred_to_team") {
    return "bg-emerald-50 text-emerald-700 border-emerald-100";
  }
  if (outcome === "owner_voicemail_left") {
    return "bg-amber-50 text-amber-800 border-amber-100";
  }
  if (outcome === "transfer_failed_followup") {
    return "bg-rose-50 text-rose-700 border-rose-100";
  }
  return "bg-slate-100 text-slate-600 border-slate-200";
}

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [calls, setCalls] = useState<DashboardCall[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCall, setSelectedCall] = useState<DashboardCall | null>(null);

  const loadCalls = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const rows = await fetchDashboardCalls(100);
      setCalls(rows);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load calls");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCalls();
  }, []);

  useEffect(() => {
    const key = "audit_dashboard_viewed";
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    logActivity("dashboard.viewed", "Opened Vinyl Wraps Toronto voice dashboard");
  }, []);

  const filteredCalls = useMemo(() => {
    const search = searchQuery.toLowerCase().trim();
    if (!search) return calls;

    return calls.filter((call) => {
      return (
        call.phoneNumber.toLowerCase().includes(search) ||
        (call.summary || "").toLowerCase().includes(search) ||
        (call.reasonForCalling || "").toLowerCase().includes(search) ||
        (call.outcome || "").toLowerCase().includes(search) ||
        (call.voicemailMessage || "").toLowerCase().includes(search)
      );
    });
  }, [calls, searchQuery]);

  const transferredCount = filteredCalls.filter((c) => c.outcome === "transferred_to_team").length;
  const voicemailCount = filteredCalls.filter((c) => c.outcome === "owner_voicemail_left").length;
  const failedTransferCount = filteredCalls.filter((c) => c.outcome === "transfer_failed_followup").length;

  const groupedByMonth = useMemo(() => {
    const groups = new Map<string, DashboardCall[]>();
    filteredCalls.forEach((call) => {
      const key = call.startTime ? format(call.startTime, "MMMM yyyy") : "Unknown Date";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(call);
    });
    return Array.from(groups.entries());
  }, [filteredCalls]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Voice Agent Dashboard</h2>
            <p className="text-sm text-slate-500 mt-1">
              Inbound receptionist (+1 647-931-6932) — transfers, owner voicemail emails, and call playback.
            </p>
          </div>
          <button
            onClick={() => loadCalls(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 self-start px-3 py-2 rounded-lg border border-slate-200 bg-white text-sm font-medium hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
              <PhoneIncoming className="w-3.5 h-3.5 text-royal-600" />
              Total Calls
            </p>
            <p className="text-2xl font-bold mt-1">{filteredCalls.length}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
              <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
              Transferred
            </p>
            <p className="text-2xl font-bold mt-1">{transferredCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
              <Voicemail className="w-3.5 h-3.5 text-amber-600" />
              Owner Voicemail
            </p>
            <p className="text-2xl font-bold mt-1">{voicemailCount}</p>
          </div>
          <div className="bg-white dark:bg-slate-900 px-5 py-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
            <p className="text-xs text-slate-400 font-semibold uppercase flex items-center gap-1.5">
              <PhoneMissed className="w-3.5 h-3.5 text-rose-600" />
              Transfer Failed
            </p>
            <p className="text-2xl font-bold mt-1">{failedTransferCount}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <h3 className="font-semibold text-slate-900 dark:text-white flex items-center gap-2">
              <PhoneIncoming className="w-4 h-4 text-royal-600" />
              Incoming Calls
            </h3>
            <div className="relative w-full max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search phone, reason, outcome..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-9 pr-3 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 w-full"
              />
            </div>
          </div>

          {loading ? (
            <div className="p-16 flex flex-col items-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-2 text-royal-600" />
              <p>Loading calls...</p>
            </div>
          ) : error ? (
            <div className="p-16 text-center text-rose-600 space-y-3">
              <p>{error}</p>
              <button
                onClick={() => loadCalls()}
                className="text-sm font-medium text-royal-600 hover:underline"
              >
                Try again
              </button>
            </div>
          ) : filteredCalls.length === 0 ? (
            <div className="p-16 text-center text-slate-500 space-y-2">
              <p className="font-medium">No calls yet.</p>
              <p className="text-sm max-w-md mx-auto">
                Once the Vinyl Wraps Toronto Receptionist takes a call, recordings, transcripts, and
                outcomes will show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-6 p-4">
              {groupedByMonth.map(([monthLabel, monthCalls]) => (
                <div
                  key={monthLabel}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto"
                >
                  <div className="px-4 py-3 bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                    <h4 className="text-sm font-semibold">{monthLabel}</h4>
                  </div>
                  <table className="w-full text-left border-collapse min-w-[900px]">
                    <thead>
                      <tr className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Time</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Caller</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Reason</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Outcome</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Summary</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Duration</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Recording</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {monthCalls.map((call) => (
                        <tr
                          key={call.id}
                          onClick={() => setSelectedCall(call)}
                          className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40"
                        >
                          <td className="px-6 py-4 text-sm text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {call.startTime ? format(call.startTime, "MMM d, yyyy h:mm a") : "Pending"}
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-sm font-medium">{formatPhoneNumber(call.phoneNumber)}</p>
                            {call.ownerRequested && (
                              <p className="text-[11px] text-amber-700 font-medium mt-0.5">Asked for owner</p>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-[180px] truncate">
                            {call.reasonForCalling || "—"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded border capitalize ${outcomeBadge(call.outcome)}`}
                            >
                              {formatOutcome(call.outcome)}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-300 max-w-md truncate">
                            {call.summary}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {formatDuration(call.durationMs)}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-xs font-medium px-2 py-1 rounded ${
                                call.recordingUrl
                                  ? "bg-royal-50 text-royal-700"
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {call.recordingUrl ? "Available" : "None"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <CallDetailModal
        isOpen={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        call={selectedCall}
      />
    </div>
  );
}
