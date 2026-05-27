export const config = {
  runtime: 'edge',
};

export default async function(req) {

  try {

    const url =
      new URL(req.url)
      .searchParams
      .get("url");

    if (!url) {

      return new Response(
        JSON.stringify({
          error: "missing url"
        }),
        {
          status: 400,
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    const target =
      new URL(url);

    const allowed =
      target.hostname ===
      "ezmovie.movie" ||

      target.hostname.endsWith(
        ".ezmovie.movie"
      ) ||

      target.hostname.endsWith(
        ".stream25.com"
      );

    if (!allowed) {

      return new Response(
        JSON.stringify({
          error:
            "forbidden host"
        }),
        {
          status: 403,
          headers: {
            "content-type":
              "application/json"
          }
        }
      );
    }

    const response =
      await fetch(url, {

        method: "GET",

        headers: {

          "user-agent":
            "Mozilla/5.0",

          referer:
            "https://ezmovie.movie/",

          accept:
            "*/*"

        }

      });

    return new Response(
      response.body,
      {

        status:
          response.status,

        headers: {

          "content-type":
            response.headers.get(
              "content-type"
            ) ||
            "text/html",

          "access-control-allow-origin":
            "*"

        }

      }
    );

  } catch (e) {

    return new Response(
      JSON.stringify({
        error:
          e.toString()
      }),
      {
        status: 500,
        headers: {
          "content-type":
            "application/json"
        }
      }
    );

  }
}
