import { NextResponse } from "next/server";

export async function POST() {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GITHUB_TOKEN não configurado" }, { status: 500 });
  }

  const res = await fetch(
    "https://api.github.com/repos/dmangussi/argus/actions/workflows/scraper.yml/dispatches",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "master" }),
    }
  );

  if (!res.ok) {
    return NextResponse.json({ error: `GitHub API: ${res.status}` }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
