import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const ALLOWED = [
  "ezmovie.movie",
  "stream25.com",
];

export async function GET(
  req: NextRequest
) {
  const url =
    req.nextUrl.searchParams.get("url");

  if (!url) {
    return Response.json(
      { error: "missing url" },
      { status: 400 }
    );
  }

  try {
    const target =
      new URL(url);

    const allowed =
      ALLOWED.includes(
        target.hostname
      ) ||
      target.hostname.endsWith(
        ".ezmovie.movie"
      ) ||
      target.hostname.endsWith(
        ".stream25.com"
      );

    if (!allowed) {
      return Response.json(
        { error: "forbidden host" },
        { status: 403 }
      );
    }

    const response =
      await fetch(url, {
        headers: {
          "user-agent":
            "Mozilla/5.0",
          referer:
            "https://ezmovie.movie/",
        },
        cache: "no-store",
      });

    return new Response(
      response.body,
      {
        status: response.status,
        headers: {
          "content-type":
            response.headers.get(
              "content-type"
            ) || "text/html",
          "access-control-allow-origin":
            "*",
        },
      }
    );
  } catch (e: any) {
    return Response.json(
      { error: e.message },
      { status: 500 }
    );
  }
}
