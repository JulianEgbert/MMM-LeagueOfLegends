class DomBuilder {

	constructor(self, pathPrefix) {
		this.pathPrefix = pathPrefix + '/';
		Object.assign(this, self);
  	}

	file(name) {
		return this.pathPrefix + name;
	}

  	getDom(){
		var wrapper = document.createElement("div");
		// If rankData is available
		if (!this.loaded) {
			wrapper.innerHTML = "LOADING";
			return wrapper;
		}
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
		if (wrapper.childNodes.length === 0) { // No data available, display information
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
	}

	getMatchRow(matchId, config) {
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
			victoryLabel.classList.add(summoner.win ? "victory" : "defeat");
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
			kdaLabel.innerHTML = `
				<span class="kills"> ${summoner.kills} </span>/
				<span class="deaths"> ${summoner.deaths} </span>/
				<span class="assists"> ${summoner.assists} </span>`;
			statColumn.appendChild(kdaLabel);
			const csLabel = document.createElement("div");
			csLabel.innerHTML = `${summoner.totalMinionsKilled} cs`;
			if (config.csPerMinute)
				csLabel.innerHTML += ` (${Math.round(summoner.totalMinionsKilled * 600 / match.info.gameDuration)/10}/min)`;
			statColumn.appendChild(csLabel);
		}
		return matchRow
	}

	getClashDiv(customConfig) {
		const wrapper = document.createElement("table");
		wrapper.setAttribute("class", "LoL-Clash small");
		if (!this.clashData)
			return wrapper;
		var config = {
			count: 5,
			fadeOut: true,
		};
		Object.assign(config, customConfig);
		if (config.fadeOut)
			wrapper.classList.add("fadeout");
		const events = this.clashData.slice(0, config.count);
		// wrapper.innerHTML = JSON.stringify(events);
		if (events.length === 0) {
			wrapper.innerHTML("There are no clash matches available.");
		} else {
			events.forEach(event => {
				wrapper.appendChild(this.getClashEventRow(event));
			});
		}
		return wrapper;
	}

	getClashEventRow(event) {
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
	}

	getStatsDiv(config) {
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
	}

	getHistoryDiv(customConfig) {
		var config = {
			showTime: true,
			showStats: true,
			showQueue: true,
			showChampion: true,
			fadeOut: true,
			iconSize: 64,
			csPerMinute: true,
		};
		Object.assign(config, customConfig);
		const wrapper = document.createElement("table");
		wrapper.setAttribute("class", "LoL-Matchhistory small");
		if (config.fadeOut)
			wrapper.classList.add("fadeout");
		if (!this.historyData) {
			return wrapper;
		}
		this.matchIds.forEach(matchId => {
			const match = this.historyData[matchId];
			if (!match)
				return;
			wrapper.appendChild(this.getMatchRow(matchId, config));
		});
		if(wrapper.childNodes.length === 0) {
			wrapper.innerHTML = "There are no matches to display.";
		}
		return wrapper;
	}

	getSummonerDiv(config) {
		const wrapper = document.createElement("div");
		wrapper.setAttribute("class", "LoL-Summoner");
		var summonerNameLabel = document.createElement("label");
		summonerNameLabel.innerHTML = this.summonerData.name;
		if (config && config.showLevel) {
			summonerNameLabel.innerHTML += ` (Level ${this.summonerData.summonerLevel})`;
		}
		wrapper.appendChild(summonerNameLabel);

		return wrapper;
	}

	getTierDiv(config) {
		const wrapper = document.createElement("div");
		wrapper.setAttribute("class", "LoL-Tier");
		if (!this.queueData) {
			wrapper.innerHTML = "No data to display";
			return wrapper;
		}
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
		if (q && q.tier) {
			tierLabel.innerHTML = `${q.tier} ${q.rank} - ${q.leaguePoints} LP`;
		} else {
			tierLabel.innerHTML = "Unranked";
		}
		informationDiv.appendChild(tierLabel);
		wrapper.appendChild(informationDiv);

		return wrapper;
	}

	getRankTier() {
		return this.queueData ?(this.queueData.tier ? this.queueData.tier.toLowerCase() : "unranked") : "unranked";
	}

	getQueueFromId(id) {
		const queue = this.queues.filter(queue => queue.queueId === id)[0];
		const description = queue.description;
		if (!description)
			return queue.map.includes("Custom") ? "Custom" : "Other";
		const d = description.toLowerCase();
		if (d.includes("flex"))
			return "Flex";
		if (d.includes("solo"))
			return "Solo";
		if (d.includes("aram"))
			return "ARAM";
		if (d.includes("draft pick"))
			return "Normal draft";
		if (d.includes("bot"))
			return "Bot game";
		return description
	}

	getSummonerFromMatch(matchId) {
		const participants = this.historyData[matchId].info.participants;
		return participants.filter(p => p.puuid === this.summonerData.puuid)[0];
	}
}
