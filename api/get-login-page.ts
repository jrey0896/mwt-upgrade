// api/get-login-page.ts

export const runtime = 'nodejs'; 

import { NextRequest, NextResponse } from "next/server";

export default async function handler(request: NextRequest) {
  try {
    // 1. Fetch the actual login page from the real site
    const response = await fetch("https://webmail.mwt.net/?_task=login");

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch login page" },
        { status: 500 },
      );
    }

    let html = await response.text();

    // 2. FIX THE BLANK PAGE: Replace relative paths with absolute ones
    html = html.replace(/href="\//g, 'href="https://webmail.mwt.net/');
    html = html.replace(/src="\//g, 'src="https://webmail.mwt.net/');

    // 3. Extract the CSRF Token using Regex
    const tokenMatch = html.match(/name="_token"[^>]*value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.error("Could not find _token in HTML");
      return NextResponse.json(
        { error: "Token extraction failed" },
        { status: 500 },
      );
    }

    // 4. Create a new Response object to send to the client
    // This allows us to modify headers (like removing Set-Cookie)
    const modifiedHtml = new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html",
        // Remove restrictive headers that might break your frontend
        "Content-Security-Policy": "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src *;",
        "X-Frame-Options": "ALLOWALL",
      },
    });

    return modifiedHtml;
  } catch (error) {
    console.error("Get Login Page Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
