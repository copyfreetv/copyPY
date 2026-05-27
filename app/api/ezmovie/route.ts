import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {

  const { searchParams } =
    new URL(request.url);

  const targetUrlStr =
    searchParams.get("url");

  if (!targetUrlStr) {

    return NextResponse.json(
      {
        error:
          "Missing url"
      },
      {
        status: 400
      }
    );
  }

  try {

    const targetUrl =
      new URL(targetUrlStr);

    const hostname =
      targetUrl.hostname;

    const isAllowed =

      hostname ===
      "ezmovie.movie" ||

      hostname.endsWith(
        ".ezmovie.movie"
      ) ||

      hostname.endsWith(
        ".stream25.com"
      );

    if (!isAllowed) {

      return NextResponse.json(
        {
          error:
            "Forbidden target domain"
        },
        {
          status: 403
        }
      );
    }

    const headers =
      new Headers();

    headers.set(
      "User-Agent",
      "Mozilla/5.0"
    );

    headers.set(
      "Referer",
      "https://ezmovie.movie/"
    );

    headers.set(
      "Accept",
      "*/*"
    );

    const response =
      await fetch(
        targetUrlStr,
        {
          method: "GET",
          headers,
          cache: "no-store",
        }
      );

    const contentType =
      response.headers.get(
        "content-type"
      ) || "";

    if (
      contentType.includes(
        "application/json"
      )
    ) {

      const data =
        await response.json();

      return NextResponse.json(
        data
      );
    }

    const text =
      await response.text();

    return new NextResponse(
      text,
      {
        headers: {
          "Content-Type":
            contentType,

          "Access-Control-Allow-Origin":
            "*",
        },
      }
    );

  } catch (error: any) {

    return NextResponse.json(
      {
        error:
          error.message
      },
      {
        status: 500
      }
    );

  }
}
