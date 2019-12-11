"use strict"

// classes

class Game {
	
	#activePiece
	
	set active(piece) {
		if (piece != undefined) {
			if (piece instanceof Unit) {
				// changing to a unit
				// update active label
				document.getElementById("active").textContent = "Active: " + piece.constructor.fullName
				// update moves label
				document.getElementById("moves").textContent = "Moves: " + piece.currentMoves
				if (this.active instanceof City) {
					// we are switching a city to a unit, so close base control
					closeBaseControl()
				}
				// play default sound
				audioPieces.src = piece.sound
				audioPieces.play()
			}
			else if (piece instanceof City) {
				// a city will be active
				document.getElementById("active").textContent = "Active: " + piece.fullName
				// delete number of moves
				document.getElementById("moves").textContent = "Moves: N/A"
			}
		}
		else {
			// there will be no active unit
			document.getElementById("active").textContent = "Active: None"
		}
		
		this.#activePiece = piece
	}
	
	get active() {
		return this.#activePiece
	}
	
	constructor(map, active, turn) {
		this.map = map
		this.active = active
		this.turn = turn
	}
}

class Tuple {
	constructor(z, y, x) {
		this.z = z
		this.y = y
		this.x = x
	}
	
	equals(tuple) {
		if (
			tuple instanceof Tuple &&
			this.x == tuple.x &&
			this.y == tuple.y &&
			this.z == tuple.z
		) {
			return true;
		}
		else {
			return false
		}
	}
}

class Piece {
	constructor() {
		this.name = ""
		this.id = nextId++
	}
}

class City extends Piece {
	constructor() {
		super()
		this.facilities = [new IndustrialBase()] // new bases get a free Industrial Base
		this.productionQueue = [new StockpileMinerals()] // default production is Stockpile Minerals
		this.population = 1
		this.sound = "sound/menu2.wav"
		this.build = function() {
			// advance construction progress on end turn
			var mineralsPerTurn = this.getTotalResource("minerals")
			var currentProduction = this.productionQueue[0]
			currentProduction.currentMinerals += mineralsPerTurn
			if (currentProduction.currentMinerals >= currentProduction.constructor.mineralCost) {
				// production complete, append to facilities list or create unit
				if (currentProduction instanceof Facility) {
					this.facilities.push(currentProduction)
					// play sound
					audioInterface.src = "sound/cpu prod complete.wav"
					audioInterface.play()
				}
				else if (currentProduction instanceof Unit) {
					// add unit to map, then push to unitList
					var c = getCoordinatesByItemId(this.id)
					map[c.z][c.y][c.x].units.push(currentProduction)
					unitList.push(currentProduction)
					// play sound
					audioInterface.src = "sound/cpu prod complete.wav"
					audioInterface.play()
				}
				// reset queue
				if (this.productionQueue.length == 1) {
					// this was the last item, so automatically stockpile minerals
					this.productionQueue = [ new StockpileMinerals() ]
				}
				else {
					// there are additional items in the production queue, so pop the item we just built off
					this.productionQueue.pop()
				}
			}
		}
		this.generateName = function() {
			var i = Math.floor( Math.random()*cityNamesList.length )
			var name = cityNamesList[i]
			// remove name so it cannot be used again
			cityNamesList.removeLast(name)
			this.fullName = name
		}
		this.getResourceTiles = function() {
			var c = getCoordinatesByItemId(this.id)
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
				var c = getCoordinatesByItemId(this.id)
				
				// city tile, no structures allowed
				if (c.z == z && c.y == y && c.x == x) {
					// look through facilities instead
					
					// if Industrial Base, max(2, output)
					if ( this.facilities.find( i => i instanceof IndustrialBase) ) {
						output = Math.max(2, output)
					}
					// if Recycler, output+1
					if ( this.facilities.find( i => i instanceof Recycler) ) {
						output = output + 1
					}
				}
				// non-base tile, use standard calculation
				else {
					// apply modifiers from structures, if any
					var structures = map[z][y][x].structures
					// missing flotation farm
					if (resource == "food") {
						if ( structures.find( i => i instanceof FlotationFarm) == undefined ) {
							output = 0
						}
					}
					// missing solar array
					if (resource == "credits") {
						if ( structures.find( i => i instanceof SolarArray) == undefined ) {
							output = 0
						}
					}
				}
				// apply facility modifiers for base/non-base tiles
				return output
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
						this.getTileResource("food", c.z, c.y, c.x) + " " +
						this.getTileResource("minerals", c.z, c.y, c.x) + " " +
						this.getTileResource("credits", c.z, c.y, c.x)
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
		this.id = nextId++
		this.currentMinerals = 0
		this.upkeep = 0
		this.available = true
		this.creditsMult = 0
	}
}

class StockpileMinerals extends Facility {
	static fullName = "Stockpile Minerals"
	static mineralCost = 999
	constructor() {
		super()
	}
}


class IndustrialBase extends Facility {
	static fullName = "Industrial Base"
	static mineralCost = 0
	static upkeep = 0
	constructor() {
		super()
	}
}

class AdministrationNexus extends Facility {
	static fullName = "Administration Nexus"
	static mineralCost = 30
	static upkeep = 0
	constructor() {
		super()
		this.upkeep = 0
		this.food.mult = 0.25
		this.minerals.mult = 0.25
		this.credits.mult = 0.25
	}
}

class Recycler extends Facility {
	static fullName = "Recycler"
	static mineralCost = 20
	static upkeep = 20
	constructor() {
		super()
	}
}

class BiologyLab extends Facility {
	static fullName = "Biology Lab"
	static mineralCost = 30
	static upkeep = 1
	constructor() {
		super()
	}
}

class Unit extends Piece {
	#currentMoves
	set currentMoves(n) {
		document.getElementById("moves").textContent = "Moves: " + n
		this.#currentMoves = n
	}
	get currentMoves() {
		return this.#currentMoves
	}
	constructor() {
		super()
		this.attack = 0
		this.defense = 0
		this.maxMoves = 0
		this.currentMinerals = 0
		this.currentHealth = 0
		this.maxHealth = 0
		this.upkeep = 0
		this.available = true
		this.disband = function() {
			// remove unit from tile
			var tile = getItemTileById(this.id)
			tile.units.removeLast(this)
			// remove unit from unitList
			unitList.removeLast(this)
			game.active = undefined
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
	static fullName = "Scout Skimmer"
	static shortName = "scoutSkimmer"
	static mineralCost = 10
	constructor() {
		super()
		this.attack = 0
		this.defense = 0
		this.currentMoves = 6
		this.maxMoves = 6
		this.currentHealth = 10
		this.maxHealth = 10
		this.sound = "sound/ship.wav"
	}
}

class PodSkimmer extends Unit {
	static fullName = "Pod Skimmer"
	static shortName = "podSkimmer"
	static mineralCost = 10
	constructor() {
		super()
		this.attack = 0
		this.defense = 0
		this.currentMoves = 3
		this.maxMoves = 3
		this.currentHealth = 10
		this.maxHealth = 10
		this.sound = "sound/ship.wav"
	}
	buildCity = function() {
		if (this.currentMoves >= 1) {
			var city = new City()
			city.generateName()
			var c = getActiveCoordinates()
			map[c.z][c.y][c.x].city = city
			cityList.push(city)
			this.disband()
			render()
			// open the most recently-created city
			game.active = cityList[cityList.length-1]
			openBaseControl()
		}
	}
	
}

class EngineerSkimmer extends Unit {
	static fullName = "Engineer Skimmer"
	static shortName = "engineerSkimmer"
	static mineralCost = 20
	constructor() {
		super()
		this.attack = 0
		this.defense = 0
		this.currentMoves = 3
		this.maxMoves = 3
		this.currentHealth = 10
		this.maxHealth = 10
		this.assignedTo = undefined
		this.sound = "sound/ship.wav"
	}
	// begin terraform
	terraform = function(structure) {
		if (this.currentMoves > 0) {
			// unit has at least one move left
			var t = getActiveTile()
			if ( t.structures.find( s => s instanceof structure ) != undefined ) {
				// this structure already exists
				// play sound
				audioInterface.src = "sound/cpu improved already.wav"
				audioInterface.play()
			}
			else {
				// this structure has not yet been built
				var currentStructure = t.productionQueue.find( s => s instanceof structure )
				if ( currentStructure == undefined ) {
					// no one has started building this structure
					var currentStructure = new structure( getActiveCoordinates() )
					// add new structure to production queue
					t.productionQueue.push( currentStructure )
				}
				// assign this engineer to the structure
				this.assignedTo = currentStructure
				// forfeit this unit's moves
				this.currentMoves = 0
				// re-render to show engineer status
				render()
			}
		}
	}
	advanceTerraform = function() {
		if (this.assignedTo != undefined) {
			// structure has not been completed			
			// only advance construction if the engineer is on the same tile as its assignment
			if (
				getCoordinatesByItemId(this.id).equals(
					this.assignedTo.coordinates
					) 
				)
			{
				this.assignedTo.progress++
			}
			// check if this structure has been completed
			if (this.assignedTo.progress >= this.assignedTo.constructor.buildTime) {
				// structure completed
				var t = getTileByItemId(this.id)
				// check if structure is already present
				if ( t.structures.indexOf(this.assignedTo) == -1 ) {
					// structure is not yet present
					var oldStructure = t.structures.find( s => s instanceof Structure )
					if ( oldStructure != undefined ) {
						// remove pre-existing structure if present
						t.structures.removeLast(oldStructure)
					}
					t.structures.push(this.assignedTo)
					// remove this structure from the production queue
					t.productionQueue.removeLast( this.assignedTo )
				}
				// remove unit from assignment
				this.assignedTo = undefined
				// play sound
				audioInterface.src = "sound/CPU terraform complete.wav"
				audioInterface.play()
			}
		}
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
		this.productionQueue = []
		this.city
		this.food = 0
		this.minerals = 0
		this.credits = 0
	}
}

class Structure {
	constructor(coordinates) {
		this.name = ""
		this.id = nextId++
		this.buildTime = 0
		this.progress = 0
		this.coordinates = coordinates
	}
}

class FlotationFarm extends Structure {
	static fullName = "Flotation Farm"
	static shortName = "flotationFarm"
	static shortcut = "F"
	static buildTime = 3
	constructor(coordinates) {
		super(coordinates)
	}
}

class SolarArray extends Structure {
	static fullName = "Solar Array"
	static shortName = "solarArray"
	static buildTime = 3
	static shortcut = "S"
	constructor(coordinates) {
		super(coordinates)
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

var game = new Game()
var turn = 0
var unitList = []
var nextId = 0
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

// sound system

var audioPieces = document.getElementById("audioPieces")
var audioInterface = document.getElementById("audioInterface")
var audioMusic = document.getElementById("audioMusic")

// events

// close base control
document.getElementById("closeBaseControl").onclick = closeBaseControl

// change production
document.getElementById("productionMenu").onchange = changeProduction

// build city
document.getElementById("buildCity").onclick = buildCity

// disband unit
document.getElementById("disband").onclick = function() {
	if (game.active.disband !== undefined) {
		game.active.disband()
	}
}

// terraform farm
document.getElementById("buildFarm").onclick = buildFarm

// terraform solar

document.getElementById("buildSolar").onclick = buildSolar

// end turn
document.getElementById("endTurn").onclick = endTurn

function onItemSelect(e) {
	game.active = getItemById(e.target.parentElement.id)
	if ( game.active instanceof City) {
		openBaseControl()
	}
	else {
		//closeBaseControl()
	}
}

onkeydown = function(e) {
	// global shortcuts
	switch (e.key) {
		case "Enter":
			// enter
			endTurn()
			break
	}
	if (game.active != undefined) {
		// shortcuts for active unit
		var tile = getActiveCoordinates()
		switch (e.key) {
			case "d":
				// d
				if (game.active.disband !== undefined) {
					game.active.disband()
				}
				break
			case "b":
				// b
				buildCity()
				break
			case "f":
				buildFarm()
				break
			case "s":
				buildSolar()
				break
			case "8":
				// up
				game.active.moveTo(tile.z, tile.y-1, tile.x-1)
				break
			case "9":
				// up right
				game.active.moveTo(tile.z, tile.y-1, tile.x)
				break
			case "6":
				// right
				game.active.moveTo(tile.z, tile.y-1, tile.x+1)
				break
			case "3":
				// down right
				game.active.moveTo(tile.z, tile.y, tile.x+1)
				break
			case "2":
				// down
				game.active.moveTo(tile.z, tile.y+1, tile.x+1)
				break
			case "1":
				// down left
				game.active.moveTo(tile.z, tile.y+1, tile.x)
				break
			case "4":
				// left
				game.active.moveTo(tile.z, tile.y+1, tile.x-1)
				break
			case "7":
				// up left
				game.active.moveTo(tile.z, tile.y, tile.x-1)
				break
			case "Escape":
				// escape
				closeBaseControl()
				break
			default:
				break;
		}
	}
}

// utility functions

Array.prototype.removeLast = function(value) {
	var index = this.lastIndexOf(value)
	if (index !== -1) {
		this.splice(index, 1)
	}
	else {
		// throw new Error("Value not found in array.")
	}
}

function getActiveCoordinates() {
	return getCoordinatesByItemId(game.active.id)
}

function getActiveTile() {
	var c = getActiveCoordinates()
	return map[c.z][c.y][c.x]
}

function getCoordinatesByItemId(id) {
	var id = document.getElementById(id)
	if (id) {
		var c = id.parentElement.id.split(",")
		return new Tuple(
			Number(c[0]),
			Number(c[1]),
			Number(c[2])
		)
	}
	else {
		throw new Error("No such item ID.")
	}
	/*
	var z=0
	for (var y=0; y<map[z].length; y++) {
		for (var x=0; x<map[z][y].length; x++) {
			var tile = map[z][y][x]
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
	*/
}

function getTileByItemId(id) {
	var c = getCoordinatesByItemId(id)
	return map[c.z][c.y][c.x]
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
				for (var i=0; i<tile.units.length; i++) {
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
				for (var i=0; i<tile.units.length; i++) {
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
	document.getElementById("cityName").textContent = game.active.fullName
	game.active.drawResources()
	document.getElementById("food").textContent = game.active.getTotalResource("food")
	document.getElementById("minerals").textContent = game.active.getTotalResource("minerals")
	document.getElementById("credits").textContent = game.active.getTotalResource("credits")
	populateProductionMenu()
	showProductionProgress()
	populateFacilityList()
	// show base control screen
	document.getElementById("baseControl").style.display = "inline-block"
	// play sound
	audioInterface.src = "sound/menu2.wav"
	audioInterface.play()

	
}

function closeBaseControl() {
	render()
	document.getElementById("baseControl").style.display = "none"
	game.active = undefined
	// play sound
	audioInterface.src = "sound/menu down.wav"
	audioInterface.play()
}

function showProductionProgress() {
	var productionProgress = document.getElementById("productionProgress")
	productionProgress.value = game.active.productionQueue[0].currentMinerals
	productionProgress.max = game.active.productionQueue[0].constructor.mineralCost
}

function changeProduction() {
	var productionTarget = document.getElementById("productionMenu").value
	game.active.productionQueue = [ new productionMenu[productionTarget]() ]
}

function populateFacilityList() {
	// clear existing list
	var facilitiesList = document.getElementById("facilitiesList")
	while (facilitiesList.firstElementChild != undefined) {
		facilitiesList.firstElementChild.remove()
	}
	// populate list
	for (var i of game.active.facilities) {
		var div = document.createElement("div")
		div.textContent = i.constructor.fullName
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
		// check whether this facility has already been built
		if ( game.active.facilities.find( f => f instanceof productionMenu[i] ) == undefined ) {
			var option = document.createElement("option")
			// this shit shouldn't even be possible, like wtf javascript
			//option.textContent = new productionMenu[i]().name
			option.textContent =
				productionMenu[i].fullName +
				" (" +
				Math.ceil(
					productionMenu[i].mineralCost/game.active.getTotalResource("minerals")
				) +
				" turns)"
			option.value = i
			menu.appendChild(option)
		}
	}
	// display current production target
	menu.value = productionMenu.indexOf(game.active.productionQueue[0].constructor)
}

function buildCity() {
	// if a piece is selected and this piece can build a city
	if (game.active != undefined && game.active.buildCity !== undefined) {
		game.active.buildCity()
	}
}

function buildFarm() {
	if (game.active instanceof EngineerSkimmer) {
		game.active.terraform(FlotationFarm)
	}
}

function buildSolar() {
	if (game.active instanceof EngineerSkimmer) {
		game.active.terraform(SolarArray)
	}
}

function endTurn() {
	// do not advance turns while base control is open
	if ( !(game.active instanceof City) ) {
		// advance structure construction, reset unit moves
		for (var unit of unitList) {
			if (unit instanceof EngineerSkimmer) {
				unit.advanceTerraform()
			}
			// reset this unit's moves
			unit.resetMoves()
		}
		// advance facility and unit construction
		for (var city of cityList) {
			//game.active = city // quick and dirty workaround ;)
			city.build()
		}
		// reset active unit
		turn++
		render()
		// reset active
		game.active = undefined
	}
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
			target.classList.add(tile.shortName)
			// Render city if present
			if (tile.city != undefined) {
				var city = document.createElement("div")
				city.id = tile.city.id
				city.onclick = onItemSelect
				city.className = "city"
				
				var cityIcon = document.createElement("div")
				cityIcon.className = "cityIcon"
				var cityLabel = document.createElement("div")
				cityLabel.className = "cityLabel"
				cityLabel.textContent = tile.city.fullName
				
				city.appendChild(cityIcon)
				city.appendChild(cityLabel)
				
				target.appendChild(city)
			}
			// render structures if present
			if (tile.structures.length != 0) {
				for (var s of tile.structures) {
					var structure = document.createElement("div")
					structure.id = s.id
					structure.classList.add("structure")
					structure.classList.add(s.constructor.shortName)
					target.appendChild(structure)
				}
			}
			// Render units if present
			if (tile.units.length != 0) {
				for (var i=0; i<tile.units.length; i++) {
					var currentUnit = tile.units[i]
					var unit = document.createElement("div")
					unit.id = currentUnit.id
					unit.className = "unit"
					
					var unitLabel = document.createElement("div")
					unitLabel.className = "unitLabel"
					var unitIcon = document.createElement("div")
					unitIcon.className = "unitIcon"
					
					// status for any unit without orders
					
					unitLabel.textContent = "-"
					
					// status for units with no moves left
					
					if (currentUnit.currentMoves == 0) {
						unitLabel.textContent = "0"
					}
					
					// status for engineers building a structure
					if (currentUnit instanceof EngineerSkimmer && currentUnit.assignedTo != undefined) {
						unitLabel.textContent = 
							currentUnit.assignedTo.constructor.shortcut
					}
					
					unitIcon.onclick = onItemSelect
					
					unit.appendChild(unitLabel)
					unit.appendChild(unitIcon)
					
					target.appendChild(unit)
				}
			}
		}
	}
}

// begin

var productionMenu = [StockpileMinerals, AdministrationNexus, Recycler, BiologyLab, PodSkimmer, ScoutSkimmer, EngineerSkimmer]
map[0][3][3].units.push( new PodSkimmer(), new EngineerSkimmer() )
unitList.push( map[0][3][3].units[0], map[0][3][3].units[1] )
initialize()
render()