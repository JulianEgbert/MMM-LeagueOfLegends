/* Magic Mirror
 * Module: MMM-LeagueOfLegends
 *
 * By JulianEgbert
 * MIT Licensed.
 */

Module.register("MMM-LeagueOfLegends", {
	defaults: {
		updateInterval: 360000,
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
			setInterval(function() {
				self.getRankData();
				self.updateDom();
			}, this.config.updateInterval);
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

	getRankTier: function() {
		return this.queueData ? this.queueData.tier.toLowerCase() : "unranked";
	},

	getSummonerDiv: function(config) {
		const wrapper = document.createElement("div");
		wrapper.setAttribute("class", "LoL-Summoner");
		var summonerNameLabel = document.createElement("label");
		summonerNameLabel.innerHTML = this.summonerData.name;
		if (config && config.showLevel) {
			summonerNameLabel.innerHTML += ` (Level ${this.summonerData.summonerLevel})`;
		}
		wrapper.appendChild(summonerNameLabel);

		return wrapper;
	},

	getTierDiv: function(config) {
		const wrapper = document.createElement("div");
		wrapper.setAttribute("class", "LoL-Tier");
		// create the icon:
		let tierIcon = document.createElement("img");
		const rankTier = this.getRankTier();
		tierIcon.src = this.file(`img/${this.config.imageFolder}/${rankTier}.png`);
		tierIcon.alt = rankTier;
		tierIcon.width = tierIcon.height = this.config.iconSize;
		wrapper.appendChild(tierIcon);

		if (config && config.hideDetailedRankInfo) {
			return wrapper;
		}
		// create the text with Tier, Division and LP if requested:
		const informationDiv = document.createElement("div");
		var tierLabel = document.createElement("label");
		const q = this.queueData;
		if (q) {
			tierLabel.innerHTML = `${q.tier} ${q.rank} - ${q.leaguePoints} LP`;
		} else {
			tierLabel.innerHTML = "Unranked";
		}
		informationDiv.appendChild(tierLabel);
		wrapper.appendChild(informationDiv);

		return wrapper;
	},

	getStatsDiv: function(config) {
		const wrapper = document.createElement("div");
		wrapper.setAttribute("class", "LoL-Stats");
		// create the icon:
		var statsLabel = document.createElement("label");
		const q = this.queueData;
		if (!q) {
			return wrapper;
		}
		const winrate = Math.round(q.wins * 100 / (q.wins + q.losses));
		statsLabel.innerHTML = `${q.wins}W ${q.losses}L, ${winrate}% `;
		wrapper.appendChild(statsLabel);
		if (config && config.showHotStreak && q["hotStreak"]) {
			var hotStreakLabel = document.createElement("span");
			hotStreakLabel.setAttribute("class", "fa fa-fire");
			wrapper.appendChild(hotStreakLabel);
		}

		return wrapper;
	},

	getHistoryDiv: function(customConfig) {
		var config = {
			showTime: true,
			showStats: true,
			showQueue: true,
			showChampion: true,
			iconSize: 64,
			csPerMinute: true,
		};
		Object.assign(config, customConfig);
		const wrapper = document.createElement("table");
		wrapper.setAttribute("class", "LoL-Matchhistory small")
		if (!this.historyData) {
			return wrapper;
		}
		this.matchIds.forEach(matchId => {
			const match = this.historyData[matchId];
			if (!match)
				return;
			wrapper.appendChild(this.getMatchRow(matchId, config));
		});
		return wrapper;
	},

	getQueueFromId: function(id) {
		const queue = this.queues.filter(queue => queue.queueId === id)[0];
		const description = queue.description;
		if (!description)
			return queue.map.includes("Custom") ? "Custom" : "Other";
		const d = description.toLowerCase();
		return d.includes("flex")
			? "Flex"
			: (d.includes("solo")
				? "Solo"
				: (d.includes("aram")
					? "ARAM"
					: description));
	},

	getMatchRow: function(matchId, config) {
		const match = this.historyData[matchId];
		const matchRow = document.createElement("tr");
		const summoner = this.getSummonerFromMatch(matchId);

		// Champion Icon
		if (config.showChampion) {
			const iconColumn = document.createElement("td");
			matchRow.appendChild(iconColumn);
			const championIcon = document.createElement("img");
			championIcon.src = `http://ddragon.leagueoflegends.com/cdn/${this.version}/img/champion/${summoner.championName}.png`;
			championIcon.width = championIcon.height = config.iconSize;
			iconColumn.appendChild(championIcon);
		}

		// Game Info
		if (config.showQueue) {
			const infoColumn = document.createElement("td");
			matchRow.appendChild(infoColumn);
			const victoryLabel = document.createElement("div");
			victoryLabel.innerHTML = summoner.win ? "Victory" : "Defeat";
			infoColumn.appendChild(victoryLabel);
			const gameLabel = document.createElement("div");
			gameLabel.innerHTML = this.getQueueFromId(match.info.queueId);
			infoColumn.appendChild(gameLabel);
		}

		// time
		if (config.showTime) {
			const timeColumn = document.createElement("td");
			matchRow.appendChild(timeColumn);
			const timeLabel = document.createElement("div");
			const options = { year: 'numeric', month: 'numeric', day: 'numeric' };
			const s = new Date(match.info.gameCreation).toLocaleDateString(this.config.language, options);
			timeLabel.innerHTML = s;
			timeColumn.appendChild(timeLabel);
			const durationLabel = document.createElement("div");
			durationLabel.innerHTML = `${Math.floor(match.info.gameDuration / 60)}:${match.info.gameDuration % 60}`;
			timeColumn.appendChild(durationLabel);
		}

		// Player stats
		if (config.showStats) {
			const statColumn = document.createElement("td");
			matchRow.appendChild(statColumn);
			const kdaLabel = document.createElement("div");
			kdaLabel.innerHTML = `${summoner.kills}/${summoner.deaths}/${summoner.assists}`;
			statColumn.appendChild(kdaLabel);
			const csLabel = document.createElement("div");
			csLabel.innerHTML = `${summoner.totalMinionsKilled} cs`;
			if (config.csPerMinute)
				csLabel.innerHTML += ` (${Math.round(summoner.totalMinionsKilled * 600 / match.info.gameDuration)/10}/min)`;
			statColumn.appendChild(csLabel);
		}
		return matchRow
	},

	getSummonerFromMatch: function(matchId) {
		const participants = this.historyData[matchId].info.participants;
		return participants.filter(p => p.puuid === this.summonerData.puuid)[0];
	},

	getClashDiv: function(customConfig) {
		const wrapper = document.createElement("table");
		wrapper.setAttribute("class", "LoL-Clash small");
		if (!this.clashData)
			return wrapper;
		var config = {
			count: 5,
		};
		Object.assign(config, customConfig);
		const events = this.clashData.slice(0, config.count);
		// wrapper.innerHTML = JSON.stringify(events);
		events.forEach(event => {
			wrapper.appendChild(this.getClashEventRow(event));
		});
		return wrapper;
	},

	getClashEventRow: function(event) {
		const eventRow = document.createElement("tr");
		const iconColumn = document.createElement("td");
		iconColumn.setAttribute("class", "symbol align-right")
		eventRow.appendChild(iconColumn);
		iconColumn.setAttribute("class", "fas fa-trophy");
		const nameColumn = document.createElement("td");
		eventRow.appendChild(nameColumn);
		nameColumn.setAttribute("class", "title bright");
		const name = event.nameKey[0].toUpperCase() + event.nameKey.substring(1) + " Clash";
		const day = event.nameKeySecondary.match(/\d/)[0];
		nameColumn.innerHTML = `${name} (Day ${day})`;
		const dateColumn = document.createElement("td");
		dateColumn.setAttribute("class", "time light")
		eventRow.appendChild(dateColumn);
		const date = new Date(0);
		date.setUTCSeconds(event.schedule[0].startTime / 1000);
		const options = { year: 'numeric', month: 'long', day: 'numeric' };
		dateColumn.innerHTML = date.toLocaleDateString(this.config.language, options);
		return eventRow;
	},

	getDom: function() {
		// create element wrapper for show into the module
		var wrapper = document.createElement("div");
		// If rankData is available
		if (this.rankData) {
			this.config.displayElements.forEach(displayElement => {
				const name = displayElement.name.toLowerCase();
				switch(name) {
					case "tier":
						wrapper.appendChild(this.getTierDiv(displayElement.config));
						break;
					case "stats":
						wrapper.appendChild(this.getStatsDiv(displayElement.config));
						break;
					case "summoner":
						wrapper.appendChild(this.getSummonerDiv(displayElement.config));
						break;
					case "history":
						wrapper.appendChild(this.getHistoryDiv(displayElement.config));
						break;
					case "clash":
						wrapper.appendChild(this.getClashDiv(displayElement.config));
						break;
					default:
						break;
				}
			});

		} else { // No data available, display information
			const errorWrapper = document.createElement("div");
			errorWrapper.innerHTML = `${this.name}: An error occured: There is not data to display.`;
			wrapper.appendChild(errorWrapper);
			const description = document.createElement("paragraph");
			wrapper.appendChild(description);
			if (!this.summonerData) {
				description.innerHTML = "No summoner Data present. Please check your API-Key, Region and Summoner Name.";
			} else {
				description.innerHTML = `This is your summoner Data: ${JSON.stringify(this.summonerData)}. Something else went wrong. Maybe you are unranked?`;
			}
		}

		return wrapper;
	},

	getScripts: function() {
		return [];
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
