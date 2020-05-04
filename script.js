"use strict"

// classes

class Game {
	
	#activePiece
	
	set active(piece) {
		// play default sound if this is a unit that was not previously active
		if ( this.#activePiece != piece && piece instanceof Unit ) {
			// play default sound
			audioPieces.src = piece.sound
			audioPieces.play()
		}
		if ( !(this.#activePiece instanceof City) || piece == undefined ) {
			// do not allow switching active piece if base control is open unless we are closing base control
			this.#activePiece = piece
			renderActive()
		}
	}
	
	get active() {
		return this.#activePiece
	}
	
	constructor() {
		this.map = []
		// cannot initialize active until the map is rendered
		this.turn = 0
		this.unitList = []
		this.cityList = []
		this.nextId = 0
		this.turn = 0
		this.mapSize = 7
		this.baseControlOpen = false
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
		this.id = game.nextId++
		this.status = status.idle
	}
}

class City extends Piece {
	currentMoves = "N/A"
	constructor() {
		super()
		this.facilities = [new IndustrialBase()] // new bases get a free Industrial Base
		this.productionQueue = [new StockpileMinerals()] // default production is Stockpile Minerals
		this.population = 1
		this.sound = "sound/menu2.wav"
		this.getTurnsLeft = function() {
			return Math.ceil(
				(this.productionQueue[0].constructor.mineralCost - this.productionQueue[0].currentMinerals) / this.getTotalResource("minerals")
			)
		}
		this.build = function() {
			// advance construction progress on end turn
			let mineralsPerTurn = this.getTotalResource("minerals")
			let currentProduction = this.productionQueue[0]
			// only advance production on production with finite costs (not Stockpile Minerals)
			if ( currentProduction.constructor.mineralCost != Infinity ) {
				currentProduction.currentMinerals += mineralsPerTurn
			}
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
					let c = getCoordinatesByItemId(this.id)
					map[c.z][c.y][c.x].units.push(currentProduction)
					game.unitList.push(currentProduction)
					// play sound
					audioInterface.src = "sound/cpu prod complete.wav"
					audioInterface.play()
				}
				// pop the finished item off
				this.productionQueue.pop()
				if (this.productionQueue.length == 0) {
					// this was the last item, so automatically stockpile minerals
					this.productionQueue.push( new StockpileMinerals() )
				}
			}
			// update city status
			this.status = new CityStatus(
				this.productionQueue[0].constructor.fullName,
				this.getTurnsLeft()
			)
		}
		this.generateName = function() {
			let i = Math.floor( Math.random()*cityNamesList.length )
			let name = cityNamesList[i]
			// remove name so it cannot be used again
			cityNamesList.removeLast(name)
			this.fullName = name
		}
		this.getResourceTiles = function() {
			let c = getCoordinatesByItemId(this.id)
			let resourceTiles = []
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
				let output = map[z][y][x][resource]
				let c = getCoordinatesByItemId(this.id)
				
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
					let structures = map[z][y][x].structures
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
			let resourceTiles = this.getResourceTiles()
			for (let c of resourceTiles) {
				if ( tileExists(c.z, c.y, c.x) ) {
					let tile = getUiTileByCoordinates(c.z, c.y, c.x)
					let span = document.createElement("span")
					span.className = "resourceLabel"
					span.textContent = 
						this.getTileResource("food", c.z, c.y, c.x) + " " +
						this.getTileResource("minerals", c.z, c.y, c.x) + " " +
						this.getTileResource("credits", c.z, c.y, c.x)
					tile.appendChild(span)
				}
			}
		}
		this.getTotalResource = function(resource) {
			let resourceTiles = this.getResourceTiles()
			let total = 0
			for (let c of resourceTiles) {
				total += this.getTileResource(resource, c.z, c.y, c.x)
			}
			return total
		}
	}
}

class Facility {
	static fullName = ""
	static mineralCost = 0
	constructor() {
		this.id = game.nextId++
		this.currentMinerals = 0
		this.upkeep = 0
		this.available = true
		this.creditsMult = 0
	}
}

class StockpileMinerals extends Facility {
	static fullName = "Stockpile Minerals"
	static mineralCost = Infinity
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

class Status {
	constructor (fullName, turnsLeft, abbreviation) {
		this.fullName = fullName
		this.turnsSymbol
		this.abbreviation = abbreviation
		if (turnsLeft == Infinity) {
			this.turnsSymbol = "∞"
		}
		else if (turnsLeft == undefined) {
			this.turnsSymbol = ""
		}
		else {
			this.turnsSymbol = turnsLeft.toString()
		}
	}
}

class EngineerStatus extends Status {
	constructor(fullName, turnsLeft, abbreviation) {
		super(fullName, turnsLeft, abbreviation)
		this.fullName = "constructing " + fullName + " (" + turnsLeft + " turns left)"
		this.abbreviation = abbreviation
	}
}

class CityStatus extends Status {
	constructor(facility, turnsLeft) {
		super(facility, turnsLeft)
		this.fullName = "constructing " + facility + " (" + this.turnsSymbol + " turns left)"
		this.facility = facility
	}
}

class FacilityStatus extends Status {
	constructor(fullName, abbreviation) {
		super(fullName, abbreviation)
		this.fullName = "constructing " + fullName
	}
}

let status = {
	idle: new Status("idle", undefined, "-"),
	outOfMoves: new Status("out of moves", undefined, "0"),
	sentry: new Status("sentrying for enemy units", undefined, "L"),
	hold: new Status("holding for orders", undefined, "H")
}

class Unit extends Piece {
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
			let tile = getItemTileById(this.id)
			tile.units.removeLast(this)
			// remove unit from unitList
			game.unitList.removeLast(this)
			game.active = undefined
			render()
		}
		this.resetMoves = function() {
			this.currentMoves = this.maxMoves
			if (this.status == status.outOfMoves) {
				this.status = status.idle
			}
		}
		this.moveTo = function(z, y, x) {
			if ( this.currentMoves >= 1 && tileExists(z, y, x) ) {
				let targetTile = map[z][y][x]
				let hostTile = getItemTileById(this.id)
				targetTile.units.push(this)
				hostTile.units.removeLast(this)
				this.currentMoves--
				if (this.currentMoves == 0) {
					this.status = status.outOfMoves
				}
				else {
					this.status = status.idle
				}
				render()
			}
		}
		this.hold = function() {
			// set status
			this.status = status.hold
			render()
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
			let city = new City()
			city.generateName()
			// put city on the map
			let c = getActiveCoordinates()
			map[c.z][c.y][c.x].city = city
			// add stockpile minerals and status
			city.productionQueue.push( new StockpileMinerals() )
			city.status = new CityStatus( city.productionQueue[0].constructor.fullName, city.getTurnsLeft() )
			// remove any structures
			map[c.z][c.y][c.x].structures = []
			game.cityList.push(city)
			this.disband()
			render()
			// open the most recently-created city
			game.active = game.cityList[game.cityList.length-1]
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
	// assign to terraform
	terraform = function(structure) {
		if (this.currentMoves > 0) {
			// unit has at least one move left
			let t = getActiveTile()
			if ( t.structures.find( s => s instanceof structure ) != undefined ) {
				// this structure already exists
				// play sound
				audioInterface.src = "sound/cpu improved already.wav"
				audioInterface.play()
			}
			else {
				// this structure has not yet been built, check if in progress
				let currentStructure = t.structureQueue.find( s => s instanceof structure )
				if ( currentStructure == undefined ) {
					// no one has started building this structure
					currentStructure = new structure( getActiveCoordinates() )
					// add new structure to production queue
					t.structureQueue.push( currentStructure )
				}
				// assign this engineer to the structure
				this.assignedTo = currentStructure
				// update statuses of all units, aggregating engineer-turns
				this.aggregateStatus()
				// re-render to show engineer status
				render()
			}
		}
	}
	aggregateStatus = function() {
		let currentStructure = this.assignedTo
		// calculate remaining moves if multiple units assigned
		let assignedUnits = getUnitsAssignedTo(this.assignedTo)
		let turnsLeft = this.assignedTo.constructor.buildTime - this.assignedTo.progress - assignedUnits.length + 1
		// update all units' status
		for (let u of assignedUnits) {
			u.status = new EngineerStatus(u.assignedTo.constructor.fullName, turnsLeft, u.assignedTo.constructor.shortcut)
		}
	}
	advanceTerraform = function() {
		if (this.assignedTo != undefined) {
			// structure has not been completed
			this.assignedTo.progress++
			// engineer forfeits all moves
			this.currentMoves = 0
			// check if this structure has been completed
			if (this.assignedTo.progress >= this.assignedTo.constructor.buildTime) {
				// structure completed
				let t = getTileByItemId(this.id)
				// check if structure is already present
				if ( t.structures.indexOf(this.assignedTo) == -1 ) {
					// structure is not yet present
					let oldStructure = t.structures.find( s => s instanceof Structure )
					if ( oldStructure != undefined ) {
						// remove pre-existing structure if present
						t.structures.removeLast(oldStructure)
					}
					t.structures.push(this.assignedTo)
					// remove this structure from the production queue
					t.structureQueue.removeLast( this.assignedTo )
				}
				// remove unit from assignment
				this.assignedTo = undefined
				// change unit status to idle
				this.status = status.idle
				// play sound
				audioInterface.src = "sound/CPU terraform complete.wav"
				audioInterface.play()
			}
			else {
				// structure is still in progress
				// update status
				this.aggregateStatus()
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
		// store unfinished structures in structureQueue
		this.structureQueue = []
		this.city
		this.food = 0
		this.minerals = 0
		this.credits = 0
	}
}

class Structure {
	constructor() {
		this.progress = 0
	}
}

class FlotationFarm extends Structure {
	static fullName = "Flotation Farm"
	static shortName = "flotationFarm"
	static buildTime = 3
	static shortcut = "F"
	constructor() {
		super()
	}
}

class SolarArray extends Structure {
	static fullName = "Solar Array"
	static shortName = "solarArray"
	static buildTime = 3
	static shortcut = "S"
	constructor() {
		super()
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

let game = new Game()
let cityNamesList = ["Alpha Prime", "Glorious Awakening", "New Inception", "Terra Nova"]

let map = []
map[0] = []
for (let y=0; y<game.mapSize; y++) {
	map[0][y] = []
	for (let x=0; x<game.mapSize; x++) {
		map[0][y][x] = new OpenOcean()
	}
}

// SOUND SYSTEM

let audioPieces = document.getElementById("audioPieces")
let audioInterface = document.getElementById("audioInterface")
let audioMusic = document.getElementById("audioMusic")

// EVENTS

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

document.getElementById("cancelOrders").onclick = cancelOrders

document.getElementById("hold").onclick = hold

document.getElementById("nextIdle").onclick = nextIdle

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
	// shortcuts that do not require an active unit
	switch (e.key) {
		case "Enter":
			endTurn()
			break
		case "w":
			nextIdle()
			break
	}
	if (game.active != undefined) {
		// shortcuts for active unit
		let tile = getActiveCoordinates()
		switch (e.key) {
			case "c":
				cancelOrders()
				break
			case "d":
				if (game.active.disband !== undefined) {
					game.active.disband()
				}
				break
			case "b":
				buildCity()
				break
			case "f":
				buildFarm()
				break
			case "s":
				buildSolar()
				break
			case "h":
				hold()
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
	let index = this.lastIndexOf(value)
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
	let c = getActiveCoordinates()
	return map[c.z][c.y][c.x]
}

function getPieceDom(piece) {
	if (piece != undefined) {
		return document.getElementById(piece.id)
	}
}

function getCoordinatesByItemId(id) {
	let z=0
	for (let y=0; y<map[z].length; y++) {
		for (let x=0; x<map[z][y].length; x++) {
			let tile = map[z][y][x]
			let units = tile.units
			if (units.length !== 0) {
				for (let i=0; i<units.length; i++) {
					if ( units[i].id == id ) {
						return new Tuple(z, y, x)
					}
				}
			}
			let city = tile.city
			if (city !== undefined) {
				if (city.id === id) {
					return new Tuple(z, y, x)
				}
			}
		}
	}
}

function getTileByItemId(id) {
	let c = getCoordinatesByItemId(id)
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
	let z=0
	for (let y=0; y<map[z].length; y++) {
		for (let x=0; x<map[z][y].length; x++) {
			let tile = map[z][y][x]
			if (tile.units.length !== 0) {
				for (let i=0; i<tile.units.length; i++) {
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
	let z=0
	for (let y=0; y<map[z].length; y++) {
		for (let x=0; x<map[z][y].length; x++) {
			let tile = map[z][y][x]
			if (tile.units.length !== 0) {
				for (let i=0; i<tile.units.length; i++) {
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

function getUnitsAssignedTo(structure) {
	let assignedUnits = []
	for (let u of game.unitList) {
		if (u.assignedTo == structure) {
			assignedUnits.push(u)
		}
	}
	return assignedUnits
}

// game functions

function openBaseControl() {
	game.baseControlOpen = true
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
	game.baseControlOpen = false
	game.active = undefined
	render()
	document.getElementById("baseControl").style.display = "none"
	// play sound
	audioInterface.src = "sound/menu down.wav"
	audioInterface.play()
}

function showProductionProgress() {
	let productionProgress = document.getElementById("productionProgress")
	productionProgress.value = game.active.productionQueue[0].currentMinerals
	let mineralCost = game.active.productionQueue[0].constructor.mineralCost
	if (mineralCost != Infinity) {
		productionProgress.max = game.active.productionQueue[0].constructor.mineralCost
	}
	else {
		productionProgress.max = 999
	}
}

function changeProduction() {
	let productionTarget = document.getElementById("productionMenu").value
	game.active.productionQueue = [ new productionMenu[productionTarget]() ]
	// update city status
	game.active.status = new CityStatus( productionMenu[productionTarget].fullName, game.active.getTurnsLeft() )
	// update UI status
	renderActive()
}

function populateFacilityList() {
	// clear existing list
	let facilitiesList = document.getElementById("facilitiesList")
	while (facilitiesList.firstElementChild != undefined) {
		facilitiesList.firstElementChild.remove()
	}
	// populate list
	for (let i of game.active.facilities) {
		let div = document.createElement("div")
		div.textContent = i.constructor.fullName
		facilitiesList.appendChild(div)
	}
}

function populateProductionMenu() {
	let menu = document.getElementById("productionMenu")
	// clear existing menu
	while (menu.firstElementChild != null) {
		menu.firstElementChild.remove()
	}
	// populate
	for (let i=0; i<productionMenu.length; i++) {
		// check whether this facility has already been built
		if ( game.active.facilities.find( f => f instanceof productionMenu[i] ) == undefined ) {
			let option = document.createElement("option")
			// this shit shouldn't even be possible, like wtf javascript
			//option.textContent = new productionMenu[i]().name
			
			option.textContent =
				productionMenu[i].fullName +
				" (" +
				Math.ceil(productionMenu[i].mineralCost/game.active.getTotalResource("minerals") ) +
				" turns)"
			option.value = i
			menu.appendChild(option)
		}
	}
	// display current production target
	menu.value = productionMenu.indexOf(game.active.productionQueue[0].constructor)
}

function nextIdle() {
	let nextIndex
	if (game.active != undefined) {
		nextIndex = game.unitList.indexOf(game.active) + 1
	}
	else {
		nextIndex = 0
	}
	for (let i=0; i<game.unitList.length; i++) {
		let j = (nextIndex+i) % game.unitList.length
		if (game.unitList[j].status == status.idle) {
			game.active = game.unitList[j]
			render()
			break
		}
	}
}

function hold() {
	game.active.hold()
}

function cancelOrders() {
	game.active.status = status.idle
	render()
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
		for (let unit of game.unitList) {
			if (unit instanceof EngineerSkimmer) {
				unit.advanceTerraform()
			}
			// reset this unit's moves
			unit.resetMoves()
		}
		// advance facility and unit construction
		for (let city of game.cityList) {
			//game.active = city // quick and dirty workaround ;)
			city.build()
		}
		game.turn++
		// reset active
		game.active = undefined
		render()
		// select next idle unit
		nextIdle()
	}
}

function initialize() {
	let mapDiv = document.getElementById("map")
	let z = 0
	for (let y=0; y<map[z].length; y++) {
		let row = document.createElement("div")
		row.id = "row" + y
		row.className = "row"
		mapDiv.appendChild(row)
		let currentRow = document.getElementById("row" + y)
		for (let x=0; x<map[0][y].length; x++) {
			let tile = document.createElement("div")
			tile.id = z + "," + y + "," + x
			tile.className = "tile"
			currentRow.appendChild(tile)
		}
	}
}

function renderActive() {
	if (game.active != undefined) {
		
		// render active unit DOM element
		
		// remove previous active style, if any
		let actives = document.getElementsByClassName("active")
		if (actives.length != 0) {
			for (let a of actives) {
				a.classList.remove("active")
			}
		}
		
		// apply active style
		getPieceDom(game.active).classList.add("active")
		
		// update UI
		
		// update active piece display
		if (game.active instanceof Unit) {
			document.getElementById("activeLabel").textContent = game.active.constructor.fullName
		}
		else if (game.active instanceof City) {
			document.getElementById("activeLabel").textContent = game.active.fullName
		}
		// update set UI status
		document.getElementById("status").textContent = game.active.status.fullName
		
		// update moves
		document.getElementById("moves").textContent = game.active.currentMoves
		
		if (game.active instanceof Unit) {
			// update unit list UI
			renderUnitList()
		}
	}
	else {
		// there will be no active unit
		document.getElementById("activeLabel").textContent = "None"
		document.getElementById("status").textContent = "N/A"
		document.getElementById("moves").textContent = "N/A"
		// clear active style
		for ( let e of document.getElementsByClassName("active") ) {
			e.classList.remove("active")
		}
	}
}

function renderUnitList() {
	// clear previous units
	let list = document.getElementById("unitList")
	while ( list.hasChildNodes() ) {
		list.firstElementChild.remove()
	}
	for (let u of game.unitList) {
		let unitSelectContainer = document.createElement("div")
		unitSelectContainer.classList.add("unitSelectContainer")
		// add item id
		unitSelectContainer.setAttribute("data-id", u.id)
		// add event listener
		unitSelectContainer.addEventListener(
			"click",
			function(e) {
				let piece = getItemById( Number(e.currentTarget.getAttribute("data-id")) )
				game.active = piece
				render()
			}
		)
		if (game.active == u) {
			unitSelectContainer.classList.add("active")
		}
		let unitSelect = document.createElement("div")
		unitSelect.classList.add("unitIcon")
		let unitSelectLabel = document.createElement("div")
		unitSelectLabel.textContent = u.constructor.fullName + " (" + u.status.abbreviation + ")"
		
		unitSelectContainer.appendChild(unitSelect)
		unitSelectContainer.appendChild(unitSelectLabel)
		
		document.getElementById("unitList").appendChild(unitSelectContainer)
	}
}

function render() {
	let mapDiv = document.getElementById("map")
	let z = 0;
	document.getElementById("turn").textContent = game.turn
	// render map
	for (let y=0; y<map[z].length; y++) {
		for (let x=0; x<map[z][y].length; x++) {
			let target = document.getElementById(z + "," + y + "," + x)
			// Reset style
			target.className = "tile"
			let tile = map[z][y][x]
			// Remove all HTML elements from UI tiles
			while (target.firstElementChild != undefined) {
				target.firstElementChild.remove()
			}
			// Apply tile background
			target.classList.add(tile.shortName)
			// Render city if present
			if (tile.city != undefined) {
				let city = document.createElement("div")
				city.id = tile.city.id
				city.onclick = onItemSelect
				city.className = "city"
				
				let cityIcon = document.createElement("div")
				cityIcon.className = "cityIcon"
				city.appendChild(cityIcon)
				// hide city label if base control is open
				if (!game.baseControlOpen) {
					// render city
					let cityLabel = document.createElement("div")
					cityLabel.className = "cityLabel"
					cityLabel.textContent =
						tile.city.fullName +
						"\n" +
						tile.city.status.facility +
						" (" +
						tile.city.status.turnsSymbol +
						")"
					city.appendChild(cityLabel)
				}
				target.appendChild(city)
			}
			// render structures if present
			if (tile.structures.length != 0) {
				for (let s of tile.structures) {
					let structure = document.createElement("div")
					structure.id = s.id
					structure.classList.add("structure")
					structure.classList.add(s.constructor.shortName)
					target.appendChild(structure)
				}
			}
			// Render units if present
			if (tile.units.length != 0) {
				for (let i=0; i<tile.units.length; i++) {
					let currentUnit = tile.units[i]
					let unit = document.createElement("div")
					unit.id = currentUnit.id
					unit.className = "unit"
					
					let unitLabel = document.createElement("div")
					unitLabel.className = "unitLabel"
					let unitIcon = document.createElement("div")
					unitIcon.className = "unitIcon"
					
					// render status abbreviation
					unitLabel.textContent = currentUnit.status.abbreviation
					
					unitIcon.onclick = onItemSelect
					
					unit.appendChild(unitLabel)
					unit.appendChild(unitIcon)
					
					target.appendChild(unit)
				}
			}
		}
	}
	// apply active style
	renderActive()
	// render unit list
	renderUnitList()
}

// begin

let productionMenu = [StockpileMinerals, AdministrationNexus, Recycler, BiologyLab, PodSkimmer, ScoutSkimmer, EngineerSkimmer]
map[0][3][3].units.push( new PodSkimmer(), new EngineerSkimmer() )
game.unitList.push( map[0][3][3].units[0], map[0][3][3].units[1] )
initialize()
render()