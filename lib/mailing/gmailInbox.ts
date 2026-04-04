type GmailHeader = {
  name?: string;
  value?: string;
};

type GmailBody = {
  data?: string;
  size?: number;
  attachmentId?: string;
};

type GmailPayload = {
  mimeType?: string;
  filename?: string;
  headers?: GmailHeader[];
  body?: GmailBody;
  parts?: GmailPayload[];
};

type GmailMessage = {
  id: string;
  threadId?: string;
  labelIds?: string[];
  internalDate?: string;
  payload?: GmailPayload;
};

type GmailHistoryResponse = {
  history?: Array<{
    messagesAdded?: Array<{
      message?: {
        id?: string;
      };
    }>;
  }>;
  historyId?: string;
};

type GmailProfileResponse = {
  historyId?: string;
};

type GmailMessageListResponse = {
  messages?: Array<{
    id?: string;
    threadId?: string;
  }>;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required Gmail configuration: ${name}`);
  }
  return value;
}

function decodeBase64Url(value?: string) {
  if (!value) return "";

  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = normalized.length % 4;
  const padded =
    padding === 0 ? normalized : normalized + "=".repeat(4 - padding);

  return Buffer.from(padded, "base64").toString("utf-8");
}

function flattenPayloadParts(payload?: GmailPayload): GmailPayload[] {
  if (!payload) return [];
  const children = payload.parts?.flatMap((part) => flattenPayloadParts(part)) ?? [];
  return [payload, ...children];
}

function getHeaderValue(payload: GmailPayload | undefined, name: string) {
  const normalizedTarget = name.toLowerCase();
  return (
    payload?.headers?.find(
      (header) => header.name?.toLowerCase() === normalizedTarget,
    )?.value ?? ""
  );
}

function extractEmailAddress(rawValue: string) {
  const match = rawValue.match(/<([^>]+)>/);
  return (match?.[1] ?? rawValue).trim().toLowerCase();
}

function extractAddressList(rawValue: string) {
  if (!rawValue.trim()) return [];
  return rawValue
    .split(",")
    .map((value) => extractEmailAddress(value))
    .filter(Boolean);
}

function extractBody(payload?: GmailPayload) {
  const allParts = flattenPayloadParts(payload);
  const htmlPart = allParts.find((part) => part.mimeType === "text/html");
  const textPart = allParts.find((part) => part.mimeType === "text/plain");
  const fallbackBody = payload?.body?.data;

  return {
    htmlBody: decodeBase64Url(htmlPart?.body?.data),
    textBody:
      decodeBase64Url(textPart?.body?.data) || decodeBase64Url(fallbackBody),
  };
}

function extractAttachments(payload?: GmailPayload) {
  return flattenPayloadParts(payload)
    .filter((part) => Boolean(part.filename))
    .map((part, index) => ({
      fileName: part.filename || `attachment-${index + 1}`,
      mimeType: part.mimeType ?? null,
      sizeBytes: part.body?.size ?? null,
      storagePath: `gmail-attachment://${part.body?.attachmentId ?? part.filename ?? index}`,
    }));
}

async function getAccessToken() {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: getRequiredEnv("GOOGLE_CLIENT_ID"),
      client_secret: getRequiredEnv("GOOGLE_CLIENT_SECRET"),
      refresh_token: getRequiredEnv("GOOGLE_GMAIL_REFRESH_TOKEN"),
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Unable to refresh Gmail access token: ${errorText}`);
  }

  const data = (await response.json()) as { access_token?: string };
  if (!data.access_token) {
    throw new Error("Gmail access token response did not include access_token");
  }

  return data.access_token;
}

async function gmailFetch<T>(path: string, accessToken: string) {
  const response = await fetch(`https://gmail.googleapis.com/gmail/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gmail API request failed: ${errorText}`);
  }

  return (await response.json()) as T;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: R[] = [];

  for (let index = 0; index < items.length; index += concurrency) {
    const batch = items.slice(index, index + concurrency);
    const batchResults = await Promise.all(batch.map((item) => worker(item)));
    results.push(...batchResults);
  }

  return results;
}

export type SyncedInboxMessage = {
  direction: "inbound" | "outbound";
  messageId: string;
  threadId: string | null;
  fromEmail: string;
  toEmails: string[];
  ccEmails: string[];
  subject: string;
  textBody: string | null;
  htmlBody: string | null;
  inReplyTo: string | null;
  references: string[];
  createdAt: Date;
  providerStatus: string | null;
  headers: Record<string, string>;
  attachments: Array<{
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    storagePath: string;
  }>;
};

function getMessageDirection(message: GmailMessage) {
  const labels = message.labelIds ?? [];
  return labels.includes("SENT") ? "outbound" : "inbound";
}

function normalizeMessage(message: GmailMessage): SyncedInboxMessage {
  const payload = message.payload;
  const fromHeader = getHeaderValue(payload, "From");
  const toHeader = getHeaderValue(payload, "To");
  const ccHeader = getHeaderValue(payload, "Cc");
  const subject = getHeaderValue(payload, "Subject");
  const messageIdHeader = getHeaderValue(payload, "Message-ID");
  const inReplyTo = getHeaderValue(payload, "In-Reply-To");
  const references = getHeaderValue(payload, "References");
  const flattenedHeaders = Object.fromEntries(
    (payload?.headers ?? [])
      .filter((header): header is Required<GmailHeader> => Boolean(header.name))
      .map((header) => [header.name, header.value ?? ""]),
  );
  const body = extractBody(payload);

  return {
    direction: getMessageDirection(message),
    messageId: messageIdHeader || `gmail:${message.id}`,
    threadId: message.threadId ?? null,
    fromEmail: extractEmailAddress(fromHeader),
    toEmails: extractAddressList(toHeader),
    ccEmails: extractAddressList(ccHeader),
    subject: subject || "(no subject)",
    textBody: body.textBody || null,
    htmlBody: body.htmlBody || null,
    inReplyTo: inReplyTo || null,
    references: references
      ? references.split(/\s+/).map((item) => item.trim()).filter(Boolean)
      : [],
    createdAt: message.internalDate ? new Date(Number(message.internalDate)) : new Date(),
    providerStatus: message.labelIds?.join(",") ?? null,
    headers: flattenedHeaders,
    attachments: extractAttachments(payload),
  };
}

async function fetchRecentMessagesByQuery(query: string, limit = 15) {
  const accessToken = await getAccessToken();
  const gmailUser = encodeURIComponent(getRequiredEnv("GOOGLE_GMAIL_USER"));

  const listed = await gmailFetch<{
    messages?: Array<{ id: string }>;
  }>(
    `users/${gmailUser}/messages?q=${encodeURIComponent(query)}&maxResults=${limit}`,
    accessToken,
  );

  const messageIds = listed.messages?.map((message) => message.id).filter(Boolean) ?? [];
  if (messageIds.length === 0) {
    return [] as SyncedInboxMessage[];
  }

  const messages = await mapWithConcurrency(
    messageIds,
    4,
    (messageId) =>
      gmailFetch<GmailMessage>(
        `users/${gmailUser}/messages/${messageId}?format=full`,
        accessToken,
      ),
  );

  return messages.map(normalizeMessage);
}

export async function fetchRecentInboxMessages(limit = 15) {
  return fetchRecentMessagesByQuery("in:inbox", limit);
}

export async function fetchRecentSentMessages(limit = 15) {
  return fetchRecentMessagesByQuery("in:sent", limit);
}

function normalizeRfc822MessageId(messageId: string) {
  return messageId.trim().replace(/^<|>$/g, "");
}

export async function findGmailThreadIdByRfc822MessageId(
  messageId: string,
): Promise<string | null> {
  const normalizedMessageId = normalizeRfc822MessageId(messageId);
  if (!normalizedMessageId) {
    return null;
  }

  const accessToken = await getAccessToken();
  const gmailUser = encodeURIComponent(getRequiredEnv("GOOGLE_GMAIL_USER"));
  const query = encodeURIComponent(`in:anywhere rfc822msgid:${normalizedMessageId}`);

  const listed = await gmailFetch<GmailMessageListResponse>(
    `users/${gmailUser}/messages?q=${query}&maxResults=1`,
    accessToken,
  );

  return listed.messages?.[0]?.threadId?.trim() || null;
}

export async function getCurrentMailboxHistoryId() {
  const accessToken = await getAccessToken();
  const gmailUser = encodeURIComponent(getRequiredEnv("GOOGLE_GMAIL_USER"));

  const profile = await gmailFetch<GmailProfileResponse>(
    `users/${gmailUser}/profile`,
    accessToken,
  );

  return profile.historyId ?? "";
}

export async function fetchInboxMessagesSince(historyId: string) {
  return fetchMailboxMessagesSince(historyId, "INBOX");
}

export async function fetchSentMessagesSince(historyId: string) {
  return fetchMailboxMessagesSince(historyId, "SENT");
}

async function fetchMailboxMessagesSince(historyId: string, labelId: "INBOX" | "SENT") {
  const accessToken = await getAccessToken();
  const gmailUser = encodeURIComponent(getRequiredEnv("GOOGLE_GMAIL_USER"));

  const history = await gmailFetch<GmailHistoryResponse>(
    `users/${gmailUser}/history?startHistoryId=${encodeURIComponent(historyId)}&historyTypes=messageAdded&labelId=${labelId}`,
    accessToken,
  );

  const messageIds = Array.from(
    new Set(
      history.history
        ?.flatMap((entry) =>
          entry.messagesAdded?.map((item) => item.message?.id).filter(Boolean) ?? [],
        )
        .filter((messageId): messageId is string => Boolean(messageId)) ?? [],
    ),
  );

  if (messageIds.length === 0) {
    return {
      historyId: history.historyId ?? historyId,
      messages: [] as SyncedInboxMessage[],
    };
  }

  const messages = await mapWithConcurrency(
    messageIds,
    3,
    (messageId) =>
      gmailFetch<GmailMessage>(
        `users/${gmailUser}/messages/${messageId}?format=full`,
        accessToken,
      ),
  );

  return {
    historyId: history.historyId ?? historyId,
    messages: messages.map(normalizeMessage),
  };
}
