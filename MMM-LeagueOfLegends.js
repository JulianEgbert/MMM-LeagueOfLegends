/* Magic Mirror
 * Module: MMM-LeagueOfLegends
 *
 * By JulianEgbert
 * MIT Licensed.
 */

Module.register("MMM-LeagueOfLegends", {
	defaults: {
		updateInterval: 360000,
		region: "euw1",
		imageFolder: "emblems", // emblems, tiers
		showSummonerName: true,
		showDetailedRankInfo: true,
		queueType: "RANKED_SOLO_5x5", // RANKED_FLEX_SR, RANKED_SOLO_5x5
		iconSize: 256,
		showOtherQueueIfNotFound: true,
		apiKey: "", // Required
		summonerName: "", // Required
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		var self = this;
		var summonerData = null;
		var rankData = null;
		var queueData = null;
		var dataRequest = null;

		//Flag for check if module is loaded
		this.loaded = false;

		// Schedule update timer.
		this.getSummonerData();
		setInterval(function() {
			self.getRankData();
			self.updateDom();
		}, this.config.updateInterval);
	},

	getSummonerData: function() {
		var urlApi = `https://${this.config.region}.api.riotgames.com/lol/summoner/v4/summoners/by-name/${this.config.summonerName}?api_key=${this.config.apiKey}`;

		this.sendRequest(urlApi, this.processSummonerData);
	},

	getRankData: function() {
		if (!this.summonerData) {
			console.error(self.name, "No data for the summoner found");
		}
		var urlApi = `https://${this.config.region}.api.riotgames.com/lol/league/v4/entries/by-summoner/${this.summonerData.id}?api_key=${this.config.apiKey}`;

		this.sendRequest(urlApi, this.processRankData);
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

	getTierDiv: function() {
		const informationDiv = document.createElement("div");

		var tierLabel = document.createElement("label");
		const q = this.queueData;
		tierLabel.innerHTML = `${q.tier} ${q.rank} - ${q.leaguePoints} LP`;
		informationDiv.appendChild(tierLabel);

		return informationDiv;
	},

	getDom: function() {
		var self = this;

		// create element wrapper for show into the module
		var wrapper = document.createElement("div");
		// If queueData is available
		if (this.queueData) {
			if (this.config.showSummonerName) {
				var topWrapper = document.createElement("div");
				var summonerNameLabel = document.createElement("label");
				summonerNameLabel.innerHTML = this.summonerData.name;
				topWrapper.appendChild(summonerNameLabel);
				wrapper.appendChild(topWrapper);
			}

			let tierIcon = document.createElement('img');
			const rankTier = this.getRankTier();
			tierIcon.src = this.file(`img/${this.config.imageFolder}/${rankTier}.png`);
			tierIcon.alt = rankTier;
			tierIcon.width = tierIcon.height = this.config.iconSize;

			wrapper.appendChild(tierIcon);
			if (this.config.showDetailedRankInfo) {
				wrapper.appendChild(this.getTierDiv());
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
		self.getRankData();
	},

	processRankData: function(self, data) {
		self.rankData = data;
		self.prepareQueueData();
		if (self.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
		self.loaded = true;
	}
});
