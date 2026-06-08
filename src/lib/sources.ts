export const sourceLabels: Record<string, string> = {
  chatwork: "Chatwork",
  line: "LINE",
  gmail: "Gmail",
  slack: "Slack",
  google_chat: "Google Chat",
  discord: "Discord",
};

export function sourceLabel(source: string | null) {
  if (!source) {
    return "Unknown";
  }

  return sourceLabels[source] ?? source;
}
