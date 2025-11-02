const fs = require('fs')

global.creator = 'NdyZz'
global.MONGO_DB_URI = process.env.MONGO_DB_URI //uri database mongodb 
global.ACTIVATION_TOKEN_SECRET = process.env.ACTIVATION_TOKEN_SECRET
global.your_email = process.env.YOUR_EMAIL
global.email_password = process.env.EMAIL_PASS //application password email
global.limitCount = 10000
global.YUOR_PORT = process.env.PORT || 8000
global.loghandler = {
	noapikey:{
		status: 403,
        message: 'Input parameter apikey',
        creator: `${creator}`,
        result: "error"
    },
    error: {
        status: 503,
        message: 'Service Unavaible, Sedang dalam perbaikan',
        creator: `${creator}`
    },
    apikey: {
    	status: 403,
    	message: 'Forbiden, Invalid apikey',
    	creator: `${creator}`
    },
    noturl: {
    	status: 403,
    	message: 'Forbiden, Invlid url, masukkan parameter url',
    	creator: `${creator}`,
    },
    notquery: {
    	status: 403,
    	message: 'Forbiden, Invlid query, masukkan parameter query',
    	creator: `${creator}`,
    }
}
global.restapi = {
    ai: [
      {
        name: 'Kivotos',
        required: 'prompt & apikey',
        url: 'api/ai/kivotos?prompt=blublub&apikey='
      },
      {
        name: 'Hydromind',
        required: 'text & model & apikey',
        url: 'api/ai/hydromind?text=blublub&model=gpt4&apikey='
      },
      {
        name: 'Openai',
        required: 'text & apikey',
        url: 'api/ai/openai?text=blublub&apikey='
      },
      {
        name: 'Deep Image',
        required: 'prompt & apikey',
        url: 'api/ai/deepimg?prompt=loli&apikey='
      },
      {
        name: 'Remaker AI',
        required: 'prompt & apikey',
        url: 'api/ai/remakerai?prompt=blublub&apikey='
      },
    ],
    cecan: [
      {
        name: 'Cecan China',
        required: 'apikey',
        url: 'api/cecan/china?apikey='
      },
      {
        name: 'Cecan Vietnam',
        required: 'apikey',
        url: 'api/cecan/vietnam?apikey='
      },
      {
        name: 'Cecan Thailand',
        required: 'apikey',
        url: 'api/cecan/thailand?apikey='
      },
      {
        name: 'Cecan Indonesia',
        required: 'apikey',
        url: 'api/cecan/indonesia?apikey='
      },
      {
        name: 'Cecan Korea',
        required: 'apikey',
        url: 'api/cecan/korea?apikey='
      },
      {
        name: 'Cecan Japanese',
        required: 'apikey',
        url: 'api/cecan/japan?apikey='
      },
      {
        name: 'Cecan Malaysia',
        required: 'apikey',
        url: 'api/cecan/malaysia?apikey='
      },
      {
        name: 'Cecan Chindo',
        required: 'apikey',
        url: 'api/cecan/chindo?apikey='
      },
    ],
    cogan: [
      {
        name: 'Cogan China',
        required: 'apikey',
        url: 'api/cogan/china?apikey='
      },
      {
        name: 'Cogan Vietnam',
        required: 'apikey',
        url: 'api/cogan/vietnam?apikey='
      },
      {
        name: 'Cogan Thailand',
        required: 'apikey',
        url: 'api/cogan/thailand?apikey='
      },
      {
        name: 'Cogan Indonesia',
        required: 'apikey',
        url: 'api/cogan/indonesia?apikey='
      },
      {
        name: 'Cogan Korea',
        required: 'apikey',
        url: 'api/cogan/korea?apikey='
      },
      {
        name: 'Cogan Japanese',
        required: 'apikey',
        url: 'api/cogan/japan?apikey='
      },
      {
        name: 'Cogan Malaysia',
        required: 'apikey',
        url: 'api/cogan/malaysia?apikey='
      },
      {
        name: 'Cogan Chindo',
        required: 'apikey',
        url: 'api/cogan/chindo?apikey='
      },
    ],
    dl: [
      {
        name: 'Facebook',
        required: 'url & apikey',
        url: 'api/download/facebook?url=&apikey='
      },
      {
        name: 'Instagram',
        required: 'url & apikey',
        url: 'api/download/instagram?url=&apikey='
      },
      {
        name: 'Pinterest',
        required: 'q & apikey',
        url: 'api/download/instagram?q=&apikey='
      },
      {
        name: 'Pinterest',
        required: 'q & apikey',
        url: 'api/download/pinterest?q=&apikey='
      },
      {
        name: 'Pinterest v2',
        required: 'q & apikey',
        url: 'api/download/pinterest2?q=&apikey='
      },
      {
        name: 'Tiktok',
        required: 'url & apikey',
        url: 'api/download/tiktok?url=&apikey='
      },
      {
        name: 'Youtube Mp3',
        required: 'url & apikey',
        url: 'api/download/ytmp3?url=&apikey='
      },
      {
        name: 'Youtube Mp4',
        required: 'url & apikey',
        url: 'api/download/ytmp4?url=&apikey='
      },
      {
        name: 'Mediafire Download',
        required: 'url & apikey',
        url: 'api/download/mediafiredl?url=&apikey='
      },
      {
        name: 'Twitter Download',
        required: 'url & apikey',
        url: 'api/download/twitterdl?url=&apikey='
      },
      {
        name: 'GDrive Download',
        required: 'url & apikey',
        url: 'api/download/gdrivedl?url=&apikey='
      },
      {
        name: 'SFile Download',
        required: 'url & apikey',
        url: 'api/download/sfiledl?url=&apikey='
      },
      {
        name: 'Pixiv Download',
        required: 'url & apikey',
        url: 'api/download/pixivdl?url=&apikey='
      },
      {
        name: 'Snack Video Download',
        required: 'url & apikey',
        url: 'api/download/snackdl?url=&apikey='
      },
      {
        name: 'BliBli Download',
        required: 'url & apikey',
        url: 'api/download/bliblidl?url=&apikey='
      },
      {
        name: 'Capcut Download',
        required: 'url & apikey',
        url: 'api/download/capcutdl?url=&apikey='
      },
      {
        name: 'Mega Download',
        required: 'url & apikey',
        url: 'api/download/megadl?url=&apikey='
      },
      {
        name: 'All In One Download',
        required: 'url & apikey',
        url: 'api/download/aiodl?url=&apikey='
      },
    ],
    search: [
		{
			name: "Seacrh Film",
			required: "query & apikey",
			url: "api/search/film?query=avengers+endgame&apikey="
		},
      {
        name: "Search Pinterest",
        required: "query & apikey",
        url: "api/search/pinterest?query=monyet&apikey="
      },
      {
        name: "Search Sticker",
        required: "query & apikey",
        url: "api/search/searchstickers?query=spongeboob&apikey="
      },
      {
        name: "Search Joox",
        required: "query & apikey",
        url: "api/search/joox?query=sayang&apikey="
      },
    ],
    islamic: [
      {
        name: "Tahlil",
        required: "apikey",
        url: "api/islam/tahlil?apikey="
      },
      {
        name: "Wirid",
        required: "apikey",
        url: "api/islam/wirid?apikey="
      },
      {
        name: "Ayat Kursi",
        required: "apikey",
        url: "api/islam/ayatkursi?apikey="
      },
      {
        name: "Doa Harian",
        required: "apikey",
        url: "api/islam/doaharian?apikey="
      },
      {
        name: "Bacaan Shalat",
        required: "apikey",
        url: "api/islam/bacaanshalat?apikey="
      },
      {
        name: "Bacaan Shalat",
        required: "apikey",
        url: "api/islam/bacaanshalat?apikey="
      },
      {
        name: "Niat Shalat",
        required: "apikey",
        url: "api/islam/niatshalat?apikey="
      },
      {
        name: "Kisah Nabi",
        required: "apikey",
        url: "api/islam/kisahnabi?apikey="
      },
      {
        name: "Asmaul Husna",
        required: "apikey",
        url: "api/islam/asmaulhusna?apikey="
      },
      {
        name: "List Surah",
        required: "apikey",
        url: "api/islam/listsurah?apikey="
      },
      {
        name: "Get Surah",
        required: "apikey",
        url: "api/islam/getsurah?apikey="
      },
      {
        name: "Jadwal Shalat",
        required: "apikey",
        url: "api/islam/jadwalsholat?apikey="
      },
    ],
    game: [
      {
        name: "Tebak Gambar",
        required: "apikey",
        url: "api/game/tebakgambar?apikey="
      },
      {
        name: "Asah Otak",
        required: "apikey",
        url: "api/game/asahotak?apikey="
      },
      {
        name: "Cak Lontong",
        required: "apikey",
        url: "api/game/caklontong?apikey="
      },
      {
        name: "Family 100",
        required: "apikey",
        url: "api/game/family100?apikey="
      },
      {
        name: "Siapa Kah Aku?",
        required: "apikey",
        url: "api/game/siapakahaku?apikey="
      },
      {
        name: "Susun Kata",
        required: "apikey",
        url: "api/game/susunkata?apikey="
      },
      {
        name: "Tebak Bendera",
        required: "apikey",
        url: "api/game/tebakbendera?apikey="
      },
      {
        name: "Tebak Bendera V2",
        required: "apikey",
        url: "api/game/tebakbendera2?apikey="
      },
      {
        name: "Tebak Kabupaten",
        required: "apikey",
        url: "api/game/tebakkabupaten?apikey="
      },
      {
        name: "Tebak Kalimat",
        required: "apikey",
        url: "api/game/tebakkalimat?apikey="
      },
      {
        name: "Tebak Kata",
        required: "apikey",
        url: "api/game/tebakkata?apikey="
      },
      {
        name: "Tebak Kimia",
        required: "apikey",
        url: "api/game/tebakkimia?apikey="
      },
      {
        name: "Tebak Lirik",
        required: "apikey",
        url: "api/game/tebaklirik?apikey="
      },
      {
        name: "Tebak Tebakan",
        required: "apikey",
        url: "api/game/tebaktebakan?apikey="
      },
      {
        name: "Teka Teki",
        required: "apikey",
        url: "api/game/tekateki?apikey="
      },
    ],
    tool: [
      {
        name: "Github Stalker",
        required: "username & apikey",
        url: "api/tool/github-stalk?username=NdyZz&apikey="
      },
      {
        name: "Jarak",
        required: "dari & ke & apikey",
        url: "api/tool/jarak?dari=Makassar&ke=Jakarta&apikey="
      },
      {
        name: "NPM Stalker",
        required: "pack & apikey",
        url: "api/tool/npmstalk?pack=lontara-language&apikey="
      },
    ],
    other: [
      {
        name: "Quotes Anime",
        required: "apikey",
        url: "api/other/quotesanime?apikey="
      },
      {
        name: "Quotes",
        required: "q & apikey",
        url: "api/other/quotes?q=cinta&apikey="
      },
      {
        name: "Hero Mobile Legend",
        required: "q & apikey",
        url: "api/other/heroml?q=saber&apikey="
      },
      {
        name: "Drama Korea",
        required: "apikey",
        url: "api/other/drakor?apikey="
      },
      {
        name: "Nomor HP",
        required: "no & apikey",
        url: "api/other/nomorhp?no=083133318509&apikey="
      },
    ],
    anime: [
      {
        name: "Latest Anime",
        required: "apikey",
        url: "api/anime/getlatestanime?apikey="
      },
      {
        name: "Get Videoa Anime",
        required: "url & apikey",
        url: "api/anime/getvidanime?url=&apikey="
      },
      {
        name: "Kusonime",
        required: "url & apikey",
        url: "api/anime/getvidanime?url=&apikey="
      },
    ]
}
let file = require.resolve(__filename)
fs.watchFile(file, () => {
	fs.unwatchFile(file)
	console.log(`Update'${__filename}'`)
	delete require.cache[file]
	require(file)
})

