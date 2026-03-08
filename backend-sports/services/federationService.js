import axios from "axios";
import TrustedServer from "../models/TrustedServer.js";
import FederationEvent from "../models/FederationEvent.js";
import { signPayload } from "../utils/signPayload.js";
import stringify from "fast-json-stable-stringify";
import { createError } from "../utils/error.js";
import crypto from "crypto";

export const sendFederationEvent = async ({
  type,
  actorFederatedId,
  objectFederatedId,
  data = {}
}) => {

  const parts = objectFederatedId.split("@");

  if (parts.length < 2) {
    throw createError(400, "Invalid federatedId format");
  }

  const afterAt = parts[1];
  const targetServer = afterAt.split("/")[0];

  if (targetServer === process.env.SERVER_NAME) {
    throw createError(400, "Cannot federate to local server");
  }

  // Check if target server is trusted and active before doing anything else
  const trustedServer = await TrustedServer.findOne({ serverName: targetServer });

  if (!trustedServer) {
    throw createError(403, `Server '${targetServer}' is not a trusted server`);
  }

  if (!trustedServer.isActive) {
    // Federation to this server is paused by admin — skip silently
    console.warn(`Federation to '${targetServer}' is paused. Skipping event: ${type}`);
    return { skipped: true, reason: "server_paused" };
  }

  const payload = {
    eventId: crypto.randomUUID(),
    type,
    actor: {
      federatedId: actorFederatedId,
      server: process.env.SERVER_NAME
    },
    object: {
      federatedId: objectFederatedId
    },
    data,
    timestamp: Date.now()
  };

  const signature = signPayload(
    payload,
    process.env.PRIVATE_KEY
  );

  // 1. Create Outgoing pending event
  const eventDoc = await FederationEvent.create({
    ...payload,
    direction: "outgoing",
    senderServer: process.env.SERVER_NAME,
    processingStatus: "pending"
  });

  // 2. Attempt delivery
  try {
    const response = await axios.post(
      `${trustedServer.serverUrl}/api/federation/inbox`,
      payload,
      {
        headers: {
          "x-origin-server": process.env.SERVER_NAME,
          "x-signature": signature
        }
      }
    );

    // 3a. Success
    eventDoc.processingStatus = "processed";
    await eventDoc.save();
    return response.data;

  } catch (error) {
    // 3b. Failure (e.g., Target server is offline)
    eventDoc.processingStatus = "failed";
    await eventDoc.save();

    console.error(`Federation delivery to ${targetServer} failed. Queued in DB.`);

    // Return gracefully so the local action (like following) still succeeds
    return { queued: true };
  }
};