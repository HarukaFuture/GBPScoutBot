//HF Bandori Scout Bot 
//标准库
const fs = require('fs');
//配置区
const config = JSON.parse(fs.readFileSync('config.json','utf8'))
//NPM区
const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const request = require('superagent');
var JsonDB = require('node-json-db');
var crc32 = require('crc32');
//定义区
const bot = new Telegraf(config.apikey);
require('superagent-cache')(request)
var db = new JsonDB("serverdb", true, false);
//END
var gameserver = config.gameserver
async function cardInit(){
	let cardLstEN = {}
	let charaLstJP = await getCharacterList('jp')
	let charaLstKR = await getCharacterList('kr')
	let charaLstTW = await getCharacterList('tw')
	let charaLstEN = await getCharacterList('en')

	global.star = {}
	global.cardCount = {}
	global.cardLst = {}
	global.resVersion = {}
	global.charaLst = {}
	global.charaLst.jp = []
	global.charaLst.kr = []
	global.charaLst.tw = []
	global.charaLst.en = []
	cardLstEN.data = (await getcard('en')).data.filter((obj)=>{
		let now = Date.now()
		return obj.releasedAt < now
	})
	cardLstEN.totalCount = cardLstEN.data.length
	
	global.cardLst.jp = await getcard('jp')
	global.cardLst.kr = await getcard('kr')
	global.cardLst.tw = await getcard('tw')
	global.cardLst.en = cardLstEN
	
	global.star.jp = JSON.parse(starRarity(global.cardLst.jp.data));
	global.star.kr = JSON.parse(starRarity(global.cardLst.kr.data));
	global.star.tw = JSON.parse(starRarity(global.cardLst.tw.data));
	global.star.en = JSON.parse(starRarity(global.cardLst.en.data));

	global.cardCount.jp = global.cardLst.jp.totalCount
	global.cardCount.kr = global.cardLst.kr.totalCount
	global.cardCount.tw = global.cardLst.tw.totalCount
	global.cardCount.en = global.cardLst.en.totalCount
	
	global.resVersion.jp = await getResVer('jp')
	global.resVersion.kr = await getResVer('kr')
	global.resVersion.tw = await getResVer('tw')
	global.resVersion.en = await getResVer('en')

	charaLstJP.forEach(function(element, index) {
    global.charaLst.jp[element.characterId] = element;
	});
	charaLstKR.forEach(function(element, index) {
    global.charaLst.kr[element.characterId] = element;
	});
	charaLstTW.forEach(function(element, index) {
    global.charaLst.tw[element.characterId] = element;
	});
	charaLstEN.forEach(function(element, index) {
    global.charaLst.en[element.characterId] = element;
	});
	
}
async function getcard (gameserver){
	var card = await request.get(`https://api.bandori.ga/v1/${gameserver}/card?&sort=asc&orderKey=cardId`).forceUpdate(true)
	return card.body
}
async function getResVer (gameserver){
	var resver = await request.get(`https://api.bandori.ga/v1/${gameserver}/version/res`).forceUpdate(true)
	return resver.text
}
bot.telegram.getMe().then((botInfo) => {bot.options.username = botInfo.username})
void async function(){
	await cardInit()
}()

bot.command('ping',(ctx) => {ctx.reply('没炸!')});
bot.command('setserver',(ctx) => {setOptServer(ctx)});
bot.command('reinit',async (ctx) => {
	if (config.admin.includes(ctx.message.from.id)){
		await cardInit()
		ctx.reply(`${JSON.stringify({resVersion:global.resVersion,cardCount:global.cardCount},null,2)}`,{'reply_to_message_id':ctx.message.message_id})
	}else{
		ctx.reply(`你没有权限`,{'reply_to_message_id':ctx.message.message_id})
	}
});
bot.command('scout1', (ctx) => {scout1(ctx)});
bot.command('scout10', (ctx) => {scout10(ctx)});
bot.on('inline_query', (ctx) => {inlineScout(ctx);console.log(ctx.inlineQuery)})
bot.startPolling()


//中间件函数区
async function scout1 (ctx){ //单抽!
	console.log(await getCharacterList('tw'))
	var scouts = await scout(1,getOptServer(ctx.message.chat.id))
	ctx.replyWithPhoto(scouts[0].media,{"caption":scouts[0].caption,parse_mode:'Markdown','reply_to_message_id':ctx.message.message_id}).catch((err)=>{ctx.reply(`过于频繁!`,{'reply_to_message_id':ctx.message.message_id})})
}
async function scout10 (ctx){//抽抽抽抽抽抽抽抽抽抽!
	var scouts = await scout(10,getOptServer(ctx.message.chat.id))
	ctx.replyWithMediaGroup(scouts,{'reply_to_message_id':ctx.message.message_id}).catch((err)=>{ctx.reply(`过于频繁!`,{'reply_to_message_id':ctx.message.message_id})})
}
//基本函数
function returnRandom(){ //随机数函数
	let m = Math.random();
	let n = Math.random()/3
	if(m < 0.03){
		return 0+n;
	}
	if(m < 0.115){
		return 1/3+n;
	}
	if(m < 1){
		return 2/3+n
	}
}
function starRarity (data){ //星级卡牌筛选
	var star2 = [];
	var star3 = [];
	var star4 = [];
	for (i=0;i<data.length;i++){
		switch(data[i].rarity){
			case 2:star2.push(data[i]);break;
			case 3:star3.push(data[i]);break;
			case 4:star4.push(data[i]);break;
		}
	}
	return JSON.stringify({star2,star3,star4});
}
function characterName(cid,gameserver){//角色ID
	return global.charaLst[gameserver][cid].characterName
}
async function getCharacterList(gameserver){//角色ID
	var chara = await request.get(`https://api.bandori.ga/v1/${gameserver}/chara`).forceUpdate(true) //获取卡牌列表
	return chara.body.data
}
async function scout(i,gameserver){
	const arr = [4,3,2]
	var result = []
	for (var m=0;m<i;m++){
		var renindex = arr[parseInt(returnRandom()*arr.length)]
		var card = global.star[gameserver]['star'+renindex][Math.floor((Math.random()*global.star[gameserver]['star'+renindex].length))]
		var url = `https://bangdream.ga/card/${gameserver}/${card.cardId}/0`
		var name = characterName(card.characterId,gameserver)
		result.push({
			type:'photo',
			media:`https://res.bandori.ga/assets-${gameserver}/characters/resourceset/${card.cardRes}_rip/card_normal.png`,
			caption:`${'★'.repeat(card.rarity)} [${card.title}](${url}) ${name}`,
			parse_mode:'Markdown'
		})
	}
	return result
}
function getOptServer(chatid){
	try{
		console.log(db.getData(`/set/${crc32(chatid.toString())}`))
	}catch{
		return config.gameserver
	}
	return db.getData(`/set/${crc32(chatid.toString())}`)
}
function setOptServer(ctx){
	switch(ctx.message.text.substr(ctx.message.entities[0]['length']+1)){
		case 'jp':db.push(`/set/${crc32(ctx.message.chat.id.toString())}`,'jp');break;
		case 'kr':db.push(`/set/${crc32(ctx.message.chat.id.toString())}`,'kr');break;
		case 'tw':db.push(`/set/${crc32(ctx.message.chat.id.toString())}`,'tw');break;
		case 'en':db.push(`/set/${crc32(ctx.message.chat.id.toString())}`,'en');break;
		default:
		return ctx.replyWithMarkdown(`jp:Japan Server
kr:Korea Server
tw:RoC/Taiwan Server
en:Intl. Server
`,{'reply_to_message_id':ctx.message.message_id})
	}
	ctx.reply(`Data Lang:${db.getData('/set/'+(crc32(ctx.message.chat.id.toString())))}`,{'reply_to_message_id':ctx.message.message_id})
}
async function inlineScout(ctx){
	var scouts = await scout(1,getOptServer(ctx.inlineQuery.from.id))
	console.log(await ctx.answerInlineQuery([{
		type:'photo',
		id:'1',
		photo_url:scouts[0].media,
		thumb_url:'https://i.loli.net/2018/12/31/5c29080e36029.jpg',
		caption:scouts[0].caption,
		parse_mode:'Markdown',
		title:'Scout one!'+'Data Lang:'+getOptServer(ctx.inlineQuery.from.id)
	}],{cache_time:0,is_personal:true}))
}