export default async function handler(req, res) {

    // =========================
    // CORS
    // =========================

    res.setHeader(
        "Access-Control-Allow-Origin",
        "*"
    );

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET"
    );


    // =========================
    // URL
    // =========================

    const url = req.query.url;

    if (!url) {

        return res.status(400).json({
            error: "No URL"
        });

    }


    try {

        // =========================
        // FETCH TARGET
        // =========================

        const response = await fetch(url, {

            headers: {

                "User-Agent":
                "Mozilla/5.0",

                "Referer":
                "https://www.24-hds.com/"

            }

        });


        // =========================
        // CONTENT TYPE
        // =========================

        const contentType =
        response.headers.get(
            "content-type"
        );


        // =========================
        // TEXT
        // =========================

        if (
            contentType &&
            contentType.includes("text")
        ) {

            const text =
            await response.text();

            res.setHeader(
                "Content-Type",
                contentType
            );

            return res.send(text);

        }


        // =========================
        // JSON
        // =========================

        if (
            contentType &&
            contentType.includes("application/json")
        ) {

            const json =
            await response.json();

            return res.json(json);

        }


        // =========================
        // BUFFER
        // =========================

        const buffer =
        await response.arrayBuffer();

        res.setHeader(
            "Content-Type",
            contentType ||
            "application/octet-stream"
        );

        return res.send(
            Buffer.from(buffer)
        );

    } catch (e) {

        return res.status(500).json({

            error:
            e.toString()

        });

    }

}

