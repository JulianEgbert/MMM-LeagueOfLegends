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
		apiKey: "", // Required
		summonerName: "", // Required
	},

	requiresVersion: "2.1.0", // Required version of MagicMirror

	start: function() {
		var self = this;
		var summonerData = null;
		var rankData = null;
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

	getDom: function() {
		var self = this;

		// create element wrapper for show into the module
		var wrapper = document.createElement("div");
		// If this.rankData is not empty
		if (this.rankData) {
			var wrapperDataRequest = document.createElement("div");
			wrapperDataRequest.innerHTML = JSON.stringify(this.rankData, null, 2);

			var summonerNameLabel = document.createElement("label");
			// Use translate function
			//             this id defined in translations files
			summonerNameLabel.innerHTML = this.summonerData.name;


			wrapper.appendChild(summonerNameLabel);
			wrapper.appendChild(wrapperDataRequest);
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
		console.log(self.rankData);
		if (self.loaded === false) { self.updateDom(self.config.animationSpeed) ; }
		self.loaded = true;
	}
});
