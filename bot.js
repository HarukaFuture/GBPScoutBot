//HF Bandori Scout Bot 
//标准库
const fs = require('fs');
//配置区
const config = JSON.parse(fs.readFileSync('config.json','utf8'))
//NPM区
const Telegraf = require('telegraf');
const Telegram = require('telegraf/telegram');
const request = require('superagent');
//定义区
const bot = new Telegraf(config.apikey);
require('superagent-cache')(request)
//END
async function getcard (){
	var card = await request.get(`https://api.bandori.ga/v1/${config.gameserver}/card?&sort=asc&orderKey=cardId`).forceUpdate(true)
	return card.body
	}
async function getresver (){
	var resver = await request.get(`https://api.bandori.ga/v1/${config.gameserver}/version/res`).forceUpdate(true)
	return resver.text
}
async function init(){
	var cardLst = await getcard()
	star = JSON.parse(starRarity(cardLst))
	console.log(cardLst.totalCount)
	//命令区
	bot.command('scout1', (ctx) => {scout1(ctx,star)});
	bot.command('scout10', (ctx) => {scout10(ctx,star)});
	return cardLst.totalCount
}
bot.telegram.getMe().then((botInfo) => {bot.options.username = botInfo.username})
init()
bot.command('ping',(ctx) => {ctx.reply('没炸!')});
bot.command('reinit',async (ctx) => {
	if (config.admin.includes(ctx.message.from.id)){
		var cardcount =await init()
		var resver = await getresver()
		ctx.reply(`Server Resources Version:${resver}
卡牌数量:${cardcount}`,{'reply_to_message_id':ctx.message.message_id})
	}else{
		ctx.reply(`你没有权限`,{'reply_to_message_id':ctx.message.message_id})
	}
});
bot.startPolling()
//中间件函数区
async function scout1 (ctx,star){ //单抽!
	const arr = [4,3,2]
	var renindex = arr[parseInt(returnRandom()*arr.length)]
	var card = star['star'+renindex][Math.floor((Math.random()*star['star'+renindex].length))]
	var url = `https://bangdream.ga/card/${config.gameserver}/${card.cardId}/0`
	var name = await characterName(card.characterId)
	ctx.replyWithPhoto(`https://res.bandori.ga/assets-${config.gameserver}/characters/resourceset/${card.cardRes}_rip/card_normal.png`,{"caption":`${'★'.repeat(card.rarity)} [${card.title}](${url}) ${name}`,parse_mode:'Markdown','reply_to_message_id':ctx.message.message_id}).catch((err)=>{ctx.reply(`过于频繁!`,{'reply_to_message_id':ctx.message.message_id})})
}
async function scout10 (ctx,star){//抽抽抽抽抽抽抽抽抽抽!
	const arr = [4,3,2]
	var cardresult = []
	for (i=0;i<10;i++){
		var renindex = arr[parseInt(returnRandom()*arr.length)]
		var card = star['star'+renindex][Math.floor((Math.random()*star['star'+renindex].length))]
		var url = `https://bangdream.ga/card/${config.gameserver}/${card.cardId}/0`
		var name = await characterName(card.characterId)
		cardresult.push({
			type:'photo',
			media:`https://res.bandori.ga/assets-${config.gameserver}/characters/resourceset/${card.cardRes}_rip/card_normal.png`,
			caption:`${'★'.repeat(card.rarity)} [${card.title}](${url}) ${name}`,
			parse_mode:'Markdown'
		})
	}
	console.log(cardresult)
	ctx.replyWithMediaGroup(cardresult,{'reply_to_message_id':ctx.message.message_id}).catch((err)=>{ctx.reply(`过于频繁!`,{'reply_to_message_id':ctx.message.message_id})})
}
//基本函数
function returnRandom(){ //随机数函数
	var m = Math.random();
	n = Math.random()/3
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
function starRarity (cardLst){ //星级卡牌筛选
	var star2 = [];
	var star3 = [];
	var star4 = [];
	for (i=0;i<cardLst.data.length;i++){
		switch(cardLst.data[i].rarity){
			case 2:star2.push(cardLst.data[i]);break;
			case 3:star3.push(cardLst.data[i]);break;
			case 4:star4.push(cardLst.data[i]);break;
		}
	}
	return JSON.stringify({star2,star3,star4});
}
async function characterName(cid){//角色ID
	var chara = await request.get(`https://api.bandori.ga/v1/${config.gameserver}/chara/${cid}`) //获取卡牌列表
	return chara.body.characterName
}