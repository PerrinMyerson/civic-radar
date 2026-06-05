import { corsHeaders, jsonResponse, supabaseRest } from "../_shared/civic.ts";

type NotificationRow = {
  id: string;
  relevance_reasons: string[];
  relevance_score: number;
  source_url: string;
  summary: string;
  title: string;
  user_id: string;
};

type ProfileRow = {
  display_name: string;
  email: string;
  notification_email: string;
  notify_frequency: "immediate" | "daily" | "weekly" | "off";
  user_id: string;
};

function emailHtml(profile: ProfileRow, notifications: NotificationRow[]) {
  const items = notifications
    .map(
      (notification) => `
        <li>
          <strong>${notification.title}</strong><br />
          Relevance ${notification.relevance_score}/100${
            notification.relevance_reasons.length
              ? `: ${notification.relevance_reasons.join("; ")}`
              : ""
          }<br />
          ${notification.summary ? `${notification.summary}<br />` : ""}
          ${
            notification.source_url
              ? `<a href="${notification.source_url}">Official source</a>`
              : "No official source URL available"
          }
        </li>
      `,
    )
    .join("");

  return `
    <p>Hello ${profile.display_name || "there"},</p>
    <p>Here are current Civic Radar items matched to your watchlist.</p>
    <ul>${items}</ul>
    <p>Open Civic Radar to review, save, dismiss, or add feedback.</p>
  `;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const resendKey = Deno.env.get("RESEND_API_KEY") ?? "";
    const fromEmail = Deno.env.get("CIVIC_RADAR_FROM_EMAIL") ?? "Civic Radar <onboarding@resend.dev>";
    const [notifications, profiles] = await Promise.all([
      supabaseRest<NotificationRow[]>(
        "/rest/v1/civic_notifications?select=id,user_id,title,summary,source_url,relevance_score,relevance_reasons&delivery_state=eq.pending&notification_kind=eq.in_app&order=created_at.asc&limit=100",
      ),
      supabaseRest<ProfileRow[]>(
        "/rest/v1/civic_profiles?select=user_id,email,display_name,notification_email,notify_frequency&notify_frequency=neq.off",
      ),
    ]);

    if (notifications.length === 0) {
      return jsonResponse({ sent: 0, status: "empty" });
    }

    if (!resendKey) {
      await supabaseRest(
        `/rest/v1/civic_notifications?id=in.(${notifications
          .map((notification) => notification.id)
          .join(",")})`,
        {
          body: { delivery_state: "queued_no_provider" },
          method: "PATCH",
        },
      );

      return jsonResponse({
        queued: notifications.length,
        status: "queued_no_provider",
      });
    }

    let sent = 0;
    for (const profile of profiles) {
      const recipient = profile.notification_email || profile.email;
      if (!recipient) {
        continue;
      }

      const userNotifications = notifications.filter(
        (notification) => notification.user_id === profile.user_id,
      );

      if (userNotifications.length === 0) {
        continue;
      }

      const response = await fetch("https://api.resend.com/emails", {
        body: JSON.stringify({
          from: fromEmail,
          html: emailHtml(profile, userNotifications),
          subject: `Civic Radar: ${userNotifications.length} matched item${
            userNotifications.length === 1 ? "" : "s"
          }`,
          to: [recipient],
        }),
        headers: {
          Authorization: `Bearer ${resendKey}`,
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const state = response.ok ? "sent" : "failed";
      if (response.ok) {
        sent += userNotifications.length;
      }

      await supabaseRest(
        `/rest/v1/civic_notifications?id=in.(${userNotifications
          .map((notification) => notification.id)
          .join(",")})`,
        {
          body: {
            delivery_state: state,
            sent_at: response.ok ? new Date().toISOString() : null,
          },
          method: "PATCH",
        },
      );
    }

    return jsonResponse({ sent, status: "ok" });
  } catch (error) {
    return jsonResponse(
      { error: error instanceof Error ? error.message : "Unable to send civic digest" },
      500,
    );
  }
});
