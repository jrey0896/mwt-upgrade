// api/get-login-page.ts
import { NextRequest, NextResponse } from "next/server";
export const runtime = 'nodejs'; // Forces Vercel to use Node.js serverless instead of Edge

export const config = {
  runtime: "edge",
};

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

    const html = await response.text();

    // 2. Extract the CSRF Token using Regex
    // This looks for: <input type="hidden" name="_token" value="SOME_TOKEN">
    const tokenMatch = html.match(/name="_token"[^>]*value="([^"]+)"/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
      console.error("Could not find _token in HTML");
      return NextResponse.json(
        { error: "Token extraction failed" },
        { status: 500 },
      );
    }

    // 3. Return the HTML and the Token to the frontend
    return NextResponse.json({
      html: html,
      token: token,
    });
  } catch (error) {
    console.error("Get Login Page Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
