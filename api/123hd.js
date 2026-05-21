export default async function handler(req, res) {

  const target = req.query.url;

  if (!target) {

    return res.status(400).send("missing url");

  }

  try {

    const response = await fetch(target, {

      headers: {

        "User-Agent":
        "Mozilla/5.0",

        "Referer":
        "https://www.123-hds.com/",

        "Origin":
        "https://www.123-hds.com"

      }

    });

    const text =
    await response.text();

    res.setHeader(
      "Access-Control-Allow-Origin",
      "*"
    );

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.status(200).send(text);

  } catch (e) {

    res.status(500).send(e.toString());

  }

}
