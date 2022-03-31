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

	start: async function() {
		var self = this;
		this.loading = {done: 0, total: 0};
		this.summonerData = null;
		this.rankData = null;
		this.queueData = null;
		this.historyData = {};
		this.matchIds = null;
		this.version = null;
		this.queues = null;
		this.clashData = null;

		//Flag for check if module is loaded
		this.loaded = false;
		// Allow module to load delayed, necessary for multiple modules and requests
		setTimeout(() => {
			this.initData();
			// Schedule update timer.
			if (this.config.updateInterval > 0) {
				setInterval(async function() {
					self.updateData();
					self.updateDom();
				}, this.config.updateInterval);
			}
		}, this.config.startDelay);
	},

	initData: async function() {
		await this.getSummonerData();
		await this.getGameConstants();
		this.updateData();
	},

	updateData: function() {
		this.loading = {done: 0, total: 0};
		const displayElements = this.config.displayElements.map((element) => element.name);
		if (displayElements.includes("tier") || displayElements.includes("stats")) {
			this.loading.total += 1;
			this.getRankData();
		}
		if (displayElements.includes("history")) {
			this.loading.total += 1;
			this.getHistoryData();
		}
		if (displayElements.includes("clash")) {
			this.getClashData();
		}
		if (this.loading.total === 0) {
			this.moduleLoaded();
		}
	},

	getSummonerData: async function() {
		var urlApi = `https://${this.config.region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${this.config.summonerName}?api_key=${this.config.apiKey}`;

		const response = await fetch(urlApi);
		const json = await response.json();
		this.summonerData = json;
	},

	getGameConstants: async function() {
		const versionUrl = "https://ddragon.leagueoflegends.com/api/versions.json";
		const queueUrl = "https://static.developer.riotgames.com/docs/lol/queues.json";

		const versionResponse = fetch(versionUrl);
		const queueResponse = fetch(queueUrl);

		await Promise.all([versionResponse, queueResponse]).then(async (results) => {
			const versions = await results[0].json()
			this.version = versions[0];
			this.queues = await results[1].json()
		});
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

	moduleLoaded() {
		this.loaded = true;
		this.updateDom(this.config.animationSpeed);
	},

	processRankData: function(self, data) {
		self.rankData = data;
		self.prepareQueueData();
		self.dataProcessed();
	},

	dataProcessed: function() {
		this.loading.done += 1;
		if (this.loading.total <= this.loading.done) {
			this.moduleLoaded();
		}
	},

	processHistoryData: function(self, data) {
		self.matchIds = data;
		data.forEach(matchId => {
			self.getMatchData(matchId);
		});
		self.dataProcessed();
	},

	getMatchData: function(matchId) {
		if (this.historyData && this.historyData[matchId])
			return;
		var urlApi = `https://${this.config.matchRegion}.api.riotgames.com/lol/match/v5/matches/${matchId}?api_key=${this.config.apiKey}`;
		this.sendRequest(urlApi, this.processMatchData);
	},

	getClashData: function() {
		const urlApi = `https://euw1.api.riotgames.com/lol/clash/v1/tournaments?api_key=${this.config.apiKey}`;
		this.sendRequest(urlApi, (self, data) => {
			self.clashData = data.sort((a,b) => { return a.schedule[0].startTime > b.schedule[0].startTime ? 1 : -1});
			self.updateDom();
		});
	},

	processMatchData: function(self, data) {
		if (!self.historyData) {
			self.historyData = {};
		}
		self.historyData[data.metadata.matchId] = data;
		self.updateDom();
	}
});
