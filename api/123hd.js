export default async function handler(req, res) {

  const target =
  req.query.url;

  if(!target){

    return res.status(400).json({
      error:"Missing url"
    });

  }

  try{

    const response =
    await fetch(target,{

      headers:{

        "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36",

        "Referer":
        "https://www.123-hds.com/",

        "Origin":
        "https://www.123-hds.com",

        "Accept":
        "*/*",

        "Accept-Language":
        "en-US,en;q=0.9",

        "Cache-Control":
        "no-cache",

        "Pragma":
        "no-cache",

        "Sec-Fetch-Dest":
        "empty",

        "Sec-Fetch-Mode":
        "cors",

        "Sec-Fetch-Site":
        "cross-site"

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

  }catch(err){

    res.status(500).json({

      error:err.message

    });

  }

}
