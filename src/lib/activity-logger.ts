import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebase";

export const logActivity = async (
  action: string,
  details: string,
  options?: {
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }
) => {
  try {
    const user = auth.currentUser;
    if (!user) return;

    await addDoc(collection(db, "activityLogs"), {
      action,
      details,
      entityType: options?.entityType || null,
      entityId: options?.entityId || null,
      metadata: options?.metadata || {},
      userId: user.uid,
      userEmail: user.email,
      timestamp: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error logging activity:", error);
  }
};
