// classes

Array.prototype.removeLast = function(value) {
	var index = this.lastIndexOf(value)
	if (index !== -1) {
		this.splice(index, 1)
	}
	else {
		throw new Error("Value not found in array.")
	}
}

class Tuple {
	constructor(z, y, x) {
		this.z = z
		this.y = y
		this.x = x
	}
}

class Modifier {
	constructor() {
		this.add = 0
		this.mult = 0
	}
}

class City {
	constructor() {
		this.name = ""
		this.id = nextId++
		this.facilities = [new IndustrialBase()] // new bases get a free Industrial Base
		this.productionQueue = [new StockpileMinerals()] // default production is Stockpile Minerals
		this.population = 1
		this.build = function() {
			// advance construction progress on end turn
			var mineralsPerTurn = this.getTotalResource("minerals")
			var currentProduction = this.productionQueue[0]
			currentProduction.currentMinerals += mineralsPerTurn
			if (currentProduction.currentMinerals >= currentProduction.mineralCost) {
				// production complete, append to facilities list or create unit
				this.facilities.push(currentProduction)
				console.log(this.facilities)
				// reset queue
				this.productionQueue = [ new StockpileMinerals() ]
			}
		}
		this.generateName = function() {
			var i = Math.floor( Math.random()*cityNamesList.length )
			var name = cityNamesList[i]
			// remove name so it cannot be used again
			cityNamesList.removeLast(name)
			this.name = name
		}
		this.getResourceTiles = function() {
			var c = getTileCoordinatesByItemId(this.id)
			var resourceTiles = []
			resourceTiles.push( new Tuple(c.z, c.y-2, c.x-1) )
			resourceTiles.push( new Tuple(c.z, c.y-2, c.x) )
			resourceTiles.push( new Tuple(c.z, c.y-2, c.x+1) )
			resourceTiles.push( new Tuple(c.z, c.y-1, c.x-2) )
			resourceTiles.push( new Tuple(c.z, c.y-1, c.x-1) )
			resourceTiles.push( new Tuple(c.z, c.y-1, c.x) )
			resourceTiles.push( new Tuple(c.z, c.y-1, c.x+1) )
			resourceTiles.push( new Tuple(c.z, c.y-1, c.x+2) )
			resourceTiles.push( new Tuple(c.z, c.y, c.x-2) )
			resourceTiles.push( new Tuple(c.z, c.y, c.x-1) )
			resourceTiles.push( new Tuple(c.z, c.y, c.x) )
			resourceTiles.push( new Tuple(c.z, c.y, c.x+1) )
			resourceTiles.push( new Tuple(c.z, c.y, c.x+2) )
			resourceTiles.push( new Tuple(c.z, c.y+1, c.x-2) )
			resourceTiles.push( new Tuple(c.z, c.y+1, c.x-1) )
			resourceTiles.push( new Tuple(c.z, c.y+1, c.x) )
			resourceTiles.push( new Tuple(c.z, c.y+1, c.x+1) )
			resourceTiles.push( new Tuple(c.z, c.y+1, c.x+2) )
			resourceTiles.push( new Tuple(c.z, c.y+2, c.x-1) )
			resourceTiles.push( new Tuple(c.z, c.y+2, c.x) )
			resourceTiles.push( new Tuple(c.z, c.y+2, c.x+1) )
			return resourceTiles
		}
		// holy dooly folks, this is a big one
		this.getTileResource = function(resource, z, y, x) {
			if ( tileExists(z, y, x) ) {
				// get resources before modifiers
				var output = map[z][y][x][resource]
				// initialize modifiers
				var add = 0
				var mult = 0
				var c = getTileCoordinatesByItemId(this.id)
				if (c.z === z && c.y === y && c.x === x) {
					// base tile, no modifiers from structures
					
					// no penalty from lack of structures
					mult = 1
					
					// look through facilities
					
					// if Industrial Base, max(3, output)
					if ( active.facilities.find( i => i.constructor.name == "IndustrialBase") ) {
						output = Math.max(3, output)
					}
					// if Recycler, output+1
					if ( active.facilities.find( i => i.constructor.name == "Recycler") ) {
						output = output + 1
					}
				}
				else {
					// non-base tile, use standard calculation
					
					// apply modifiers from structures, if any
					var structures = map[z][y][x].structures
					if (structures.length !== 0) {
						for (var s of structures) {
							add += s[resource].add
							mult += s[resource].mult
						}
					}
				}
				// apply facility modifiers to base and non-base tiles
				var facilities = active.facilities
				if (facilities.length !== 0) {
					for (var f of facilities) {
						add += f[resource].add
						mult += f[resource].mult
					}
				}
				return mult*output + add
			}
			else {
				// tile does not exist
				return 0
			}
		}
		this.drawResources = function() {
			var resourceTiles = this.getResourceTiles()
			for (var c of resourceTiles) {
				if ( tileExists(c.z, c.y, c.x) ) {
					var tile = getUiTileByCoordinates(c.z, c.y, c.x)
					var span = document.createElement("span")
					span.className = "resourceLabel"
					span.textContent = 
						"N: " + this.getTileResource("food", c.z, c.y, c.x) + " " +
						"M: " + this.getTileResource("minerals", c.z, c.y, c.x) + " " +
						"C: " + this.getTileResource("credits", c.z, c.y, c.x)
					tile.appendChild(span)
				}
			}
		}
		// private
		this.getTotalResource = function(resource) {
			var resourceTiles = this.getResourceTiles()
			var total = 0
			for (var c of resourceTiles) {
				total += this.getTileResource(resource, c.z, c.y, c.x)
			}
			return total
		}
	}
}

class Facility {
	constructor() {
		this.name = ""
		this.id = nextId++
		this.currentMinerals = 0
		this.mineralCost = 0
		this.upkeep = 0
		this.available = true
		this.food = new Modifier()
		this.minerals = new Modifier()
		this.credits = new Modifier()
		this.creditsMult = 0
	}
}

class StockpileMinerals extends Facility {
	constructor() {
		super()
		this.name = "Stockpile Minerals"
		this.mineralCost = 999
	}
}

class IndustrialBase extends Facility {
	constructor() {
		super()
		this.name = "Industrial Base"
		this.mineralCost = 0
		this.upkeep = 0
	}
}

class AdministrationNexus extends Facility {
	constructor() {
		super()
		this.name = "Administration Nexus"
		this.mineralCost = 30
		this.upkeep = 0
		this.food.mult = 0.25
		this.minerals.mult = 0.25
		this.credits.mult = 0.25
	}
}

class Recycler extends Facility {
	constructor() {
		super()
		this.name = "Recycler"
		this.mineralCost = 20
		this.upkeep = 0
	}
}

class BiologyLab extends Facility {
	constructor() {
		super()
		this.name = "Biology Lab"
		this.mineralCost = 30
		this.upkeep = 1
	}
}

class Unit {
	constructor() {
		this.id = nextId++
		this.name = ""
		this.shortName = ""
		this.attack = 0
		this.defense = 0
		this.currentMoves = 0
		this.maxMoves = 0
		this.currentMinerals = 0
		this.mineralCost = 0
		this.currentHealth = 0
		this.maxHealth = 0
		this.upkeep = 0
		this.available = true
		this.disband = function() {
			// remove unit from tile
			var tile = getItemTileById(this.id)
			tile.units.removeLast(this)
			active = undefined
			render()
		}
		this.resetMoves = function() {
			this.currentMoves = this.maxMoves
		}
		this.moveTo = function(z, y, x) {
			if ( this.currentMoves >= 1 && tileExists(z, y, x) ) {
				var targetTile = map[z][y][x]
				var hostTile = getItemTileById(this.id)
				targetTile.units.push(this)
				hostTile.units.removeLast(this)
				this.currentMoves--
				render()
			}
		}
	}
}

class ScoutSkimmer extends Unit {
	constructor() {
		super()
		this.name = "Scout Skimmer"
		this.shortName = "scoutSkimmer"
		this.attack = 0
		this.defense = 0
		this.currentMoves = 6
		this.maxMoves = 6
		this.currentHealth = 10
		this.maxHealth = 10
		this.mineralCost = 10
	}
}

class PodSkimmer extends Unit {
	constructor() {
		super()
		this.name = "Pod Skimmer"
		this.shortName = "podSkimmer"
		this.attack = 0
		this.defense = 0
		this.currentMoves = 3
		this.maxMoves = 3
		this.currentHealth = 10
		this.maxHealth = 10
		this.mineralCost = 10
		this.buildCity = function() {
			if (this.currentMoves >= 1) {
				var city = new City()
				city.generateName()
				var c = getActiveCoordinates()
				map[c.z][c.y][c.x].city = city
				cityList.push(city)
				this.disband()
				render()
			}
		}
	}
}

class EngineerSkimmer extends Unit {
	constructor() {
		super()
		this.name = "Engineer Skimmer"
		this.attack = 0
		this.defense = 0
		this.currentMoves = 3
		this.maxMoves = 3
		this.currentHealth = 10
		this.maxHealth = 10
		this.mineralCost = 20
	}
}

class Tile {
	constructor() {
		this.name = ""
		this.shortName = ""
		this.terrain = ""
		this.bonus = ""
		this.special = ""
		this.units = []
		this.structures = []
		this.city
		this.food = 0
		this.minerals = 0
		this.credits = 0
	}
}

class Structure {
	constructor() {
		this.name = ""
		this.id = nextId++
		this.food = new Modifier()
		this.minerals = new Modifier()
		this.credits = new Modifier()
		this.buildTime = 0
	}
}

class Hydroculture extends Structure {
	constructor() {
		super()
		this.name = Hydroculture
		this.food.mult = 1
		this.minerals.mult = 1
		this.credits.mult = 1
		this.buildTime = 3
	}
}

class OpenOcean extends Tile {
	constructor() {
		super()
		this.name = "Open Ocean"
		this.shortName = "openOcean"
		this.food = 2
		this.minerals = 0
		this.credits = 4
	}
}

// global variables

var turn = 1
var unitList = []
var nextId = 0
var active
var cityNamesList = ["Alpha Prime", "Glorious Awakening", "New Inception", "Terra Nova"]
var cityList = []

var mapSize = 7
var map = []
map[0] = []
for (var y=0; y<mapSize; y++) {
	map[0][y] = []
	for (var x=0; x<mapSize; x++) {
		map[0][y][x] = new OpenOcean()
	}
}

// events

document.getElementById("productionMenu").onchange = changeProduction

document.getElementById("buildCity").onclick = buildCity

document.getElementById("disband").onclick = function() {
	if (active.disband !== undefined) {
		active.disband()
	}
}

document.getElementById("endTurn").onclick = endTurn

function onItemSelect(e) {
	active = getItemById(e.target.id)
	document.getElementById("active").textContent = "Active: " + active.name
	if ( active.constructor.name == "City") {
		openBaseControl()
	}
	else {
		closeBaseControl()
	}
}

onkeypress = function(e) {
	// global shortcuts
	switch (e.which) {
		case 13:
			// enter
			endTurn()
			break
	}
	if (active !== undefined) {
		// shortcuts for active unit
		var tile = getActiveCoordinates()
		switch (e.which) {
			case 100:
				// d
				if (active.disband !== undefined) {
					active.disband()
				}
				break
			case 98:
				// b
				if (active.buildCity !== undefined) {
					active.buildCity()
				}
				break
			case 56:
				// up
				active.moveTo(tile.z, tile.y-1, tile.x-1)
				break
			case 57:
				// up right
				active.moveTo(tile.z, tile.y-1, tile.x)
				break
			case 54:
				// right
				active.moveTo(tile.z, tile.y-1, tile.x+1)
				break
			case 51:
				// down right
				active.moveTo(tile.z, tile.y, tile.x+1)
				break
			case 50:
				// down
				active.moveTo(tile.z, tile.y+1, tile.x+1)
				break
			case 49:
				// down left
				active.moveTo(tile.z, tile.y+1, tile.x-1)
				break
			case 52:
				// left
				active.moveTo(tile.z, tile.y+1, tile.x-1)
				break
			case 55:
				// up left
				active.moveTo(tile.z, tile.y, tile.x-1)
				break
			default:
				break;
		}
	}
}

// utility functions

function getActiveCoordinates() {
	return getTileCoordinatesByItemId(active.id)
}

function getTileCoordinatesByItemId(id) {
	var z=0
	for (var y=0; y<map[z].length; y++) {
		for (var x=0; x<map[z][y].length; x++) {
			tile = map[z][y][x]
			var units = tile.units
			if (units.length !== 0) {
				for (var i=0; i<units.length; i++) {
					if ( units[i].id == id ) {
						return new Tuple(z, y, x)
					}
				}
			}
			var city = tile.city
			if (city !== undefined) {
				if (city.id === id) {
					return new Tuple(z, y, x)
				}
			}
		}
	}
}

function getUiTileByCoordinates(z, y, x) {
	return document.getElementById(z + "," + y + "," + x)
}

function tileExists(z, y, x) {
	if ( map[z] !== undefined ) {
		if ( map[z][y] !== undefined ) {
			if ( map[z][y][x] !== undefined) {
				return true
			}
		}
	}
	return false;
}

function getItemTileById(id) {
	var z=0
	for (var y=0; y<map[z].length; y++) {
		for (var x=0; x<map[z][y].length; x++) {
			var tile = map[z][y][x]
			if (tile.units.length !== 0) {
				for (i=0; i<tile.units.length; i++) {
					if (tile.units[i].id == id) {
						return tile
					}
				}
			}
			if (tile.city !== undefined) {
				if (tile.city.id == id) {
					return tile
				}
			}
		}
	}
}

function getItemById(id) {
	var z=0
	for (var y=0; y<map[z].length; y++) {
		for (var x=0; x<map[z][y].length; x++) {
			var tile = map[z][y][x]
			if (tile.units.length !== 0) {
				for (i=0; i<tile.units.length; i++) {
					if (tile.units[i].id == id) {
						return tile.units[i]
					}
				}
			}
			if (tile.city !== undefined) {
				if (tile.city.id == id) {
					return tile.city
				}
			}
		}
	}
}

// game functions

function openBaseControl() {
	render()
	document.getElementById("cityName").textContent = active.name
	active.drawResources()
	document.getElementById("food").textContent = active.getTotalResource("food")
	document.getElementById("minerals").textContent = active.getTotalResource("minerals")
	document.getElementById("credits").textContent = active.getTotalResource("credits")
	populateProductionMenu()
	showProductionProgress()
	populateFacilityList()
	// show base control screen
	document.getElementById("baseControl").style.display = "inline-block"
	
}

function closeBaseControl() {
	render()
	document.getElementById("baseControl").style.display = "none"
}

function showProductionProgress() {
	var productionProgress = document.getElementById("productionProgress")
	productionProgress.value = active.productionQueue[0].currentMinerals
	productionProgress.max = active.productionQueue[0].mineralCost
}

function changeProduction() {
	var productionTarget = document.getElementById("productionMenu").value
	active.productionQueue = [ new productionMenu[productionTarget]() ]
}

function populateFacilityList() {
	// clear existing list
	var facilitiesList = document.getElementById("facilitiesList")
	while (facilitiesList.firstElementChild != undefined) {
		facilitiesList.firstElementChild.remove()
	}
	// populate list
	for (var i of active.facilities) {
		var div = document.createElement("div")
		div.textContent = i.name
		facilitiesList.appendChild(div)
	}
}

function populateProductionMenu() {
	var menu = document.getElementById("productionMenu")
	// clear existing menu
	while (menu.firstElementChild != null) {
		menu.firstElementChild.remove()
	}
	// populate
	for (var i=0; i<productionMenu.length; i++) {
		var option = document.createElement("option")
		// this shit shouldn't even be possible, like wtf javascript
		//option.textContent = new productionMenu[i]().name
		option.textContent = productionMenu[i].name
		option.value = i
		menu.appendChild(option)
	}
	// display current production target
	menu.value = productionMenu.indexOf(active.productionQueue[0].constructor)
}

function buildCity() {
	if (active !== undefined && active.buildCity !== undefined) {
		active.buildCity()
	}
}

function endTurn() {
	// remember last active
	var oldActive = active
	// reset unit moves
	for (var unit of unitList) {
		unit.resetMoves()
	}
	// advance facility and unit construction
	for (var city of cityList) {
		active = city // quick and dirty workaround ;)
		city.build()
	}
	// reset active unit
	active = oldActive
	turn++
	render()
}

function initialize() {
	var mapDiv = document.getElementById("map")
	var z = 0
	for (var y=0; y<map[z].length; y++) {
		var row = document.createElement("div")
		row.id = "row" + y
		row.className = "row"
		mapDiv.appendChild(row)
		var currentRow = document.getElementById("row" + y)
		for (var x=0; x<map[0][y].length; x++) {
			var tile = document.createElement("div")
			tile.id = z + "," + y + "," + x
			tile.className = "tile"
			currentRow.appendChild(tile)
		}
	}
}

function render() {
	var mapDiv = document.getElementById("map")
	var z = 0;
	document.getElementById("turn").textContent = "Turn: " + turn
	// render map
	for (var y=0; y<map[z].length; y++) {
		for (var x=0; x<map[z][y].length; x++) {
			var target = document.getElementById(z + "," + y + "," + x)
			// Reset style
			target.className = "tile"
			var tile = map[z][y][x]
			// Remove all HTML elements from UI tiles
			while (target.firstElementChild != undefined) {
				target.firstElementChild.remove()
			}
			// Apply tile background
			var shortName = tile.shortName
			target.classList.add(shortName)
			// Render city if present
			if (tile.city !== undefined) {
				var button = document.createElement("button")
				button.id = tile.city.id
				button.textContent = tile.city.name
				button.onclick = onItemSelect
				button.className = "city"
				target.appendChild(button)
			}
			// Render units if present
			if (tile.units.length !== 0) {
				for (i=0; i<tile.units.length; i++) {
					currentUnit = tile.units[i]
					var button = document.createElement("button")
					button.id = currentUnit.id
					button.className = "unit"
					button.textContent = currentUnit.name + " (" + currentUnit.currentMoves + ")"
					button.onclick = onItemSelect
					target.appendChild(button)
				}
			}
		}
	}
	// render status bar
	if (active !== undefined) {
		// active unit or city
		document.getElementById("active").textContent = "Active: " + active.name
	}
	else {
		document.getElementById("active").textContent = "Active: None"
	}
}

// begin

var productionMenu = [StockpileMinerals, AdministrationNexus, Recycler, BiologyLab, PodSkimmer, ScoutSkimmer, EngineerSkimmer]
map[0][3][3].units.push( new PodSkimmer() )
unitList.push( map[0][3][3].units[0] )
initialize()
render()