```javascript
// api/proxy.js

export default async function handler(req, res) {

  // =====================================
  // CORS
  // =====================================

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "*"
  );

  if(req.method === "OPTIONS"){

    return res.status(200).end();

  }



  // =====================================
  // URL
  // =====================================

  const target =
  req.query.url;

  if(!target){

    return res.status(400).json({

      error:"Missing url parameter"

    });

  }



  try{

    // ===================================
    // FETCH TARGET
    // ===================================

    const response =
    await fetch(target,{

      headers:{

        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",

        "Referer":
        "https://www.123-hds.com/",

        "Origin":
        "https://www.123-hds.com"

      }

    });



    // ===================================
    // CHECK STATUS
    // ===================================

    if(!response.ok){

      return res.status(response.status).json({

        error:"Failed to fetch target"

      });

    }



    // ===================================
    // CONTENT TYPE
    // ===================================

    const contentType =
    response.headers.get(
      "content-type"
    ) || "";



    // ===================================
    // TEXT
    // ===================================

    const text =
    await response.text();



    // ===================================
    // M3U8
    // ===================================

    if(
      contentType.includes(
        "application/vnd.apple.mpegurl"
      )
      ||
      target.includes(".m3u8")
    ){

      res.setHeader(
        "Content-Type",
        "application/vnd.apple.mpegurl"
      );

      return res.status(200).send(text);

    }



    // ===================================
    // JSON
    // ===================================

    if(
      contentType.includes(
        "application/json"
      )
    ){

      res.setHeader(
        "Content-Type",
        "application/json"
      );

      return res.status(200).send(text);

    }



    // ===================================
    // HTML
    // ===================================

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.status(200).send(text);

  }catch(err){

    return res.status(500).json({

      error:err.message

    });

  }

}
```
