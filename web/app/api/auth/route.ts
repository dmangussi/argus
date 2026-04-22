import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { password } = await request.json();

  if (!process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "ADMIN_PASSWORD não configurada" }, { status: 500 });
  }

  if (password !== process.env.ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("argus_session", "1", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    sameSite: "lax",
    maxAge: 86400,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("argus_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
