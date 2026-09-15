import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export type CallOutcome =
  | "transferred_to_team"
  | "owner_voicemail_left"
  | "transfer_failed_followup"
  | string;

export type RetellCall = {
  call_id: string;
  agent_id?: string;
  call_type?: string;
  call_status?: string;
  start_timestamp?: number;
  end_timestamp?: number;
  duration_ms?: number;
  from_number?: string;
  to_number?: string;
  direction?: string;
  recording_url?: string;
  recording_multi_channel_url?: string;
  public_log_url?: string;
  transcript?: string;
  call_analysis?: {
    call_summary?: string;
    call_successful?: boolean;
    user_sentiment?: string;
    custom_analysis_data?: Record<string, unknown>;
  };
  collected_dynamic_variables?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
};

export type DashboardCall = {
  id: string;
  phoneNumber: string;
  startTime: Date | null;
  endTime: Date | null;
  durationMs: number | null;
  status: string;
  direction: string;
  summary: string;
  sentiment: string | null;
  successful: boolean | null;
  outcome: CallOutcome | null;
  reasonForCalling: string | null;
  ownerRequested: boolean;
  voicemailMessage: string | null;
  transferredToNumber: string | null;
  recordingUrl: string | null;
  transcript: string;
  emailSent: boolean;
  raw?: RetellCall;
};

function fromMs(ms?: number): Date | null {
  if (!ms) return null;
  return new Date(ms);
}

function fromTimestamp(value?: Timestamp | null): Date | null {
  if (!value?.toDate) return null;
  return value.toDate();
}

export function mapRetellCall(call: RetellCall): DashboardCall {
  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis_data || {};
  const dyn = {
    ...(call.retell_llm_dynamic_variables || {}),
    ...(call.collected_dynamic_variables || {}),
  };

  const phone =
    call.direction === "outbound"
      ? call.to_number || call.from_number || ""
      : call.from_number || call.to_number || "";

  return {
    id: call.call_id,
    phoneNumber: phone,
    startTime: fromMs(call.start_timestamp),
    endTime: fromMs(call.end_timestamp),
    durationMs: call.duration_ms ?? null,
    status: call.call_status || "unknown",
    direction: call.direction || call.call_type || "inbound",
    summary: analysis.call_summary || "No summary yet",
    sentiment: analysis.user_sentiment || null,
    successful: typeof analysis.call_successful === "boolean" ? analysis.call_successful : null,
    outcome:
      (custom.call_outcome as CallOutcome) ||
      (dyn.call_outcome as CallOutcome) ||
      null,
    reasonForCalling:
      (custom.reason_for_calling as string) ||
      (dyn.reason_for_calling as string) ||
      null,
    ownerRequested: Boolean(custom.owner_requested ?? dyn.owner_requested),
    voicemailMessage:
      (custom.voicemail_message as string) ||
      (dyn.voicemail_message as string) ||
      null,
    transferredToNumber:
      (custom.transferred_to_number as string) ||
      (dyn.transferred_to_number as string) ||
      null,
    recordingUrl: call.recording_url || call.recording_multi_channel_url || null,
    transcript: call.transcript || "No transcript available.",
    emailSent: false,
    raw: call,
  };
}

export function mapFirestoreCall(id: string, data: Record<string, any>): DashboardCall {
  return {
    id,
    phoneNumber: data.phoneNumber || "",
    startTime: fromTimestamp(data.callStartTime) || fromMs(data.start_timestamp),
    endTime: fromTimestamp(data.callEndTime) || fromMs(data.end_timestamp),
    durationMs: data.durationMs ?? data.duration_ms ?? null,
    status: data.status || "unknown",
    direction: data.direction || "inbound",
    summary: data.summary || "No summary yet",
    sentiment: data.sentiment || null,
    successful: typeof data.successful === "boolean" ? data.successful : null,
    outcome: data.callOutcome || null,
    reasonForCalling: data.reasonForCalling || null,
    ownerRequested: Boolean(data.ownerRequested),
    voicemailMessage: data.voicemailMessage || null,
    transferredToNumber: data.transferredToNumber || null,
    recordingUrl: data.recordingUrl || null,
    transcript: data.transcript || "No transcript available.",
    emailSent: Boolean(data.emailSent),
  };
}

/** Primary source: Firestore (populated by retellWebhook). */
export async function fetchCallsFromFirestore(max = 100): Promise<DashboardCall[]> {
  const q = query(collection(db, "calls"), orderBy("callStartTime", "desc"), limit(max));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => mapFirestoreCall(docSnap.id, docSnap.data()));
}

/** Fallback: live Retell list via local/Vercel proxy. */
export async function fetchDashboardCallsFromRetell(callLimit = 50): Promise<DashboardCall[]> {
  const response = await fetch(`/api/calls?limit=${callLimit}`);
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error || "Failed to load calls from Retell");
  }
  const data = await response.json();
  const list: RetellCall[] = Array.isArray(data) ? data : data.calls || [];
  return list.map(mapRetellCall);
}

export async function fetchDashboardCalls(max = 100): Promise<DashboardCall[]> {
  try {
    const fromFs = await fetchCallsFromFirestore(max);
    if (fromFs.length > 0) return fromFs;
  } catch (error) {
    console.warn("Firestore calls unavailable, falling back to Retell:", error);
  }

  try {
    return await fetchDashboardCallsFromRetell(max);
  } catch (error) {
    console.warn("Retell fallback failed:", error);
    return [];
  }
}
