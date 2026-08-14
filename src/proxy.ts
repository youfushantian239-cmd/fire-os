import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // ローカル開発中は認証をスキップ
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const username = process.env.FIRE_AUTH_USER;
  const password = process.env.FIRE_AUTH_PASSWORD;

  // 本番環境で環境変数が未設定なら公開せず停止
  if (!username || !password) {
    return new NextResponse(
      "Authentication is not configured.",
      {
        status: 503,
      }
    );
  }

  const authorization =
    request.headers.get("authorization");

  if (authorization) {
    const [scheme, encoded] =
      authorization.split(" ");

    if (
      scheme === "Basic" &&
      encoded
    ) {
      try {
        const decoded = Buffer.from(
          encoded,
          "base64"
        ).toString("utf8");

        const separatorIndex =
          decoded.indexOf(":");

        const enteredUser =
          decoded.slice(
            0,
            separatorIndex
          );

        const enteredPassword =
          decoded.slice(
            separatorIndex + 1
          );

        if (
          enteredUser === username &&
          enteredPassword === password
        ) {
          return NextResponse.next();
        }
      } catch {
        // 認証失敗として下へ進む
      }
    }
  }

  return new NextResponse(
    "Authentication required.",
    {
      status: 401,
      headers: {
        "WWW-Authenticate":
          'Basic realm="FIRE Navigator"',
      },
    }
  );
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};