const {
  z
} = require('zod'),
cheerio = require('cheerio'),
axios = require('axios'),
fs = require('fs'),
fetch = require('node-fetch'),
https = require('https'),
{
  CookieJar
} = require('tough-cookie'),
ytdl = require('ytdl-core'),
yts = require('yt-search'),
{
  wrapper
} = require('axios-cookiejar-support');
const {
  createClient
} = require("@supabase/supabase-js");
const {
  v4: uuidv4
} = require("uuid");
const supabase = createClient("https://rdacdjpcbcgkxsqwofnz.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYWNkanBjYmNna3hzcXdvZm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NDg3MzcsImV4cCI6MjA2MjAyNDczN30.IAvUW-LWkj78QcO-ts_JJp72TN0Uy_kJMc_3CreC8iY");

function randomSessionID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const models = {
  chatgpt4: "https://chatbot.nazirganz.space/api/chatgpt4o-api?prompt=",
  deepseek: "https://chatbot.nazirganz.space/api/deepseek-api?prompt=",
  metaai: "https://chatbot.nazirganz.space/api/metaai-api?prompt="
};

const instagramDownloader = require('./downloaders/instagram');
const facebookDownloader = require('./downloaders/facebook');
const {
  youtubeDownloader,
  youtubePlaylistDownloader
} = require('./downloaders/youtube');
const twitterDownloader = require('./downloaders/twitter');
const tiktokDownloader = require('./downloaders/tiktok');
const gdriveDownloader = require('./downloaders/gdrive');
const sfileDownloader = require('./downloaders/sfile');
const {
  pixivDownloader,
  pixivBacthDownloader
} = require('./downloaders/pixiv');
const snackDownloader = require('./downloaders/snack');
const bilibiliDownloader = require('./downloaders/bilibili');
const capcutDownloader = require('./downloaders/capcut');
const pinterestDL = require('./downloaders/pinterest');
const megaDownloader = require('./downloaders/mega');

const allInOne = async (url, { proxy = null, cookie = null } = {}) => {
  try {
    const supportedSites = {
      facebook: /https?:\/\/(www\.)?facebook\.com|https?:\/\/m\.facebook\.com|https?:\/\/fb\.watch/,
      scdl: /https?:\/\/(www\.)?soundcloud\.com|https?:\/\/m\.soundcloud\.com/,
      instagram: /https?:\/\/(www\.)?instagram\.com/,
      tiktok: /https?:\/\/(www\.)?tiktok\.com|https?:\/\/vt\.tiktok\.com|https?:\/\/vm\.tiktok\.com/,
      youtube: /https?:\/\/(www\.)?youtube\.com|https?:\/\/m\.youtube\.com|https?:\/\/youtu\.be/,
      sfile: /https?:\/\/sfile\.mobi/,
      mediafire: /https?:\/\/(www\.)?mediafire\.com/,
      twitter: /https?:\/\/(?:www\.)?(?:twitter\.com|x\.com)\/.+/,
      gdrive: /https?:\/\/drive\.google\.com/,
      pixiv: /https?:\/\/(www\.)?pixiv\.net/,
      snack: /https?:\/\/(www\.)?snack\.com/,
      mega: /https?:\/\/mega\.nz/,
      bilibili: /https?:\/\/(www\.)?bilibili\.tv/,
      capcut: /https?:\/\/(?:www\.)?capcut\.com\/t\/[a-zA-Z0-9]+/,
      pinterest: /^https?:\/\/(?:www\.)?(?:pinterest|pinterestcn)\.[\w.]+\/|^https?:\/\/pin\.it\/[\w.-]+/,
    };

    const sites = Object.keys(supportedSites).find(key => supportedSites[key].test(url));
    if (!sites) throw new Error('Unsupported site');

    switch (sites) {
      case 'instagram':
        return await instagramDownloader(url, proxy);
      case 'facebook':
        return await facebookDownloader(url, proxy);
      case 'youtube':
        return await youtubeDownloader(url);
      case 'tiktok':
        return await tiktokDownloader(url);
      case 'sfile':
        return await sfileDownloader(url);
      case 'gdrive':
        return await gdriveDownloader(url);
      case 'twitter':
        return await twitterDownloader(url);
      case 'pixiv':
        return await pixivDownloader(url, cookie);
      case 'snack':
        return await snackDownloader(url);
      case 'mega':
        return await megaDownloader(url);
      case 'bilibili':
        return await bilibiliDownloader(url, {
          download: true
        });
      case 'capcut':
        return await capcutDownloader(url);
      case 'pinterest':
        return await pinterest.download(url);
      default:
        throw new Error('Unsupported site');
    }

  } catch (error) {
    console.error('An error occurred:', error);
    throw error
  }
}

// Schema
const PinterestSchema = z.string().url();
const DEFAULT_HEADERS = require('./utils/base-headers.js');

module.exports = {
  pinterest: async (querry) => {
  let HASIL = [];
  await axios
    .request(`https://id.pinterest.com/search/pins/?rs=typed&q=` + querry, {
      method: "GET",
      url: "https://id.pinterest.com/search/pins/?rs=typed&q=" + querry,
      headers: {
        "sec-ch-ua":
          '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
        "sec-ch-ua-mobile": "?0",
        "upgrade-insecure-requests": "1",
        cookie:
          'csrftoken=ebe0be3a93cea6072be18633add953a2; _b="AVezvd6F4UtE24FUsA6INxipyZZDoSpyCc5vaJK4QDYXmExosVEc4h6WkiKhlVtQ430="; cm_sub=denied; fba=True; _ga=GA1.2.862909259.1620474446; g_state={"i_l":0}; _auth=1; _pinterest_sess=TWc9PSZ0VEZqZmdDSlJYaGU5REIvNklIcVlnMjE5b0ZraTE5REJVQ0JiMUwxTkZZaGFoVk1sRDVhOFlwQzhkQnQ0YkMwRlNyV0lIWUFlK0ZVTkVxYUhKNmlvZ0R1UXlQYTBRRVVhMU1yYkpmcXpHK3UyNjNhckRqUFFOYVJVa3RnVmJtVzd2MmRGaHFMZUpLNVhtaHptTDhWSnBSdXhZY0FhRnRTN3J1S0V4cGtsVTBxeE54NkF2blVNSFV3R0NTQTR1bVVNRURGVGdnYlN5UjdBbk9YcHVGbGI3a1kwd1dEZDgrZVM1SDc3V0pJMm00OWxKUDVNQjBLVlFocTB4Mjg1M1RnbGxBaFAxbS9MTnVzei91cEQvcjBtakp6N0ZnU2t1Y3NxWW1DRDV1Q3h0ankvQ3FEWGh3MXczcXBHNXJpYVNCMHB6dUoxMGF6ZzVxN2VqQVBoSElSd0tiQk41ZVRPQXlOaGNpNzVQMWJSeVZJbCtYYVMxQ1ZRUFUwalU3eGVzMGRySlNzdWo1NG5uaXNFM3ZpT0o0TkZHR1daUXlwaXFQclMwa04raW9xVnVaTTRSVGEzTE03TVlZcmZYVDd5UmVPd2lZaGw4aE9VMHJBd0tidEsrcHdPWk96RlFMekVLTzY3VU1PL0tIYUdwUE1IWVdJNnJXalBkU09Sb3dEaHlQVVR1T1RqNW5Sc2FRdmVkZmhkMk9HNHBCL0ZpZ3NMdmZvVW9ReVltTFBCTlNLWHpray9LNWJ2UTNvTlBzVm9aZjRvYWRvRFhla0dBNzdveWJVYXZmVFp2cnFFNU5DYUVwSHhxeDlIajNIVTlHaEVYdGptWm5mSGVSRmtIMmQwVVVVZlVCVEh6UHB3TnBtdWV0b2l6L3VTc3pXMXFGN3lHS3ZJM3BwL0NrWVJDMm1HY2tROGxuQVFRNS9OUW45R3dtSk8zeFJidVFSTG1qTG5PelAvKzd3T3lrN1NoKzBHVGNTY1pGSEY0bW8xcGVmc3NtclBhTWE2QUMxOXNpQWUwRmo4UHl0ZGpwUzhUQXVhbjYwT0ZJeHhHai8yOWFUVTA1Wkx2czN4VSttLzMvbkFVQ2svWnZvNC9xZ3E4VkhYSFZ5elo4TzhtU0o5c3ZDcEJyYjE3QVI1WHlmTTFhWThvWHQ1T0tSTWRsWnI3a1lpU245dEVLd1lZSXRremtkTUZmcVA2YUg0c1UrSk1JOWJVRzZpcWd3T0NVaFZkdUh3UUdURi9sbDBqT2pBZVV2ZnlTQzc5ZnBMYkFMQ1ZsWjdIYWcmaDc1Uk5kK2I4MjFMUXBaVUthci9rVHpCUWRvPQ==; _pinterest_cm="TWc9PSYxZnpkMS9XN29Rd2R0TnpBN0RzVktja1J4NUtINUJqRzNGODFXS0xES1pndWlNVm52a0d3V0JocmVIS3p5eDdnNXNZa0hGelNQNDBSTFRId3ZhTFFIQjRGOW1lNlJZMzFiVlg1MHhSOFpmMGhRZUoySUpJZDIyWlVYMjRXNHRaL1lodFl4eW1jWjNyTklpbytYbHZyd29nRm5DY0pQOGgyUWpDdk9zQ1craXR5VEZoNHV4ZzRnOXV4SUFFSStYZCsmT08zMFI1bktXa3pwSDFtK3NNRWpxWWNpQzNzPQ=="; _routing_id="595f24cd-7f4c-4495-aa67-37212d099cd8"; sessionFunnelEventLogged=1',
      },
    })
    .then((res) => {
      const $ = cheerio.load(res.data);
      let hasil = [];
      $(
        "body > div > div > div > div > div > div > div > div > div > div > div",
      ).each(function (a, b) {
        $(b)
          .find("div")
          .each(function (c, d) {
            let Link = $(d)
              .find("div > div > div > div > a")
              .find("img")
              .attr("src");
            hasil.push(Link);
          });
      });

      const output = hasil
        .filter((v) => v !== undefined)
        .map((v) => v.replace("236x", "originals"))
        .filter((url) => url.includes("/originals/"));
      const result = [...new Set(output)]
      HASIL.push(result);
    });
  return HASIL[0];
},
  jarak: async (dari, ke) => {
    var html = await (await fetch(`https://www.google.com/search?q=${encodeURIComponent('jarak ' + dari + ' ke ' + ke)}&ie=UTF-8`, {
      headers: {
        ...DEFAULT_HEADERS,
        cookie: "AEC=AaJma5s3u0kd3AmaFU7qDBl6eHvO-t2xyGirpMFl_pkhdGLBzX9FP8FFfcA; SID=g.a0001wh4XboIJc_VDAzl1_S1v9kHXZij_oXy0fitApyPfxS_B6c1rY6tawazl6zW6dCkpZuEZQACgYKAVwSARcSFQHGX2MiBKVoVwRKP-PeN92awAAx_BoVAUF8yKonY1XH8Rb8rhWq4P9RbTZY0076; __Secure-1PSID=g.a0001wh4XboIJc_VDAzl1_S1v9kHXZij_oXy0fitApyPfxS_B6c19rfXK2WTh20Ts8I8v189swACgYKAQQSARcSFQHGX2MiWmpnsY5IIAwUn8Df_MuTVxoVAUF8yKo3nJbqNnC87PATElLlfnyl0076; __Secure-3PSID=g.a0001wh4XboIJc_VDAzl1_S1v9kHXZij_oXy0fitApyPfxS_B6c1ksvm2YBvbieXD9Gc829ohQACgYKATYSARcSFQHGX2Mik223EVmM8pcPRgR8FeoWPhoVAUF8yKoD2Yf8WBoELIFjRe4tWqdC0076; HSID=Asu2vzxhEX79IkOx4; SSID=A7By93zCPPre4W4YD; APISID=kwGFD0yQYQV234UI/AbsJKc-xmj9aGkqPK; SAPISID=vIefGG-vdCH3njy2/AdFZUPZm-KthLQMv9; __Secure-1PAPISID=vIefGG-vdCH3njy2/AdFZUPZm-KthLQMv9; __Secure-3PAPISID=vIefGG-vdCH3njy2/AdFZUPZm-KthLQMv9; SEARCH_SAMESITE=CgQIip8B; NID=525=IMXjYk6BuwAE0_M34dPgnYCtMdn9qFzIO9u-ix1NIVc4i_BcceeHGbIwl0mOyxQ_1XdO-1IyCznfoNsyYHdI_8deNh6g-uXyKSDAAlNd-anNaAmKZRNVi4d7_CnVPmT-qRGqKh-v4bcMuUjvjBxTy54NGCsJGd4x6WV_DECmKdHW387vNr8tqDTpQk3XiJeNgCr1-zwrVwT7Wo0ZiG6ydP2gtpsrzx3Qo6Zb0hLWoGF8-oES9eFNKBFqFFlYQxlfAtSjtXaQWny2DJ4Wh9sOks6HtjagRw74hzQDvjJ20Ue4oAAbnnJ0xVz4bMdTMdk5ZxS7W0OKTeO1SKr1o-2FNpC0C8fEE4E9enJSAY0KnYDYkKoB_8a8i1L0-FqtrWpL4FgcRYfzdDojbSLzDWZluKD120smgHNL7eGgq4aM21maZbSDXnkt5S70dABeyBPO6QVvi29VXJZ79E3r7fKM2-a8vU1_kBWgFi8_w03qH1cBmHubJoYS4zBeDXITUkXjS9NiQQfY1f-K49wcDTrp2dSxx33E7KpsrvK68xpmHgtFr85iTW4byh-FccG3UsZeSh5uqwUaBGduGGnwxdPvp74MSe3Q5alWa-Tbr17BVdhTNTNisZMJDdHRP4tkqr5od6kR3WKB7BuycFPtngfKhWzyXije6HEBwQ3yvfTuzu2mFg5Sb2G92GvT6MF-SnK9h8Tk-zedknXNOUGXzX_sKxwqDJHo5r3h; UULE=j+WzEsMTIsIjE3NTkzNjc2Mzg0ODgwMDAiLG51bGwsWy0xMDE1Nzg2NDIsMTIzNjg0NzY0Ml0sbnVsbCw2MjAwMCxudWxsLDZd; DV=k2CGVUht_vBv0KXi2U5DAWJRNrsnmhktVbcxKQalGAMAAIBHfY3ypUEuFAEAAPCSFA-qpoSSSgAAAI9ZOOcFiGXgFgAAgGZkmQzmJbr4BQAAAA; SIDCC=AKEyXzW5H9alRUYhFmu4yK_ys5THFrZna-36bHON1e5BpgiV1V_X0hThZ5jVOL2PP_X6zTL6; __Secure-1PSIDCC=AKEyXzUa-59a5VDGRlGJBjLfMVDw5Av_f8EwXOinzX-qDZRwp8dCOdNgu9noA7XkjMMuJzu5; __Secure-3PSIDCC=AKEyXzVsPYEJ4CcgSqp2afiqvwp8d4AqPkwcAPQSIzBW9_rofQ3B1TuQa7Mo_vkiqsjsgTOu"
      }
    }
    )).text()
    var $ = cheerio.load(html),
    obj = {}
    var img = html.split("var s=\'")?.[1]?.split("\'")?.[0]
    obj.img = Buffer.from(img.split(`,`)?.[1], 'base64') || ''
    obj.desc = $('div.GMmKXd.sjVJQd.q8U8x.RES9jf').text()?.trim()
    return obj
  },
  kusoNime: (query) => {
    return new Promise(async (resolve, reject) => {
      const optionsGet = {
        method: "GET",
        headers: {
          "user-agent":
          "Mozilla/5.0 (Linux; Android 9; Redmi 7A) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.99 Mobile Safari/537.36",
        },
      };
      const getHtml = await fetch(
        "https://kusonime.com/?s=" + query + "&post_type=anime",
        optionsGet,
      ).then((rsp) => rsp.text());
      const $ = cheerio.load(getHtml);
      const url = [];
      $("div > div > ul > div > div > div").each(function () {
        url.push($(this).find("a").attr("href"));
      });
      const randomUrl = url[Math.floor(Math.random() * url.length)];
      const getHtml2 = await fetch(randomUrl, optionsGet).then((rsp) =>
        rsp.text(),
      );
      const $$ = cheerio.load(getHtml2);
      resolve( {
        status: 200,
        result: {
          title: $$(".vezone > .venser").find(".jdlz").text(),
          thumb: $$(".vezone > .venser").find("div > img").attr("src"),
          views: $$(".vezone > .venser")
          .find("div > div > span")
          .text()
          .trim()
          .replace(" Views", ""),
          genre: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(1)
          .text()
          .replace("Genre : ", ""),
          seasons: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(2)
          .text()
          .replace("Seasons : ", ""),
          producers: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(3)
          .text()
          .replace("Producers: ", ""),
          type: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(4)
          .text()
          .replace("Type: ", ""),
          status: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(5)
          .text()
          .replace("Status: ", ""),
          rating: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(7)
          .text()
          .replace("Score: ", ""),
          duration: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(8)
          .text()
          .replace("Duration: ", ""),
          release: $$(".vezone > .venser")
          .find(".lexot > .info > p")
          .eq(9)
          .text()
          .replace("Released on: ", ""),
          desc: $$(".vezone > .venser").find("p").eq(10).text(),
          url: randomUrl,
        },
      });
    });
  },
  npmstalk: async (packageName) => {
    let stalk = await (await axios.get("https://registry.npmjs.org/" + packageName)).data,
    data = {};

    let versions = stalk.versions;
    let allver = Object.keys(versions);
    let verLatest = allver[allver.length - 1];
    let verPublish = allver[0];
    let packageLatest = versions[verLatest];
    data.name = packageName || ""
    data.versionLatest = verLatest || ""
    data.versionPublish = verPublish || ""
    data.versionUpdate = allver.length || 0
    data.latestDevDependencies = Object.keys(packageLatest.devDependencies ? packageLatest.devDependencies: {}).length || 0
    data.publishDevDependencies = Object.keys(versions[verPublish].devDependencies ? versions[verPublish].devDependencies: {}).length || 0
    data.latestDependencies = Object.keys(packageLatest.dependencies ? packageLatest.dependencies: {}).length || 0
    data.publishDependencies = Object.keys(versions[verPublish].dependencies ? versions[verPublish].dependencies: {}).length || 0
    data.publishTime = stalk.time.created || ""
    data.latestPublishTime = stalk.time[verLatest] || ""
    return data;
  },
  quotesanime: () => {
    return new Promise((resolve, reject) => {
      const page = Math.floor(Math.random() * 184);
      axios
      .get("https://otakotaku.com/quote/feed/" + page)
      .then(({
        data
      }) => {
        const $ = cheerio.load(data);
        const hasil = [];
        $("div.kotodama-list").each(function (l, h) {
          hasil.push({
            link: $(h).find("a").attr("href"),
            gambar: $(h).find("img").attr("data-src"),
            karakter: $(h).find("div.char-name").text().trim(),
            anime: $(h).find("div.anime-title").text().trim(),
            episode: $(h).find("div.meta").text(),
            up_at: $(h).find("small.meta").text(),
            quotes: $(h).find("div.quote").text().trim(),
          });
        });
        resolve(hasil);
      })
      .catch(reject);
    });
  },
  hentaivid: () => {
    return new Promise((resolve, reject) => {
      const page = Math.floor(Math.random() * 1153);
      axios.get("https://sfmcompile.club/page/" + page).then((data) => {
        const $ = cheerio.load(data.data);
        const hasil = [];
        $("#primary > div > div > ul > li > article").each(function (a, b) {
          hasil.push({
            title: $(b).find("header > h2").text(),
            link: $(b).find("header > h2 > a").attr("href"),
            category: $(b)
            .find("header > div.entry-before-title > span > span")
            .text()
            .replace("in ", ""),
            share_count: $(b)
            .find("header > div.entry-after-title > p > span.entry-shares")
            .text(),
            views_count: $(b)
            .find("header > div.entry-after-title > p > span.entry-views")
            .text(),
            type: $(b).find("source").attr("type") || "image/jpeg",
            video_1:
            $(b).find("source").attr("src") ||
            $(b).find("img").attr("data-src"),
            video_2: $(b).find("video > a").attr("href") || "",
          });
        });
        resolve(hasil);
      });
    });
  },
  nomorhp: (nomor) => {
    return new Promise((resolve, reject) => {
      axios( {
        headers: {
          type: "application/x-www-form-urlencoded",
        },
        method: "POST",
        url: "https://www.primbon.com/no_hoki_bagua_shuzi.php",
        data: new URLSearchParams(
          Object.entries({
            nomer: nomor,
            submit: "Submit!",
          }),
        ),
      })
      .then(({
        data
      }) => {
        let $ = cheerio.load(data);
        let fetchText = $("#body").text().trim();
        let result;
        try {
          result = {
            nomor_hp: fetchText.split("No. HP : ")[1].split("\n")[0],
            angka_bagua_shuzi: fetchText
            .split("Angka Bagua Shuzi : ")[1]
            .split("\n")[0],
            energi_positif: {
              kekayaan: fetchText.split("Kekayaan = ")[1].split("\n")[0],
              kesehatan: fetchText.split("Kesehatan = ")[1].split("\n")[0],
              cinta: fetchText.split("Cinta/Relasi = ")[1].split("\n")[0],
              kestabilan: fetchText.split("Kestabilan = ")[1].split("\n")[0],
              persentase: fetchText
              .split("Kestabilan = ")[1]
              .split("% = ")[1]
              .split("ENERGI NEGATIF")[0],
            },
            energi_negatif: {
              perselisihan: fetchText
              .split("Perselisihan = ")[1]
              .split("\n")[0],
              kehilangan: fetchText.split("Kehilangan = ")[1].split("\n")[0],
              malapetaka: fetchText.split("Malapetaka = ")[1].split("\n")[0],
              kehancuran: fetchText.split("Kehancuran = ")[1].split("\n")[0],
              persentase: fetchText
              .split("Kehancuran = ")[1]
              .split("% = ")[1]
              .split("\n")[0],
            },
            notes: fetchText.split("* ")[1].split("Masukan Nomor HP Anda")[0],
          };
        } catch {
          result = `Nomor "${nomor}" tidak valid`;
        }
        resolve(result);
      })
      .catch(reject);
    });
  },
  searchstickers: (queryy) => {
    return new Promise((resolve, reject) => {
      axios
      .get(`https://getstickerpack.com/stickers?query=${queryy}`)
      .then(({
        data
      }) => {
        const $ = cheerio.load(data);
        const source = [];
        const linknya = [];
        $("#stickerPacks > div > div:nth-child(3) > div > a").each((a, b) => {
          source.push($(b).attr("href"));
        });
        axios
        .get(source[Math.floor(Math.random() * source.length)])
        .then(({
          data
        }) => {
          const $2 = cheerio.load(data);
          $2("#stickerPack > div > div.row > div > img").each((c, d) => {
            linknya.push(
              $2(d)
              .attr("src")
              .replace(/&d=200x200/g, ""),
            );
          });
          result = {
            title: $2("#intro > div > div > h1").text(),
            stickerUrl: linknya,
          };
          resolve(result);
        });
      })
      .catch(reject);
    });
  },
  SurahQuran: {
    listsurah: () => {
      return new Promise((resolve, reject) => {
        axios
        .get("https://litequran.net/")
        .then(({
          data
        }) => {
          const $ = cheerio.load(data);
          let listsurah = [];
          $("body > main > ol > li > a").each(function (a, b) {
            listsurah.push($(b).text());
          });
          resolve(listsurah);
        })
        .catch(reject);
      });
    },
    getSurah: (surah) => {
      return new Promise((resolve, reject) => {
        axios
        .get("https://litequran.net/"+surah)
        .then(({
          data
        }) => {
          const $ = cheerio.load(data);
          let listayat = [];
          $("body > main > article > ol > li").each(function (a, b) {
            var results = {
              arabic: $(b).find('p.arabic').text(),
              translate: $(b).find('p.translate').text(),
              meaning: $(b).find('p.meaning').text(),
            }
            listayat.push(results);

          });
          resolve(listayat);
        })
        .catch(reject);
      });
    },
  },
  jadwalsholat: async (daerah) => {
    var html = await (await fetch(`https://www.google.com/search?q=${encodeURIComponent('jadwal sholat di daerah ' + daerah)}&ie=UTF-8`, {
      headers: {
        ...DEFAULT_HEADERS,
        cookie: "AEC=AaJma5s3u0kd3AmaFU7qDBl6eHvO-t2xyGirpMFl_pkhdGLBzX9FP8FFfcA; SID=g.a0001wh4XboIJc_VDAzl1_S1v9kHXZij_oXy0fitApyPfxS_B6c1rY6tawazl6zW6dCkpZuEZQACgYKAVwSARcSFQHGX2MiBKVoVwRKP-PeN92awAAx_BoVAUF8yKonY1XH8Rb8rhWq4P9RbTZY0076; __Secure-1PSID=g.a0001wh4XboIJc_VDAzl1_S1v9kHXZij_oXy0fitApyPfxS_B6c19rfXK2WTh20Ts8I8v189swACgYKAQQSARcSFQHGX2MiWmpnsY5IIAwUn8Df_MuTVxoVAUF8yKo3nJbqNnC87PATElLlfnyl0076; __Secure-3PSID=g.a0001wh4XboIJc_VDAzl1_S1v9kHXZij_oXy0fitApyPfxS_B6c1ksvm2YBvbieXD9Gc829ohQACgYKATYSARcSFQHGX2Mik223EVmM8pcPRgR8FeoWPhoVAUF8yKoD2Yf8WBoELIFjRe4tWqdC0076; HSID=Asu2vzxhEX79IkOx4; SSID=A7By93zCPPre4W4YD; APISID=kwGFD0yQYQV234UI/AbsJKc-xmj9aGkqPK; SAPISID=vIefGG-vdCH3njy2/AdFZUPZm-KthLQMv9; __Secure-1PAPISID=vIefGG-vdCH3njy2/AdFZUPZm-KthLQMv9; __Secure-3PAPISID=vIefGG-vdCH3njy2/AdFZUPZm-KthLQMv9; SEARCH_SAMESITE=CgQIip8B; NID=525=IMXjYk6BuwAE0_M34dPgnYCtMdn9qFzIO9u-ix1NIVc4i_BcceeHGbIwl0mOyxQ_1XdO-1IyCznfoNsyYHdI_8deNh6g-uXyKSDAAlNd-anNaAmKZRNVi4d7_CnVPmT-qRGqKh-v4bcMuUjvjBxTy54NGCsJGd4x6WV_DECmKdHW387vNr8tqDTpQk3XiJeNgCr1-zwrVwT7Wo0ZiG6ydP2gtpsrzx3Qo6Zb0hLWoGF8-oES9eFNKBFqFFlYQxlfAtSjtXaQWny2DJ4Wh9sOks6HtjagRw74hzQDvjJ20Ue4oAAbnnJ0xVz4bMdTMdk5ZxS7W0OKTeO1SKr1o-2FNpC0C8fEE4E9enJSAY0KnYDYkKoB_8a8i1L0-FqtrWpL4FgcRYfzdDojbSLzDWZluKD120smgHNL7eGgq4aM21maZbSDXnkt5S70dABeyBPO6QVvi29VXJZ79E3r7fKM2-a8vU1_kBWgFi8_w03qH1cBmHubJoYS4zBeDXITUkXjS9NiQQfY1f-K49wcDTrp2dSxx33E7KpsrvK68xpmHgtFr85iTW4byh-FccG3UsZeSh5uqwUaBGduGGnwxdPvp74MSe3Q5alWa-Tbr17BVdhTNTNisZMJDdHRP4tkqr5od6kR3WKB7BuycFPtngfKhWzyXije6HEBwQ3yvfTuzu2mFg5Sb2G92GvT6MF-SnK9h8Tk-zedknXNOUGXzX_sKxwqDJHo5r3h; UULE=j+WzEsMTIsIjE3NTkzNjc2Mzg0ODgwMDAiLG51bGwsWy0xMDE1Nzg2NDIsMTIzNjg0NzY0Ml0sbnVsbCw2MjAwMCxudWxsLDZd; DV=k2CGVUht_vBv0KXi2U5DAWJRNrsnmhktVbcxKQalGAMAAIBHfY3ypUEuFAEAAPCSFA-qpoSSSgAAAI9ZOOcFiGXgFgAAgGZkmQzmJbr4BQAAAA; SIDCC=AKEyXzW5H9alRUYhFmu4yK_ys5THFrZna-36bHON1e5BpgiV1V_X0hThZ5jVOL2PP_X6zTL6; __Secure-1PSIDCC=AKEyXzUa-59a5VDGRlGJBjLfMVDw5Av_f8EwXOinzX-qDZRwp8dCOdNgu9noA7XkjMMuJzu5; __Secure-3PSIDCC=AKEyXzVsPYEJ4CcgSqp2afiqvwp8d4AqPkwcAPQSIzBW9_rofQ3B1TuQa7Mo_vkiqsjsgTOu"
      }
    }
    )).text()
    var $ = cheerio.load(html);
    var obj = {};

    $('div.p2qBs > table.v2lyzd tr:nth-child(2) div.bsrbZb.ptv.PZPZlf').each(function(index, element) {
      switch (index) {
        case 0:
          obj.subuh = $(element).text();
          break;
        case 1:
          obj.terbit = $(element).text();
          break;
        case 2:
          obj.zuhur = $(element).text();
          break;
        case 3:
          obj.asar = $(element).text();
          break;
        case 4:
          obj.maghrib = $(element).text();
          break;
        case 5:
          obj.isya = $(element).text();
          break;
      }
    });
    return obj
  },
  mediafiredl: async (url) => {
    var _a,
    _b;
    if (!/https?:\/\/(www\.)?mediafire\.com/.test(url))
      throw new Error("Invalid URL: " + url);
    const data = await axios(url).data;
    const $ = cheerio.load(data);
    const Url = ($("#downloadButton").attr("href") || "").trim();
    const url2 = ($("#download_link > a.retry").attr("href") || "").trim();
    const $intro = $("div.dl-info > div.intro");
    const filename = $intro.find("div.filename").text().trim();
    const filetype = $intro.find("div.filetype > span").eq(0).text().trim();
    const ext =
    ((_b =
      (_a = /\(\.(.*?)\)/.exec(
        $intro.find("div.filetype > span").eq(1).text(),
      )) === null || _a === void 0
      ? void 0: _a[1]) === null || _b === void 0
      ? void 0: _b.trim()) || "bin";
    const $li = $("div.dl-info > ul.details > li");
    const aploud = $li.eq(1).find("span").text().trim();
    const filesizeH = $li.eq(0).find("span").text().trim();
    const filesize =
    parseFloat(filesizeH) *
    (/GB/i.test(filesizeH)
      ? 1000000: /MB/i.test(filesizeH)
      ? 1000: /KB/i.test(filesizeH)
      ? 1: /B/i.test(filesizeH)
      ? 0.1: 0);
    return {
      url: Url,
      url2,
      filename,
      filetype,
      ext,
      aploud,
      filesizeH,
      filesize,
    };
  },
  ytPlayMp4: async (query) => {
    try {
      const data = await yts(query);
      let url = [],
      result = [];
      const pormats = await data.all;
      for (let i = 0; i < pormats.length; i++) {
        if (pormats[i].type == "video") {
          let dapet = pormats[i];
          url.push(dapet.url);
        }
      }

      const uri = url[Math.floor(Math.random() * url.length)]
      const id = await ytdl.getVideoID(uri)
      await ytdl
      .getInfo(`https://www.youtube.com/watch?v=${id}`)
      .then(async (data) => {
        let pormat = await data.formats;
        let video = [];
        for (let i = 0; i < pormat.length; i++) {
          if (
            pormat[i].container == "mp4" &&
            pormat[i].hasVideo == true &&
            pormat[i].hasAudio == true
          ) {
            let vid = await pormat[i];
            video.push(vid.url);
          }
        }
        const title =
        data.player_response.microformat.playerMicroformatRenderer.title
        .simpleText;
        const thumb =
        data.player_response.microformat.playerMicroformatRenderer
        .thumbnail.thumbnails[0].url;
        const channel =
        data.player_response.microformat.playerMicroformatRenderer
        .ownerChannelName;
        const views =
        data.player_response.microformat.playerMicroformatRenderer
        .viewCount;
        const published =
        data.player_response.microformat.playerMicroformatRenderer
        .publishDate;
        result.push({
          title: title,
          thumb: thumb,
          channel: channel,
          published: published,
          views: views,
          url: video[0],
        });
      });
      return result;
    } catch (error) {
      throw error;
    }
  },
  ytPlayMp3: async (query) => {
    try {
      const data = await yts(query);
      let url = [],
      result = [];
      const pormats = await data.all;
      for (let i = 0; i < pormats.length; i++) {
        if (pormats[i].type == "video") {
          let dapet = pormats[i];
          url.push(dapet.url);
        }
      }

      const uri = url[Math.floor(Math.random() * url.length)]
      const id = await ytdl.getVideoID(uri)
      await ytdl
      .getInfo(`https://www.youtube.com/watch?v=${id}`)
      .then(async (data) => {
        let pormat = await data.formats;
        let audio = [];
        for (let i = 0; i < pormat.length; i++) {
          if (pormat[i].mimeType == 'audio/webm; codecs="opus"') {
            let aud = pormat[i];
            audio.push(aud.url);
          }
        }
        const title =
        data.player_response.microformat.playerMicroformatRenderer.title
        .simpleText;
        const thumb =
        data.player_response.microformat.playerMicroformatRenderer
        .thumbnail.thumbnails[0].url;
        const channel =
        data.player_response.microformat.playerMicroformatRenderer
        .ownerChannelName;
        const views =
        data.player_response.microformat.playerMicroformatRenderer
        .viewCount;
        const published =
        data.player_response.microformat.playerMicroformatRenderer
        .publishDate;
        result.push({
          title: title,
          thumb: thumb,
          channel: channel,
          published: published,
          views: views,
          url: audio[0],
        });
      });
      return result;
    } catch (error) {
      throw error;
    }
  },
  getLatestAnime: () => {
    return new Promise(async (resolve, reject) => {
      await axios
      .get("https://www.mynimeku.com/")
      .then(({
        data
      }) => {
        let $ = cheerio.load(data);
        let result = [];
        $("section.kira-grid-listing > div").each(function (i, e) {
          const title = $(e).find('h3 a span[data-en-title]').text().trim();
          const link = $(e).find('h3 a').attr('href');
          const thumb = $(e).find('img').attr('data-lazy-src');
          const status = $(e).find('.text-text-accent.block.bg-accent-2\\/80').text().trim();
          const episode = $(e).find('.text-[11px].px-2.py-1.rounded-md.font-medium.h-[25px].text-text-accent.bg-accent-3.ms-auto').text().trim().replace('E ', '');
          const type = $(e).find('.text-xs.text-text.w-full.line-clamp-1 span:nth-child(1)').text().trim();
          result.push({
            title, status, episode, type, thumb, link
          });
        });
        resolve(result);
      })
      .catch(reject);
    });
  },
  getVidAnime: (url) => {
    return new Promise(async (resolve, reject) => {
      await axios
      .get("https://www.mynimeku.com/watch/"+url.split('https://www.mynimeku.com/anime/')[1])
      .then(({
        data
      }) => {
        let $ = cheerio.load(data);
        let result = {};
        $("div.episode-head.episode-player > div.episode-player-box > iframe").each(function (i, e) {
          result.url = $(e).attr('data-lazy-src')
        })

        resolve(result);
      })
      .catch(reject);
    });
  },
  heroML: (querry) => {
    return new Promise(async (resolve, reject) => {
      try {
        let upper =
        querry.charAt(0).toUpperCase() + querry.slice(1).toLowerCase();
        const {
          data,
          status
        } = await axios.get(
          "https://mobile-legends.fandom.com/wiki/" + upper,
        );
        if (status === 200) {
          const $ = cheerio.load(data);
          let atributes = [];
          let rill = [];
          let rull = [];
          let rell = [];
          let hero_img = $("figure.pi-item.pi-image > a > img").attr("src");
          let desc = $("div.mw-parser-output > p:nth-child(6)").text();
          $(".mw-parser-output > table:nth-child(9) > tbody > tr").each(
            (u, i) => {
              let _doto = [];
              $(i)
              .find("td")
              .each((o, p) => {
                _doto.push($(p).text().trim());
              });
              if (_doto.length === 0) return;
              atributes.push({
                attribute: _doto[0],
                level_1: _doto[1],
                level_15: _doto[2],
                growth: _doto.pop(),
              });
            },
          );
          $(
            "div.pi-item.pi-data.pi-item-spacing.pi-border-color > div.pi-data-value.pi-font",
          ).each((i, u) => {
              rill.push($(u).text().trim());
            });
          $(
            "aside.portable-infobox.pi-background.pi-border-color.pi-theme-wikia.pi-layout-default",
          ).each((i, u) => {
              rull.push($(u).html());
            });
          const _$ = cheerio.load(rull[1]);
          _$(".pi-item.pi-data.pi-item-spacing.pi-border-color").each((l, m) => {
            rell.push(_$(m).text().trim().replace(/\n/g, ":").replace(/\t/g, ""));
          });
          const result = rell.reduce((acc, curr) => {
            const [key,
              value] = curr.split("::");
            acc[key] = value;
            return acc;
          },
            {});
          let anu = {
            hero_img: hero_img,
            desc: desc,
            release: rill[0],
            role: rill[1],
            specialty: rill[2],
            lane: rill[3],
            price: rill[4],
            gameplay_info: {
              durability: rill[5],
              offense: rill[6],
              control_effect: rill[7],
              difficulty: rill[8],
            },
            story_info_list: result,
            story_info_array: rell,
            attributes: atributes,
          };
          resolve(anu);
        } else if (status === 400) {
          resolve( {
            mess: "hh",
          });
        }
      } catch (err) {
        resolve( {
          mess: "asu",
        });
      }
    });
  },
  Drakor: {
    search: async function searchDrakor(query) {
      try {
        const {
          data
        } = await axios( {
            method: 'get',
            url: "https://drakorasia.com?s=" + query + "&post_type=post",
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          });

        const html = data;
        const $ = cheerio.load(html);
        const extractedData = $("#post.archive")
        .map((index, element) => ({
          title: $(element).find("h2 a").text().trim(),
          link: $(element).find("h2 a").attr("href"),
          image: $(element).find("img").attr("src"),
          categories: $(element)
          .find('.genrenya span[rel="tag"]')
          .map((index, el) => $(el).text())
          .get(),
          year: $(element).find('.category a[rel="tag"]').text(),
          episodes: $(element)
          .find(".category")
          .contents()
          .filter((index, el) => el.nodeType === 3)
          .text()
          .trim(),
        }))
        .get();
        return extractedData;
      } catch (error) {
        console.error("Error:",
          error);
        return [];
      }
    },

    download: async function downloadDrakor(url) {
      try {
        const {
          data
        } = await axios( {
            method: 'get',
            url,
            httpsAgent: new https.Agent({
              rejectUnauthorized: false
            })
          });
        const html = await data;
        const $ = cheerio.load(html);
        const genres = $('.genrenya')
        .map(function (_, el) {
          return $(el).text().trim();
        })
        .get();
        const resolutions = $("thead th")
        .filter(function (_, el) {
          return $(el).text().includes("Download");
        })
        .map(function (_, el) {
          return $(el).text().trim().replace("Download ", "").toLowerCase();
        })
        .get();
        return {
          title: $("h2 span.border-b-4").text().trim(),
          synopsis: $("#synopsis p.caps strong").text().trim(),
          rating: $(".wpd-rating-value .wpdrv").text(),
          genres,
          downloadInfo: $("#content-post table.mdl-data-table tbody tr")
          .map(function (_, el) {
            const episode = $(el).find("td:first-child").text().trim();
            const episodeInfo = Object.fromEntries(
              resolutions.map(function (resolution) {
                const columnIndex = $(
                  'thead th:contains("Download ' + resolution + '")',
                ).index();
                const resolutionColumn = $(el).find(
                  "td:eq(" + columnIndex + ")",
                );
                const downloadLinks = resolutionColumn
                .find("a")
                .map(function (_, a) {
                  const link = $(a).attr("href");
                  const platform = $(a).text().trim();
                  return {
                    platform,
                    link,
                  };
                })
                .get();
                return [resolution, downloadLinks];
              }),
            );
            return {
              episode,
              episodeInfo,
            };
          })
          .get(),
        };
      } catch (error) {
        console.error("Error:",
          error);
        return {};
      }
    },
  },
  quotes: (input) => {
    return new Promise((resolve, reject) => {
      fetch(
        "https://jagokata.com/kata-bijak/kata-" +
        input.replace(/\s/g, "_") +
        ".html?page=1",
      )
      .then((res) => res.text())
      .then((res) => {
        const $ = cheerio.load(res);
        data = [];
        $('div[id="main"]')
        .find('ul[id="citatenrijen"] > li')
        .each(function (index, element) {
          x = $(this)
          .find('div[class="citatenlijst-auteur"] > a')
          .text()
          .trim();
          y = $(this).find('span[class="auteur-beschrijving"]').text().trim();
          z = $(element).find('q[class="fbquote"]').text().trim();
          data.push({
            author: x, bio: y, quote: z
          });
        });
        data.splice(2, 1);
        resolve(data);
      })
      .catch(reject);
    });
  },
  joox: (query) => {
    return new Promise((resolve, reject) => {
      const time = Math.floor(new Date() / 1000);
      axios
      .get(
        "https://cache.api.joox.com/openjoox/v3/search?country=id&lang=id&keyword="+query,
      )
      .then(({
        data
      }) => {
        let result = [];
        let hasil = [];
        let promoses = [];
        let ids = [];
        data.section_list[0].item_list.forEach((result) => {
          ids.push(result.editor_playlist.id);
        });
        for (let i = 0; i < data.section_list[0].item_list.length; i++) {
          const get =
          "http://api.joox.com/web-fcgi-bin/web_get_songinfo?songid=" +
          ids[i];
          promoses.push(
            axios
            .get(get, {
              headers: {
                Cookie: "wmid=342487400; user_type=2; country=id; session_key=824c7b2ee5831396e2eae7a3ac2aad0b;",
              },
            })
            .then(({
              data
            }) => {
              const res = JSON.parse(
                data.replace("MusicInfoCallback(", "").replace("\n)", ""),
              );
              hasil.push({
                lagu: res.msong,
                album: res.malbum,
                penyanyi: res.msinger,
                publish: res.public_time,
                img: res.imgSrc,
                mp3: res.mp3Url,
              });
              Promise.all(promoses).then(() =>
                resolve(hasil),
              );
            })
            .catch(reject),
          );
        }
      })
      .catch(reject);
    });
  },
  tiktokDownloader: async (url) => {
    const jar = new CookieJar();

    const apiClient = axios.create({
      jar: jar,
      withCredentials: true,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0'
      }
    });
    wrapper(apiClient);

    try {
      const htmlResponse = await apiClient.get(url);
      const html = htmlResponse.data;

      const $ = cheerio.load(html);
      const scriptContent = $('#__UNIVERSAL_DATA_FOR_REHYDRATION__').html();
      if (!scriptContent) throw new Error('Script tag #__UNIVERSAL_DATA_FOR_REHYDRATION__ not found.');
      const jsonData = JSON.parse(scriptContent);
      const itemStruct = jsonData?.__DEFAULT_SCOPE__?.["webapp.video-detail"]?.itemInfo?.itemStruct;
      if (!itemStruct) throw new Error('itemStruct not found within the JSON data.');

      const videoUrlToDownload = itemStruct.video?.downloadAddr || itemStruct.video?.playAddr;
      const videoId = itemStruct.id;

      const importantData = {
        videoId: videoId,
        description: itemStruct.desc,
        createTime: itemStruct.createTime,
        videoUrl: videoUrlToDownload,
        videoInfo: {
          size: null,
          duration: itemStruct.video?.duration,
          width: itemStruct.video?.width,
          height: itemStruct.video?.height,
          definition: itemStruct.video?.definition,
          coverUrl: itemStruct.video?.cover,
          subtitles: itemStruct.video?.subtitleInfos?.map(sub => ({
            language: sub.LanguageCodeName, url: sub.Url, format: sub.Format, source: sub.Source
          })) || []
        },
        author: {
          id: itemStruct.author?.id,
          uniqueId: itemStruct.author?.uniqueId,
          nickname: itemStruct.author?.nickname,
          avatarThumb: itemStruct.author?.avatarThumb
        },
        music: {
          id: itemStruct.music?.id,
          title: itemStruct.music?.title,
          authorName: itemStruct.music?.authorName,
          playUrl: itemStruct.music?.playUrl,
          isOriginal: itemStruct.music?.original
        },
        stats: {
          likes: itemStruct.statsV2?.diggCount ?? itemStruct.stats?.diggCount,
          shares: itemStruct.statsV2?.shareCount ?? itemStruct.stats?.shareCount,
          comments: itemStruct.statsV2?.commentCount ?? itemStruct.stats?.commentCount,
          plays: itemStruct.statsV2?.playCount ?? itemStruct.stats?.playCount,
          collects: itemStruct.statsV2?.collectCount ?? itemStruct.stats?.collectCount,
          reposts: itemStruct.statsV2?.repostCount
        },
        locationCreated: itemStruct.locationCreated,
        videoBuffer: null
      };

      if (videoUrlToDownload) {
        try {
          const videoResponse = await apiClient.get(videoUrlToDownload, {
            responseType: 'arraybuffer',
            headers: {
              'Referer': url,
              'Range': 'bytes=0-'
            }
          });

          if (videoResponse.status === 200 || videoResponse.status === 206) {
            importantData.videoBuffer = Buffer.from(videoResponse.data);
            importantData.videoInfo.size = videoResponse.data.length;
          } else {
            console.warn(`Failed to download video. Status: ${videoResponse.status}`);
          }
        } catch (videoError) {
          console.error(`Error downloading video: ${videoError.message}`);
          if (videoError.response) {
            console.error(`Video Download Status Code: ${videoError.response.status}`);
          }
        }
      } else {
        console.warn("Video download URL not found in the data.");
      }

      return importantData

    } catch (error) {
      console.error('Error during main process:', error.message);
      return null
    }
  },
  instagramDownloader,
  facebookDownloader,
  youtubeDownloader,
  youtubePlaylistDownloader,
  twitterDownloader,
  gdriveDownloader,
  sfileDownloader,
  pixivDownloader,
  pixivBacthDownloader,
  snackDownloader,
  bilibiliDownloader,
  capcutDownloader,
  pinterest2: pinterestDL,
  megaDownloader,
  aiodl: allInOne,
  AI: {
    hydromind: async (content, model) => {
      const form = new FormData();
      form.append('content', content);
      form.append('model', model);
      const {
        data
      } = await axios.post('https://mind.hydrooo.web.id/v1/chat/', form, {
          headers: {
            ...form.getHeaders(),
          }
        })
      return data;
    },
    roleAI: {
      createNewSession: async (role, model = "qwen") => {
        const sessionId = randomSessionID();
        const messages = [{
          role: "system",
          content: role || "Kamu adalah AI ramah, Pintar, dan Sopan yang siap membantu. Nama Kamu HeartAi. Kamu suka menjawab pertanyaan dengan santai dan informatif."
        }];
        await supabase.from("ai_sessions").insert({
          user_id: sessionId,
          model,
          messages,
          updated_at: new Date()
        });
        return sessionId;
      },
      deleteExpiredSessions: async () => {
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        await supabase.from("ai_sessions").delete().lt("updated_at", oneHourAgo);
      },
      qwenai: async (prompt, messages) => {
        const {
          data
        } = await axios.post("https://chat.qwen.ai/api/chat/completions", {
            stream: false,
            chat_type: "t2t",
            model: "qwen-turbo-2025-02-11",
            messages,
            session_id: uuidv4(),
            chat_id: uuidv4(),
            id: uuidv4()
          }, {
            headers: {
              accept: '*/*',
              'accept-encoding': 'gzip, deflate, br',
              'accept-language': 'en-US,en;q=0.9',
              authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NTI0YWVhLTNjMjEtNDgwMi05YWY0LTdjZThkNmEwZTE3MSIsImV4cCI6MTc1MDA5MTA2OX0.sDC1jJ4WPlyGzgVi6x6m4vQ31miAOxa1MedflPNKG38',
              'bx-v': '2.5.28',
              'content-type': 'application/json',
              cookie: '_gcl_aw=GCL.1744865954.EAIaIQobChMI04zMmaTejAMVibpLBR0vgx8VEAAYASAAEgK8aPD_BwE; _gcl_gs=2.1.k1$i1744865952$u64539133; _gcl_au=1.1.1153047962.1744865954; _bl_uid=7jmmh9e2ksXwg25g02g8jXsjmn64; acw_tc=0a03e55a17474990039571388e56a2dd601a641b88c7c4cf572eed257291c4; x-ap=ap-southeast-5; token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3NTI0YWVhLTNjMjEtNDgwMi05YWY0LTdjZThkNmEwZTE3MSIsImV4cCI6MTc1MDA5MTA3OH0.W87CVNXvRVE2ZZ2SaAGAThhRC0Ro_4vnENwoXxfC698; ssxmod_itna=Yqfx0D9DBAeeT4eIqmq4iu0xYTxewDAQDXDUdnq7U=GcD8OD0PO+6r5GkUnEAQ05Gq0Q45omR=DlgG0AiDCuPGfDQcYHOQQbhi5YzB7Oi3tK122GmqTst=+x3b8izRu4adC0=6D74i8Nxi1DG5DGexDRxikD7v4pE0YDeeDtx0rlxirP4D3DeaGrDDkDQKDXEA+D0bhbUx+iO8vDiPD=xi3PzD4j40TDD5W7F7IWaAiuCkbF8fEDCIAhWYDoZeE2noAwz8fytRDHmeBwAPCmdyyYYexeGD4BirrSYnwBiDtBCw/pEa6msTOUGOlRY79u+KcjFQ9R=+uCzYSe4iiGx8v4G5qu2tUiNG0w/RYYiN0DiYGzYGDD; ssxmod_itna2=Yqfx0D9DBAeeT4eIqmq4iu0xYTxewDAQDXDUdnq7U=GcD8OD0PO+6r5GkUnEAQ05Gq0Q45omRYD==R0YwKQGnxGae+O80xTODGNqT1iDyWeKWG1DP4CEKzCguiCBPQ+ytntiBGxjLwGQlDw4hATY4AY0dIRv/AS0er0hPdwUxW7r4U72xbAifUQude8L4VRfuUmD0/gufFDLKI45mQ7GQUDx9AB4XCAR0W7md7f7huOvdSx4P/pG+k4+re9DxD; SERVERID=c6e9a4f4599611ff2779ff17d05dde80|1747499111|1747499003; tfstk=gJZsWaZHGrsngaovhVXEFMViEDoX59Sy6KMYE-KwHcntGKN4eqHwbO4bRSPs6lot6BHjIAhxHnetGmNrHVKxkh3bAAkjHdet6DdLaSYOIVHx9pHiXq4Zgfljc-V5L_SP4R2imcCPagoivBStqhLvDIuppYojBzxEkO2immCFsrBzxRVi6QFaBmBIvxMtBm3tH2BIhYGxDf3v9eH-9mnxMVhppxkSBCLtk9wKtxnxMS3OdDhnHeCNlvISZR6i-qIseK6gQXtvDkMCdbyswvcQAAgsXyhBDYrICVG8QutYbQM7PkgzWOQt9l28uo3pd9n0LzNbkJBWyjaaUlgSciOSKyeujre1A_etfXmtEy1Wjcy7J8qimK8ibzyzm4EOfQcErxwSAkCpxjz8eDsrS3lWUXLXofKxdbWCdEYme5JLx5-2leutKvvNd9T4KVHndbWCdEYmWvD3u96BuJf..; isg=BBAQ2i6nTLt-yhCXMHk2N4Wb4Vxi2fQjOuiJTgrh1Ws-RaLvsOi0sns7GFMA1az7',
              host: 'chat.qwen.ai',
              origin: 'https://chat.qwen.ai',
              referer: 'https://chat.qwen.ai/',
              'sec-ch-ua': '"Chromium";v="137", "Not/A)Brand";v="24"',
              'sec-ch-ua-mobile': '?1',
              'sec-ch-ua-platform': '"Android"',
              'sec-fetch-dest': 'empty',
              'sec-fetch-mode': 'cors',
              'sec-fetch-site': 'same-origin',
              'source': 'h5',
              'user-agent': 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
              'version': '0.0.101',
              'x-request-id': uuidv4()
            }
          });

        let reply = data?.choices?.[0]?.message?.content || "";
        if (reply.includes("</think>")) reply = reply.split("</think>").pop().trim();
        return reply;
      },
    },
  },
}
