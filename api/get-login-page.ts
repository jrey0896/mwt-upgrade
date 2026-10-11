import { NextRequest } from "next/server";

// Use the standard Web Fetch API signature
export const runtime = "nodejs"; // Keep this if you need node-specific globals, otherwise remove

export async function GET(request: NextRequest) {
  console.log("Fetching real HTML from webmail de facto...");
  
  try {
    // 1. Fetch the actual login page
    const response = await fetch("https://webmail.mwt.net/?_task=login", {
      headers: {
        // Optional: Mimic a browser request to avoid simple bot blocks
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
      }
    });

    if (!response.ok) {
      return new Response(`Failed to fetch login page: ${response.status}`, {
        status: 500,
        headers: { "Content-Type": "text/plain" }
      });
    }

    let html = await response.text();

    // 2. FIX ASSETS: Replace any relative path starting with / or a letter (that isn't http)
    // This covers: src="/path", src="folder/file.png", href="/page"
    html = html.replace(/((?:href|src)=")(?!(?:https?:\/\/)?)([^"]+)/g, (match, prefix, content) => {
        // If the content already has http/https, leave it alone
        if (/^https?:\/\//.test(content)) {
            return match;
        }
        // Otherwise, prepend the base URL
        return prefix + "https://webmail.mwt.net/" + content;
    });
    
    console.log("HTML paths absolute-ified.");

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

    // 4. Return a RAW Response object, not NextResponse
    // This ensures the client receives plain HTML, not JSON
    return new Response(html, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Relaxed CSP to allow scripts/styles from your own domain + mwt.net
        "Content-Security-Policy": 
          "default-src *; script-src * 'unsafe-inline' 'unsafe-eval'; style-src * 'unsafe-inline'; img-src *;",
        "X-Frame-Options": "ALLOWALL",
        "Cache-Control": "no-cache" // Prevent caching stale tokens
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
