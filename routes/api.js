__path = process.cwd();

require('../settings.js');
var express = require('express');
var axios = require('axios');
var fetch = require('node-fetch');
var request = require('request');
var fs = require('fs');
var router = express.Router();
var creator = global.creator
const pinterest = require('../lib/pin.js')
const scr = require('../lib/scrapers.js')
const { createNewSession, qwenai, deleteExpiredSessions } = scr.AI.roleAI;
//const scrr = require('@bochilteam/scraper')
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
const supabase = createClient("https://rdacdjpcbcgkxsqwofnz.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkYWNkanBjYmNna3hzcXdvZm56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NDg3MzcsImV4cCI6MjA2MjAyNDczN30.IAvUW-LWkj78QcO-ts_JJp72TN0Uy_kJMc_3CreC8iY");

const {
  limitAdd,
  isLimit,
  cekKey,
  checkLimit
} = require('../MongoDB/function');

//const scr = require('@bochilteam/scraper')
const {
  color,
  bgcolor
} = require(__path + '/lib/color.js');
const {
  fetchJson
} = require(__path + '/lib/fetcher.js')
const options = require(__path + '/lib/options.js');
const {
  getBuffer
} = require(__path + '/lib/functions.js');
const oxy = require(__path + '/lib/oxy.js');

function getRandomUA() {
  const file = path.join(__dirname, 'ua.txt');
  const lines = fs.readFileSync(file, 'utf-8').split('\n').map(x => x.trim()).filter(Boolean);
  if (!lines.length) throw new Error('File ua.txt kosong');
  return lines[Math.floor(Math.random() * lines.length)];
}
function randomSessionID() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

router.get('/cekapikey', async (req, res, next) => {
  var apikey = req.query.apikey
  if (!apikey) return res.json(loghandler.noapikey)
  const check = await cekKey(apikey);
  if (!check) return res.status(403).send({
    status: 403,
    message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
    result: "error"
  });
  const limit = await checkLimit(apikey);
  res.send({
    status: 200,
    apikey: apikey,
    limit: limit
  });
})

//ai
router.get('/ai/kivotos', async (req, res, next) => {
  const {
    prompt,
    style = 'anime',
    width = 1024,
    height = 1024,
    guidance = 7,
    steps = 28,
    apikey
  } = req.query;
  if (!apikey) return res.json(loghandler.noapikey)
  if (!prompt) {
    return res.status(400).json({
      status: false,
      creator: `${creator}`,
      message: 'Parameter "prompt" wajib diisi.'
    });
  }
  const styles = ['anime',
    'real',
    'photo'];
  if (!styles.includes(style)) {
    return res.status(400).json({
      status: false,
      creator: `${creator}`,
      message: `Style tidak valid. Pilih salah satu: ${styles.join(', ')}`
    });
  }

  const base = `https://heartsync-nsfw-uncensored${style !== 'anime' ? `-${style}`: ''}.hf.space`;
  const session_hash = Math.random().toString(36).slice(2);
  const negative_prompt = 'lowres, bad anatomy, bad hands, text, error, missing finger, extra digits, cropped, worst quality, low quality, watermark, blurry';

  const headers = {
    'User-Agent': `Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:${Math.floor(Math.random() * 30) + 90}.0) Gecko/20100101 Firefox/${Math.floor(Math.random() * 25) + 85}.0`,
    'Referer': base,
    'Origin': base,
    'Accept': '*/*'
  };

  try {
    // Step 1: Join queue
    await axios.post(`${base}/gradio_api/queue/join`, {
      data: [
        prompt,
        negative_prompt,
        0,
        true,
        parseInt(width),
        parseInt(height),
        parseFloat(guidance),
        parseInt(steps)
      ],
      event_data: null,
      fn_index: 2,
      trigger_id: 16,
      session_hash
    }, {
      headers, timeout: 25000
    });

    // Step 2: Polling max 20 detik
    let resultUrl = null;
    const startTime = Date.now();
    while (Date.now() - startTime < 20000) {
      // max 20 detik
      const {
        data: raw
      } = await axios.get(`${base}/gradio_api/queue/data?session_hash=${session_hash}`, {
          headers,
          timeout: 15000,
          responseType: 'text'
        });
      console.log(raw.split('\n\n'))

      const lines = raw.split('\n\n');
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const json = JSON.parse(line.slice(6));
          if (json.msg === 'process_completed') {
            resultUrl = json.output?.data?.[0]?.url;
            break;
          }
        }
      }

      if (resultUrl) break;
      await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 1000)));
    }

    if (!resultUrl) {
      return res.status(429).json({
        status: false,
        creator: `${creator}`,
        message: 'Limit telah tercapai, tunggu beberapa jam kedepan'
      });
    }

    // Step 3: Ambil gambar
    const img = await axios.get(resultUrl, {
      responseType: 'arraybuffer',
      headers
    });

    res.setHeader('Content-Type', 'image/png');
    return res.send(img.data);

  } catch (err) {
    return res.status(429).json({
      status: false,
      creator: `${creator}`,
      message: 'Limit telah tercapai, tunggu beberapa jam kedepan',
      error: err.message
    });
  }
  limitAdd(apikey);
})
router.get('/ai/hydromind', async (req, res, next) => {
  const {
    text,
    model,
    apikey
  } = req.query;
  if (!apikey) return res.json(loghandler.noapikey)
  if (!text || !model) {
    return res.status(400).json({
      status: false,
      creator: `${creator}`,
      message: 'Text and Model is required.'
    });
  }
  try {
    const {
      result
    } = await scr.AI.hydromind(text, model);
    res.status(200).json({
      status: true,
      creator: `${creator}`,
      result
    });
  } catch (err) {
    return res.status(429).json({
      status: false,
      creator: `${creator}`,
      message: `${err.message}`
    });
  }
  limitAdd(apikey);
})
router.get('/ai/openai', async (req, res, next) => {
  const {
    text,
    apikey
  } = req.query;
  if (!apikey) return res.json(loghandler.noapikey)
  if (!text) {
    return res.status(400).json({
      status: false,
      message: "Parameter 'text' is required."
    });
  }

  const messages = [{
    role: "system",
    content: "Kamu adalah asisten pintar bernama DEADHEART AI, kamu biasa dipanggil juga sebagai DeadAI atau HeartAI. Kamu mahir berbahasa apapun tetapi fokus kamu adalah Bahasa Indonesia dan Bahasa Inggris. Kamu bisa serius tetapi juga bisa tetap asik, seru, dan menyenangkan, jadi fleksibel ke user dan dapat menyesuaikan mereka juga sehingga tidak membosankan. Lebih gunakan ‘Aku-Kamu’ ketimbang ‘Saya-Anda’ dan sesekali menggunakan `gue-lu`, kamu juga suka merespon menggunakan emoji tetapi gunakan dengan cara yang tidak berlebihan. Jadilah AI yang pintar, keren, fun, asik, dan menyenangkan."
  },
    {
      role: "user",
      content: text
    }];

  const params = {
    query: JSON.stringify(messages),
    link: "writecream.com"
  };

  const url = "https://8pe3nv3qha.execute-api.us-east-1.amazonaws.com/default/llm_chat?" + new URLSearchParams(params);

  try {
    const {
      data
    } = await axios.get(url, {
        headers: {
          accept: "*/*"
        }
      });

    res.json({
      status: true,
      creator: `${creator}`,
      result: data?.response_content || "-"
    });
  } catch (err) {
    res.status(500).json({
      status: false,
      creator: `${creator}`,
      message: "Gagal mengambil respons dari WriteCream AI.",
      error: err.response?.data || err.message
    });
  }
  limitAdd(apikey);
})
router.get('/ai/deepimg', async (req, res, next) => {
  const {
    prompt,
    size = "3:2",
    style = "3d",
    apikey
  } = req.query;
  if (!apikey) return res.json(loghandler.noapikey)
  if (!prompt) {
    return res.status(400).json({
      status: false,
      creator,
      message: "Parameter 'prompt' is required."
    });
  }

  const styleList = [
    'default',
    'ghibli',
    'cyberpunk',
    'anime',
    'portrait',
    'chibi',
    'pixel art',
    'oil painting',
    '3d'
  ];

  const stylePrompt = {
    default: '-style Realism',
      ghibli: '-style Ghibli Art',
      cyberpunk: '-style Cyberpunk',
      anime: '-style Anime',
      portrait: '-style Portrait',
      chibi: '-style Chibi',
      'pixel art': '-style Pixel Art',
      'oil painting': '-style Oil Painting',
      '3d': '-style 3D'
    };

    const sizeList = {
      '1:1': '1024x1024',
      '3:2': '1080x720',
      '2:3': '720x1080'
    };

    if (!styleList.includes(style)) {
      return res.status(400).json({
        status: false,
        message: `Style tidak valid. Pilihan: ${styleList.join(", ")}`
      });
    }

    if (!sizeList[size]) {
      return res.status(400).json({
        status: false,
        message: `Size tidak valid. Pilihan: ${Object.keys(sizeList).join(", ")}`
      });
    }

    const payload = {
      device_id: [...Array(32)].map(() => Math.floor(Math.random() * 16).toString(16)).join(""),
      prompt: `${prompt} ${stylePrompt[style]}`,
      size: sizeList[size],
      n: '1',
      output_format: 'png'
    };

    try {
      const {
        data
      } = await axios.post(
        'https://api-preview.apirouter.ai/api/v1/deepimg/flux-1-dev',
        payload,
        {
          headers: {
            'content-type': 'application/json',
            origin: 'https://deepimg.ai',
            referer: 'https://deepimg.ai/'
          }
        }
      );

      const imageUrl = data?.data?.images?.[0]?.url;
      if (!imageUrl) {
        return res.status(500).json({
          status: false,
          creator,
          message: "Gagal mendapatkan gambar dari DeepImg."
        });
      }

      const imageRes = await axios.get(imageUrl, {
        responseType: "arraybuffer"
      });

      res.set('Content-Type', 'image/png');
      return res.send(imageRes.data);

    } catch (e) {
      return res.status(500).json({
        status: false,
        creator,
        message: "Terjadi kesalahan saat memproses prompt.",
        error: e?.response?.data || e.message
      });
    }
    limitAdd(apikey);
  })
  router.get('/ai/remakerai', async (req, res, next) => {
    const {
      prompt,
      rasio = '1:1',
      style = 'anime',
      apikey
    } = req.query;
    if (!apikey) return res.json(loghandler.noapikey)
    if (!prompt) {
      return res.status(400).json({
        status: false,
        creator,
        message: "Parameter 'prompt' is required."
      });
    }

    const rasioList = ['1:1',
      '2:3',
      '9:16',
      '3:2',
      '16:9'];
    const styleList = ['ghibli1',
      'ghibli2',
      'ghibli3',
      'anime'];

    if (!rasioList.includes(rasio)) {
      return res.status(400).json({
        status: false, message: `Rasio tidak valid. Gunakan salah satu: ${rasioList.join(', ')}`
      });
    }

    if (!styleList.includes(style)) {
      return res.status(400).json({
        status: false, message: `Style tidak valid. Gunakan salah satu: ${styleList.join(', ')}`
      });
    }

    try {
      const ua = getRandomUA();

      const form = new FormData();
      form.append('prompt', prompt);
      form.append('style', style);
      form.append('aspect_ratio', rasio);

      const headers = {
        ...form.getHeaders(),
        accept: '*/*',
        'accept-language': 'id-ID,id;q=0.9',
        authorization: '',
        origin: 'https://remaker.ai',
        'product-code': '067003',
        'product-serial': 'c25cb430662409bdea35c95eceaffa1f',
        referer: 'https://remaker.ai/',
        'user-agent': ua
      };

      // Step 1: Create job
      const {
        data: create
      } = await axios.post('https://api.remaker.ai/api/pai/v4/ai-anime/create-job', form, {
          headers
        });
      const job_id = create?.result?.job_id;

      if (!job_id) throw new Error('Gagal membuat job');

      // Step 2: Poll result
      for (let i = 0; i < 20; i++) {
        const {
          data: poll
        } = await axios.get(`https://api.remaker.ai/api/pai/v4/ai-anime/get-job/${job_id}`, {
            headers
          });
        const resultUrl = poll?.result?.output?.[0];

        if (resultUrl) {
          const image = await axios.get(resultUrl, {
            responseType: 'arraybuffer'
          });
          res.setHeader('Content-Type', 'image/png');
          return res.send(image.data);
        }

        await new Promise(r => setTimeout(r, 2000)); // Delay polling
      }

      throw new Error('Gagal mendapatkan hasil (Timeout)');
    } catch (err) {
      return res.status(500).json({
        status: false,
        creator,
        message: 'Gagal memproses permintaan',
        error: err.message
      });
    }
    limitAdd(apikey);
  })
  router.get("/ai/roleai/createchat", async (req, res) => {
    const { role, apikey } = req.query;
    if (!apikey) return res.json(loghandler.noapikey)
    try {
      const sessionId = await createNewSession(role);
      res.json({
        status: true,
        creator,
        message: "Session berhasil dibuat",
        session_id: sessionId,
        role: role || "default"
      });
    } catch (e) {
      res.status(500).json({ status: false, creator, message: e.message });
    }
  });
  router.get("/ai/roleai/chat", async (req, res) => {
    const { q, session, apikey } = req.query;
    if (!apikey) return res.json(loghandler.noapikey)
    if (!q || !session) {
      return res.status(400).json({ status: false, creator, message: "Parameter 'q' and 'session' is required." });
    }

    await deleteExpiredSessions();

    let { data: sessionData } = await supabase
      .from("ai_sessions")
      .select("*")
      .eq("user_id", session)
      .single();

    let messages;

    if (!sessionData) {
      messages = [{
        role: "system",
        content: "Kamu adalah AI ramah, Pintar, dan Sopan yang siap membantu. Nama Kamu HeartAI."
      }];
      await supabase.from("ai_sessions").insert({
        user_id: session,
        model: "qwen",
        messages,
        updated_at: new Date()
      });
    } else {
      messages = sessionData.messages;
    }

    messages.push({ role: "user", content: q });

    try {
      const reply = await qwenai(q, messages);
      messages.push({ role: "assistant", content: reply });

      await supabase.from("ai_sessions")
        .update({ messages, updated_at: new Date() })
        .eq("user_id", session);

      res.json({
        status: true,
        creator,
        session,
        response: reply
      });
    } catch (err) {
      res.status(500).json({ status: false, creator, message: err.message });
    }
  });
  router.get("/ai/roleai/deletesession", async (req, res) => {
    const { session, apikey } = req.query;
    if (!apikey) return res.json(loghandler.noapikey)
    if (!session) return res.status(400).json({ status: false, creator, message: "Parameter 'session' is required." });

    try {
      await supabase.from("ai_sessions").delete().eq("user_id", session);
      res.json({ status: true, creator, message: `Session '${session}' berhasil dihapus.` });
    } catch (e) {
      res.status(500).json({ status: false, creator, message: e.message });
    }
  });
  router.get("/ai/roleai/clearchat", async (req, res) => {
    const { session, apikey} = req.query;
    if (!apikey) return res.json(loghandler.noapikey)
    if (!session) return res.status(400).json({ status: false, creator, message: "Parameter 'session' is required." });

    try {
      const { data: sessionData } = await supabase
        .from("ai_sessions")
        .select("*")
        .eq("user_id", session)
        .single();

      if (!sessionData) return res.status(404).json({ status: false, creator, message: "Session not found." });

      const systemPrompt = sessionData.messages.find(m => m.role === "system");
      await supabase.from("ai_sessions")
        .update({ messages: [systemPrompt], updated_at: new Date() })
        .eq("user_id", session);

      res.json({ status: true, creator, message: `Chat di session '${session}' berhasil dikosongkan.` });
    } catch (e) {
      res.status(500).json({ status: false, creator, message: e.message });
    }
  });

  // cecan
  router.get('/cecan/china', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan China").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/vietnam', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan vietnam").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/thailand', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan thailand").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/indonesia', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan indonesia").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/korea', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan korea").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/japan', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan jepang").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/malaysia', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan malaysia").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cecan/chindo', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cecan cewek chindo").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  
  // cogan
  router.get('/cogan/china', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan China").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/vietnam', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan vietnam").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/thailand', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan thailand").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/indonesia', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan indonesia").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/korea', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan korea").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/japan', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan jepang").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/malaysia', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan malaysia").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })
  router.get('/cogan/chindo', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest("cogan cowok chindo").then(data => {
      var dataR = data;
      var result = dataR[Math.floor(Math.random() * dataR.length)];
      var requestSettings = {
        url: result,
        method: 'GET',
        encoding: null
      };
      request(requestSettings, function (error, response, body) {
        res.set('Content-Type', 'image/png');
        res.send(body);
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    });
    limitAdd(apikey);
  })

  // downloader
  router.get('/download/facebook', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required"
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.facebookDownloader(url)
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/instagram', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let iglu = await scr.instagramDownloader(url)
      var result = iglu;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/pinterest', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.q
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'q' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    scr.pinterest(url)
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/download/pinterest2', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.q
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'q' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    scr.pinterest2.search(url)
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/download/tiktok', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ttlu = await scr.tiktokDownloader(url)
      var result = ttlu;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/ytmp3', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let mplu = await scr.ytPlayMp3(url)
      var result = mplu;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    }catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/ytmp4', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.ytPlayMp4(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/mediafiredl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.mediafiredl(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/twitterdl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.twitterDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/gdrivedl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.gdriveDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/sfiledl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.sfileDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/pixivdl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.pixivDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/snackdl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.snackDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/bliblidl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.bilibiliDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/capcutdl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.capcutDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/megadl', async (req, res, next) => {
    var apikey = req.query.apikey
    var url = req.query.url
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.megaDownloader(url)
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/download/aiodl', async (req, res, next) => {
    var { url, proxy, cookie, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      let ply = await scr.aiodl(url, { proxy = null, cookie = null} = {})
      var result = ply;
      res.json({
        status: true,
        creator: `${creator}`,
        result
      })
    } catch(e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })

  // search api
  router.get('/search/pinterest', async (req, res, next) => {
    var apikey = req.query.apikey
    var text = req.query.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'query' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.pinterest(text)
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/search/searchstickers', async (req, res, next) => {
    var apikey = req.query.apikey
    var text = req.query.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'query' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.searchstickers(text)
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/search/joox', async (req, res, next) => {
    var apikey = req.query.apikey
    var text = req.query.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'query' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await scr.joox(text)
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })

  // islamic
  router.get('/islam/tahlil', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataTahlil.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/wirid', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataWirid.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/ayatkursi', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataAyatKursi.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/doaharian', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataDoaHarian.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/bacaanshalat', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataBacaanShalat.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/niatshalat', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataNiatShalat.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/kisahnabi', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataKisahNabi.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/asmaulhusna', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/sandiq/data-islamic/main/dataAsmaulHusna.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/islam/listsurah', async (req, res, next) => {
    var { apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'dari' and 'ke' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.SurahQuran.listsurah()
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/islam/getsurah', async (req, res, next) => {
    var { surah, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!surah) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'surah' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.SurahQuran.getsurah(surah)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/islam/jadwalsholat', async (req, res, next) => {
    var { kota, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!kota) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'kota' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.jadwalsholat(kota)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })

  // game
  router.get('/game/tebakgambar', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakgambar.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/asahotak', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/asahotak.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/caklontong', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/caklontong.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/family100', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/family100.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/siapakahaku', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/siapakahaku.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/susunkata', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/susunkata.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebakbendera', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakbendera.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebakbendera2', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakbendera2.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebakkabupaten', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkabupaten.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebakkalimat', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkalimat.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebakkata', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkata.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebakkimia', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebakkimia.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebaklirik', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebaklirik.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tebaktebakan', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tebaktebakan.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/game/tekateki', async (req, res, next) => {
    var apikey = req.query.apikey
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    fetch(encodeURI(`https://raw.githubusercontent.com/BochilTeam/database/refs/heads/master/games/tekateki.json`))
    .then(response => response.json())
    .then(data => {
      var result = data;
      res.json({
        status: true,
        creator,
        result
      })
    })
    .catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })

  // tools
  router.get('/tool/github-stalk', async (req, res, next) => {
    var apikey = req.query.apikey
    var text = req.query.username
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'username' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    await axios.get(`https://api.github.com/users/${text}`)
    .then(({
      data
    }) => {
      let resp = {
        username: data.login,
        name: data.name,
        bio: data.bio,
        id: data.id,
        nodeId: data.node_id,
        profile_pic: data.avatar_url,
        html_url: data.html_url,
        type: data.type,
        admin: data.site_admin,
        company: data.company,
        blog: data.blog,
        location: data.location,
        email: data.email,
        public_repo: data.public_repos,
        public_gists: data.public_gists,
        followers: data.followers,
        following: data.following,
        created_at: data.created_at,
        updated_at: data.updated_at
      }
      res.json({
        status: true,
        creator,
        resp
      })
    }).catch(e => {
      console.log(e);
      res.json(loghandler.error)
    })
    limitAdd(apikey);
  })
  router.get('/tool/jarak', async (req, res, next) => {
    var { dari, ke, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'dari' and 'ke' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.jarak(dari, ke)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/tool/npmstalk', async (req, res, next) => {
    var { pack, apikey }= req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!text) return res.json({
      status: false,
      creator: `${creator}`,
      message: "parameter 'pack' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.npmstalk(pack)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  
  // others
  router.get('/other/quotesanime', async (req, res, next) => {
    var { apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.quotesanime()
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/other/quotes', async (req, res, next) => {
    var { q, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!q) return res.json({
      status: false,
      creator,
      message: "parameter 'q' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.quotes(q)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/other/heroml', async (req, res, next) => {
    var { q, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!q) return res.json({
      status: false,
      creator,
      message: "parameter 'q' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.heroML(q)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/other/drakorsearch', async (req, res, next) => {
    var { query, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!query) return res.json(loghandler.notquery)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.Drakor.search(query)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/other/drakordl', async (req, res, next) => {
    var { url, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json(loghandler.noturl)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.Drakor.download(url)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/other/nomorhp', async (req, res, next) => {
    var { no, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!no) return res.json({
      status: false,
      creator,
      message: "parameter 'no' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.nomorhp(no)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  
  // anime
  router.get('/anime/getlatestanime', async (req, res, next) => {
    var { apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.getLatestAnime()
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/anime/kusonime', async (req, res, next) => {
    var { q, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!q) return res.json({
      status: false,
      creator,
      message: "parameter 'q' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.kusoNime(q)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })
  router.get('/anime/getvidanime', async (req, res, next) => {
    var { url, apikey } = req.query
    if (!apikey) return res.json(loghandler.noapikey)
    if (!url) return res.json({
      status: false,
      creator,
      message: "parameter 'url' is required."
    })
    const check = await cekKey(apikey);
    if (!check) return res.status(403).send({
      status: 403,
      message: `apikey ${apikey} not found, please register first! https://${req.hostname}/users/signup`,
      result: "error"
    });
    let limit = await isLimit(apikey);
    if (limit) return res.status(403).send({
      status: 403,
      message: 'your limit has been exhausted, reset every 12 PM'
    });
    try {
      const result = await scr.getVidAnime(url)
      res.json({
        status: true,
        creator,
        result
      })
    } catch (e) {
      console.log(e);
      res.json(loghandler.error)
    }
    limitAdd(apikey);
  })

  module.exports = router

  let file = require.resolve(__filename)
  fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(color(`Update '${__filename}'`))
    delete require.cache[file]
    require(file)
  })