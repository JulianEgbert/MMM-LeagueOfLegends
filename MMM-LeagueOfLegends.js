/* Magic Mirror
 * Module: MMM-LeagueOfLegends
 *
 * By JulianEgbert
 * MIT Licensed.
 */

Module.register("MMM-LeagueOfLegends", {
	defaults: {
		updateInterval: 60000,
		startDelay: 0,
		region: "euw1",
		matchRegion: "europe",
		language: "en-EN",
		imageFolder: "emblems",
		queueType: "RANKED_SOLO_5x5",
		iconSize: 256,
		showOtherQueueIfNotFound: true,
		apiKey: "", // Required
		summonerName: "", // Required
		displayElements: [
			{
				name: "tier",
				config: {
					hideDetailedRankInfo: false
				}
			},
			{
				name: "stats",
				config: {
					showHotStreak: true
				}
			}
		],
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		var self = this;
		var summonerData = null;
		var rankData = null;
		var queueData = null;
		var historyData = null;
		var matchIds = null;
		var version = null;
		var queues = null;
		var clashData = null;

		//Flag for check if module is loaded
		this.loaded = false;
		// Allow module to load delayed, necessary for multiple modules and requests
		setTimeout(() => {
			this.getSummonerData();
			this.getGameConstants();
			// Schedule update timer.
			if (this.config.updateInterval > 0) {
				setInterval(function() {
					self.getRankData();
					self.updateDom();
				}, this.config.updateInterval);
			}
		}, this.config.startDelay);
	},

	getSummonerData: function() {
		var urlApi = `https://${this.config.region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${this.config.summonerName}?api_key=${this.config.apiKey}`;

		this.sendRequest(urlApi, this.processSummonerData);
	},

	getGameConstants: function() {
		const versionUrl = "https://ddragon.leagueoflegends.com/api/versions.json";
		const queueUrl = "https://static.developer.riotgames.com/docs/lol/queues.json"
		this.sendRequest(versionUrl, (self, data) => {self.version = data[0]});
		this.sendRequest(queueUrl, (self, data) => {self.queues = data});
	},

	getRankData: function() {
		if (!this.summonerData) {
			console.error(self.name, "No data for the summoner found");
		}
		var urlApi = `https://${this.config.region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${this.summonerData.id}?api_key=${this.config.apiKey}`;

		this.sendRequest(urlApi, this.processRankData);
	},

	matchHistoryRequired: function() {
		const displayElements = this.config.displayElements.filter(element => typeof(element) === "object" && element.name === "history");
		return displayElements.length > 0;
	},

	matchHistoryConfig: function() {
		const historyElements = this.config.displayElements.filter(element => typeof(element) === "object" && element.name === "history");
		return historyElements[0].config;
	},

	getHistoryData: function() {
		if (!this.matchHistoryRequired()) {
			this.moduleLoaded();
			return;
		}
		if (!this.summonerData) {
			console.error(self.name, "No data for the summoner found");
		}
		const config = {
			count: 5
		};
		Object.assign(config, this.matchHistoryConfig());
		var urlApi = `https://${this.config.matchRegion}.api.riotgames.com/lol/match/v5/matches/by-puuid/${this.summonerData.puuid}/ids?count=${config.count}&api_key=${this.config.apiKey}`;
		this.sendRequest(urlApi, this.processHistoryData);
	},

	sendRequest: function(url, onSuccess) {
		var self = this;
		var request = new XMLHttpRequest();
		request.open("GET", url, true);
		request.onreadystatechange = function() {
			if (this.readyState === 4) {
				if (this.status === 200) {
					onSuccess(self, JSON.parse(this.response));
				} else if (this.status === 401) {
					self.updateDom(self.config.animationSpeed);
					Log.error(self.name, this.status);
				} else {
					Log.error(self.name, `Could not load data from "${url}".`);
				}
			}
		};
		request.send();
	},

	prepareQueueData: function() {
		if (!this.rankData || !Array.isArray(this.rankData) || this.rankData.length === 0) {
			return;
		}
		const queue = this.rankData.filter((queue) => queue.queueType === this.config.queueType);
		if (queue.length === 0 && this.config.showOtherQueueIfNotFound) { // Didn't find the queue specified in config:
			this.queueData = this.rankData[0];
			return;
		}
		this.queueData = queue[0];
	},

	getDom: function() {
		/* eslint-disable */
		let domBuilder = new DomBuilder(this, this.file(""));
		return domBuilder.getDom();
		/* eslint-enable */
	},

	getScripts: function() {
		return [
			this.file("helper/DomBuilder.js")
		];
	},

	getStyles: function () {
		return [
			"MMM-LeagueOfLegends.css",
		];
	},

	processSummonerData: function(self, data) {
		self.summonerData = data;
		self.getClashData();
		self.getRankData();
	},

	moduleLoaded() {
		if (this.loaded === false) { this.updateDom(this.config.animationSpeed) ; }
		this.loaded = true;
	},

	processRankData: function(self, data) {
		self.rankData = data;
		self.prepareQueueData();
		self.getHistoryData();
		// self.moduleLoaded(self);
	},

	processHistoryData: function(self, data) {
		self.matchIds = data;
		data.forEach(matchId => {
			self.getMatchData(matchId);
		});
		self.moduleLoaded();
	},

	getMatchData: function(matchId) {
		var urlApi = `https://${this.config.matchRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${this.config.apiKey}`;
		this.sendRequest(urlApi, this.processMatchData);
	},

	getClashData: function() {
		const urlApi = `https://euw1.api.riotgames.com/lol/clash/v1/tournaments?api_key=${this.config.apiKey}`;
		this.sendRequest(urlApi, (self, data) => {self.clashData = data.sort((a,b) => { return a.schedule[0].startTime > b.schedule[0].startTime ? 1 : -1}); self.updateDom();});
	},

	processMatchData: function(self, data) {
		if (!self.historyData) {
			self.historyData = {};
		}
		self.historyData[data.metadata.matchId] = data;
		self.updateDom();
	}
});
