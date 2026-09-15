import { Dialog } from "@radix-ui/react-dialog";
import {
  X,
  Phone,
  FileText,
  Music,
  ArrowRightLeft,
  Voicemail,
  UserRound,
} from "lucide-react";
import { formatDuration, formatOutcome, formatPhoneNumber } from "../lib/utils";
import type { DashboardCall } from "../lib/retell";
import { logActivity } from "../lib/activity-logger";

interface CallDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  call: DashboardCall | null;
}

function outcomeStyles(outcome: string | null) {
  if (outcome === "transferred_to_team") return "bg-emerald-50 text-emerald-700 border-emerald-100";
  if (outcome === "owner_voicemail_left") return "bg-amber-50 text-amber-800 border-amber-100";
  if (outcome === "transfer_failed_followup") return "bg-rose-50 text-rose-700 border-rose-100";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

export function CallDetailModal({ isOpen, onClose, call }: CallDetailModalProps) {
  if (!call) return null;

  const handleRecordingPlay = async () => {
    await logActivity("recording.played", "Played call recording", {
      entityType: "call",
      entityId: call.id,
      metadata: {
        phoneNumber: call.phoneNumber || null,
        recordingUrl: call.recordingUrl || null,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 text-left">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
            onClick={onClose}
          />

          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
            <div className="flex-none p-6 bg-royal-900 text-white flex justify-between items-start">
              <div className="flex items-center gap-4">
                <span className="p-3 rounded-xl bg-white/10 backdrop-blur-md border border-white/20">
                  <Phone className="w-8 h-8" />
                </span>
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">
                    {formatPhoneNumber(call.phoneNumber)}
                  </h2>
                  <div className="flex items-center gap-3 text-royal-100 text-sm mt-1.5 flex-wrap">
                    <p className="capitalize">{call.direction}</p>
                    <span className="opacity-40">|</span>
                    <p>{call.startTime ? call.startTime.toLocaleString() : "Pending"}</p>
                    <span className="opacity-40">|</span>
                    <p>{formatDuration(call.durationMs)}</p>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="w-6 h-6 opacity-80" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950">
              <div className="p-6 space-y-6">
                <div className="grid sm:grid-cols-3 gap-3">
                  <div className={`rounded-xl border px-4 py-3 ${outcomeStyles(call.outcome)}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">Outcome</p>
                    <p className="text-sm font-semibold capitalize mt-1">{formatOutcome(call.outcome)}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sentiment</p>
                    <p className="text-sm font-semibold capitalize mt-1">{call.sentiment || "—"}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Owner requested</p>
                    <p className="text-sm font-semibold mt-1 flex items-center gap-1.5">
                      <UserRound className="w-3.5 h-3.5 text-royal-600" />
                      {call.ownerRequested ? "Yes" : "No"}
                    </p>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Call Overview
                  </h3>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <p>
                      <span className="font-semibold">Phone:</span> {formatPhoneNumber(call.phoneNumber)}
                    </p>
                    <p>
                      <span className="font-semibold">Status:</span>{" "}
                      <span className="capitalize">{call.status.replaceAll("_", " ")}</span>
                    </p>
                    <p>
                      <span className="font-semibold">Start:</span>{" "}
                      {call.startTime ? call.startTime.toLocaleString() : "Pending"}
                    </p>
                    <p>
                      <span className="font-semibold">End:</span>{" "}
                      {call.endTime ? call.endTime.toLocaleString() : "In Progress"}
                    </p>
                    <p className="flex items-start gap-2">
                      <ArrowRightLeft className="w-4 h-4 mt-0.5 text-royal-600 shrink-0" />
                      <span>
                        <span className="font-semibold">Transferred to:</span>{" "}
                        {call.transferredToNumber
                          ? formatPhoneNumber(call.transferredToNumber)
                          : "—"}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold">Call successful:</span>{" "}
                      {call.successful === null ? "—" : call.successful ? "Yes" : "No"}
                    </p>
                    {(call.ownerRequested || call.voicemailMessage) && (
                      <p>
                        <span className="font-semibold">Owner email:</span>{" "}
                        {call.emailSent ? "Sent" : "Pending / not sent"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Reason for Calling
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {call.reasonForCalling || "Not captured"}
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3">
                    AI Summary
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    {call.summary}
                  </p>
                </div>

                {call.voicemailMessage && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-6 border border-amber-100 dark:border-amber-900/40">
                    <h3 className="text-sm font-bold text-amber-800 dark:text-amber-200 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Voicemail className="w-4 h-4" />
                      Voicemail Message
                    </h3>
                    <p className="text-sm text-amber-900 dark:text-amber-100 leading-relaxed">
                      {call.voicemailMessage}
                    </p>
                  </div>
                )}

                {call.recordingUrl && (
                  <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 space-y-3">
                    <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                      <Music className="w-4 h-4 text-royal-600" />
                      Recording
                    </h3>
                    <audio
                      controls
                      preload="none"
                      className="w-full"
                      src={call.recordingUrl}
                      onPlay={handleRecordingPlay}
                    />
                    <a
                      href={call.recordingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 py-2 px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                      Open in new tab
                    </a>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-royal-600" />
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">Transcript</h3>
                  </div>
                  <div className="p-6 text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">
                    {call.transcript}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Dialog>
  );
}
