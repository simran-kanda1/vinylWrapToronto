import { initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { setGlobalOptions } from "firebase-functions/v2";
import { onRequest } from "firebase-functions/v2/https";
import { defineString } from "firebase-functions/params";
import * as logger from "firebase-functions/logger";
import nodemailer from "nodemailer";

initializeApp();
setGlobalOptions({ maxInstances: 10, region: "us-central1" });

const db = getFirestore();

const GMAIL_USER = defineString("GMAIL_USER", {
  default: "simrankaurkanda42@gmail.com",
  description: "Gmail address used as SMTP from/to for owner voicemail alerts",
});
const GMAIL_APP_PASSWORD = defineString("GMAIL_APP_PASSWORD", {
  description: "Gmail App Password (not your normal login password)",
});

const DEFAULT_EMAIL = "simrankaurkanda42@gmail.com";
const AGENT_PHONE = "+16479316932";
const AGENT_ID = "agent_7a12089ba145180dc927df2c2d";

type RetellPayload = {
  event?: string;
  call?: Record<string, any>;
};

function extractCustom(call: Record<string, any>) {
  const analysis = call.call_analysis || {};
  const custom = analysis.custom_analysis_data || {};
  const dyn = {
    ...(call.retell_llm_dynamic_variables || {}),
    ...(call.collected_dynamic_variables || {}),
  };

  return {
    summary: analysis.call_summary || "",
    sentiment: analysis.user_sentiment || null,
    successful: typeof analysis.call_successful === "boolean" ? analysis.call_successful : null,
    callOutcome: (custom.call_outcome || dyn.call_outcome || null) as string | null,
    reasonForCalling: (custom.reason_for_calling || dyn.reason_for_calling || null) as string | null,
    ownerRequested: Boolean(custom.owner_requested ?? dyn.owner_requested),
    voicemailMessage: (custom.voicemail_message || dyn.voicemail_message || null) as string | null,
    transferredToNumber: (custom.transferred_to_number || dyn.transferred_to_number || null) as
      | string
      | null,
  };
}

function shouldEmailOwnerVoicemail(fields: ReturnType<typeof extractCustom>): boolean {
  return (
    fields.ownerRequested === true ||
    fields.callOutcome === "owner_voicemail_left" ||
    Boolean(fields.voicemailMessage)
  );
}

async function sendOwnerVoicemailEmail(params: {
  gmailUser: string;
  gmailPass: string;
  callId: string;
  phoneNumber: string;
  fields: ReturnType<typeof extractCustom>;
  recordingUrl: string | null;
  startMs?: number;
}) {
  const { gmailUser, gmailPass, callId, phoneNumber, fields, recordingUrl, startMs } = params;
  const when = startMs
    ? new Date(startMs).toLocaleString("en-CA", { timeZone: "America/Toronto" })
    : "Unknown";

  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: gmailUser,
      pass: gmailPass,
    },
  });

  const subject = `Vinyl Wraps Toronto — Owner voicemail from ${phoneNumber || "unknown caller"}`;
  const text = [
    "Vinyl Wraps Toronto Receptionist left an owner voicemail.",
    "",
    `Caller: ${phoneNumber || "Unknown"}`,
    `When (Toronto): ${when}`,
    `Call ID: ${callId}`,
    `Outcome: ${fields.callOutcome || "n/a"}`,
    `Owner requested: ${fields.ownerRequested ? "Yes" : "No"}`,
    `Reason for calling: ${fields.reasonForCalling || "n/a"}`,
    "",
    "--- Call summary ---",
    fields.summary || "No summary",
    "",
    "--- Voicemail message ---",
    fields.voicemailMessage || "No voicemail text captured",
    "",
    recordingUrl ? `Recording: ${recordingUrl}` : "Recording: not available",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#191919">
      <h2 style="color:#0055FE;margin:0 0 12px">Owner voicemail — Vinyl Wraps Toronto</h2>
      <p style="margin:0 0 16px">Your receptionist agent captured a message for the owner.</p>
      <table style="border-collapse:collapse;width:100%;max-width:560px">
        <tr><td style="padding:6px 0;font-weight:bold">Caller</td><td>${phoneNumber || "Unknown"}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">When (Toronto)</td><td>${when}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Outcome</td><td>${fields.callOutcome || "n/a"}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Owner requested</td><td>${fields.ownerRequested ? "Yes" : "No"}</td></tr>
        <tr><td style="padding:6px 0;font-weight:bold">Reason</td><td>${fields.reasonForCalling || "n/a"}</td></tr>
      </table>
      <h3 style="margin:20px 0 8px;color:#000E2B">Call summary</h3>
      <p style="white-space:pre-wrap;background:#f5f7fb;padding:12px;border-radius:8px">${fields.summary || "No summary"}</p>
      <h3 style="margin:20px 0 8px;color:#000E2B">Voicemail message</h3>
      <p style="white-space:pre-wrap;background:#fff8e8;padding:12px;border-radius:8px;border:1px solid #fde68a">${fields.voicemailMessage || "No voicemail text captured"}</p>
      ${recordingUrl ? `<p style="margin-top:16px"><a href="${recordingUrl}" style="color:#0055FE">Listen to recording</a></p>` : ""}
      <p style="margin-top:24px;font-size:12px;color:#666">Call ID: ${callId}</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"Vinyl Wraps Toronto VA" <${gmailUser}>`,
    to: DEFAULT_EMAIL,
    subject,
    text,
    html,
  });
}

function buildCallDoc(call: Record<string, any>, fields: ReturnType<typeof extractCustom>) {
  const phone =
    call.direction === "outbound"
      ? call.to_number || call.from_number || ""
      : call.from_number || call.to_number || "";

  return {
    callId: call.call_id,
    agentId: call.agent_id || AGENT_ID,
    agentPhone: AGENT_PHONE,
    phoneNumber: phone,
    callStartTime: call.start_timestamp ? Timestamp.fromMillis(call.start_timestamp) : null,
    callEndTime: call.end_timestamp ? Timestamp.fromMillis(call.end_timestamp) : null,
    durationMs: call.duration_ms ?? null,
    status: call.call_status || "unknown",
    direction: call.direction || call.call_type || "inbound",
    summary: fields.summary || "No summary yet",
    sentiment: fields.sentiment,
    successful: fields.successful,
    callOutcome: fields.callOutcome,
    reasonForCalling: fields.reasonForCalling,
    ownerRequested: fields.ownerRequested,
    voicemailMessage: fields.voicemailMessage,
    transferredToNumber: fields.transferredToNumber,
    recordingUrl: call.recording_url || call.recording_multi_channel_url || null,
    transcript: call.transcript || "",
    disconnectionReason: call.disconnection_reason || null,
    updatedAt: FieldValue.serverTimestamp(),
  };
}

/**
 * Retell agent webhook — set URL to:
 * https://us-central1-paolo-96ba8.cloudfunctions.net/retellWebhook
 *
 * Prefer event: call_analyzed (has post-call analysis fields).
 * Also accepts call_ended.
 *
 * Requires Blaze plan (outbound SMTP + Cloud Functions).
 */
export const retellWebhook = onRequest(
  {
    cors: false,
    invoker: "public",
  },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method not allowed");
      return;
    }

    try {
      const payload = (req.body || {}) as RetellPayload;
      const event = payload.event || "";
      const call = payload.call || {};

      if (event !== "call_analyzed" && event !== "call_ended") {
        logger.info(`Ignoring event: ${event || "unknown"}`);
        res.status(200).send("Ignored event type");
        return;
      }

      if (!call.call_id) {
        logger.warn("Webhook missing call.call_id");
        res.status(200).send("Missing call_id");
        return;
      }

      if (call.agent_id && call.agent_id !== AGENT_ID) {
        logger.info(`Ignoring call for other agent: ${call.agent_id}`);
        res.status(200).send("Ignored other agent");
        return;
      }

      const fields = extractCustom(call);
      const callRef = db.collection("calls").doc(call.call_id);
      const existing = await callRef.get();
      const alreadyEmailed = Boolean(existing.data()?.emailSent);

      const doc = buildCallDoc(call, fields);
      await callRef.set(
        {
          ...doc,
          createdAt: existing.exists
            ? existing.data()?.createdAt || FieldValue.serverTimestamp()
            : FieldValue.serverTimestamp(),
          lastEvent: event,
        },
        { merge: true }
      );

      logger.info(`Saved call ${call.call_id} (${event}) outcome=${fields.callOutcome}`);

      const wantsEmail = shouldEmailOwnerVoicemail(fields);
      const shouldSendNow =
        wantsEmail &&
        !alreadyEmailed &&
        (event === "call_analyzed" || (event === "call_ended" && Boolean(fields.voicemailMessage)));

      if (shouldSendNow) {
        const gmailUser = (GMAIL_USER.value() || DEFAULT_EMAIL).trim();
        const gmailPass = (GMAIL_APP_PASSWORD.value() || "").trim();

        if (!gmailPass) {
          logger.error("GMAIL_APP_PASSWORD is empty — skip email. Set it in functions/.env");
          await callRef.set(
            {
              emailSent: false,
              emailError: "GMAIL_APP_PASSWORD not configured",
            },
            { merge: true }
          );
        } else {
          try {
            await sendOwnerVoicemailEmail({
              gmailUser,
              gmailPass,
              callId: call.call_id,
              phoneNumber: doc.phoneNumber,
              fields,
              recordingUrl: doc.recordingUrl,
              startMs: call.start_timestamp,
            });
            await callRef.set(
              {
                emailSent: true,
                emailSentAt: FieldValue.serverTimestamp(),
                emailRecipient: DEFAULT_EMAIL,
                emailError: FieldValue.delete(),
              },
              { merge: true }
            );
            logger.info(`Owner voicemail email sent for ${call.call_id}`);
          } catch (mailErr) {
            logger.error("Failed to send owner voicemail email", mailErr);
            await callRef.set(
              {
                emailSent: false,
                emailError: String(mailErr),
              },
              { merge: true }
            );
          }
        }
      }

      res.status(200).send("ok");
    } catch (error) {
      logger.error("retellWebhook error", error);
      res.status(200).send("processed with error");
    }
  }
);
