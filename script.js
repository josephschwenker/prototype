"use strict"

// constants

const RIGHT_MOUSE_BUTTON = 2

// classes

// used for storing tile coordinates for pathfinding
class Node {
	constructor(coordinates) {
		this.coordinates = coordinates
		this.visited = false
		this.distance = Infinity
		this.parent = undefined
	}
}

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
	
	getActiveCoordinates() {
		if (game.active != undefined) {
			return game.map.getCoordinatesByItemId(game.active.id)
		}
	}

	getActiveTile() {
		let c = this.getActiveCoordinates()
		return game.map.getTile(c)
	}
	
	getUnitsAssignedTo(structure) {
		let assignedUnits = []
		for (let u of game.unitList) {
			if (u.assignedTo == structure) {
				assignedUnits.push(u)
			}
		}
		return assignedUnits
	}
	
	constructor() {
		// cannot initialize active until the map is rendered
		this.turn = 0
		this.unitList = []
		this.cityList = []
		this.nextId = 0
		this.turn = 0
		this.map = new GameMap( MAPSIZE )
		this.baseControlOpen = false
		this.productionMenu = [StockpileMinerals, AdministrationNexus, Recycler, BiologyLab, PodSkimmer, ScoutSkimmer, EngineerSkimmer]
	}
}

class Tuple {
	constructor(x, y, z) {
		this.x = x
		this.y = y
		this.z = z
	}
	
	static parseTuple(string) {
		let c = string.split(",")
		return new Tuple(
			Number(c[0]),
			Number(c[1]),
			Number(c[2])
		)
	}
	
	toString() {
		return this.x + "," + this.y + "," + this.z
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

class GameMap {
	#data = []
	
	constructor(size) {
		this.size = size
		this.#data[0] = []
		for (let y=0; y<size; y++) {
			this.#data[0][y] = []
			for (let x=0; x<size; x++) {
				this.#data[0][y][x] = new OpenOcean()
			}
		}
	}
	
	getTile(c) {
		// check bounds
		if ( this.#data[c.z] != undefined ) {
			if ( this.#data[c.z][c.y] != undefined ) {
				return this.#data[c.z][c.y][c.x]
			}
		}
		// not in bounds
		return undefined
	}
	
	setTile(c, value) {
		// check bounds
		if ( this.#data[c.z] != undefined ) {
			if ( this.#data[c.z][c.y] != undefined ) {
				this.#data[c.z][c.y][c.x] = value
			}
		}
		// not in bounds
	}
	
	tileExists(c) {
		if (game.map.getTile(c) != undefined) {
			return true
		}
		else {
			return false
		}
	}
	
	getNeighbors(c) {
		// returns an array of a tile's neighbors
		let neighbors = []
		neighbors.push( new Tuple(c.x+1, c.y, c.z) )
		neighbors.push( new Tuple(c.x-1, c.y, c.z) )
		
		neighbors.push( new Tuple(c.x, c.y+1, c.z) )
		neighbors.push( new Tuple(c.x, c.y-1, c.z) )
		
		neighbors.push( new Tuple(c.x+1, c.y+1, c.z) )
		neighbors.push( new Tuple(c.x-1, c.y-1, c.z) )
		
		neighbors.push( new Tuple(c.x+1, c.y-1, c.z) )
		neighbors.push( new Tuple(c.x-1, c.y+1, c.z) )
		
		// remove any tiles that do not exist
		let validNeighbors = []
		for (let n of neighbors) {
			if ( game.map.tileExists(n) ) {
				validNeighbors.push(n)
			}
		}
		return validNeighbors
	}
	
	getTileByItemId(id) {
		let c = game.map.getCoordinatesByItemId(id)
		return game.map.getTile(c)
	}

	getItemById(id) {
		let z=0
		for (let y=0; y<game.map.size; y++) {
			for (let x=0; x<game.map.size; x++) {
				let tile = game.map.getTile( new Tuple(x, y, z) )
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

	getCoordinatesByItemId(id) {
		let z=0
		for (let y=0; y<this.size; y++) {
			for (let x=0; x<this.size; x++) {
				let tile = game.map.getTile( new Tuple(x, y, z) )
				let units = tile.units
				if (units.length !== 0) {
					for (let i=0; i<units.length; i++) {
						if ( units[i].id == id ) {
							return new Tuple(x, y, z)
						}
					}
				}
				let city = tile.city
				if (city !== undefined) {
					if (city.id === id) {
						return new Tuple(x, y, z)
					}
				}
			}
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
		this.population = 1
		this.sound = "sound/menu2.wav"
		this.productionQueue = []
		this.productionMenu = game.productionMenu
		this.status = status.noProduction
	}
		
	queueProduction(productionTarget) {
		game.active.productionQueue.push(
			new productionTarget()
		)
		// if this is a facility, remove it from the city's production menu
		if ( game.active.productionQueue[game.active.productionQueue.length-1] instanceof Facility ) {
			game.active.productionMenu.removeLast( productionTarget )
		}
		// update city status
		if ( game.active.productionQueue.length != 0 ) {
			game.active.status = new CityStatus( game.active.productionQueue[0].constructor.fullName, game.active.getTurnsLeft() )
		}
		else {
			game.active.status = status.idle
		}
	}
	getTurnsLeft() {
		return Math.ceil(
			(this.productionQueue[0].constructor.mineralCost - this.productionQueue[0].currentMinerals) / this.getTotalResource("minerals")
		)
	}
	build() {
		// advance production if there is an item in the queue
		if ( this.productionQueue.length != 0 ) {
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
					let c = game.map.getCoordinatesByItemId(this.id)
					game.map.getTile(c).units.push(currentProduction)
					game.unitList.push(currentProduction)
					// play sound
					audioInterface.src = "sound/cpu prod complete.wav"
					audioInterface.play()
				}
				// remove the finished item
				this.productionQueue.removeLast(currentProduction)
			}
			// update city status
			if ( this.productionQueue.length != 0 ) {
				this.status = new CityStatus(
					this.productionQueue[0].constructor.fullName,
					this.getTurnsLeft()
				)
			}
			else {
				this.status = status.noProduction
			}
		}
	}
	generateName() {
		let i = Math.floor( Math.random()*cityNamesList.length )
		let name = cityNamesList[i]
		// remove name so it cannot be used again
		cityNamesList.removeLast(name)
		this.fullName = name
	}
	getResourceTiles() {
		let c = game.map.getCoordinatesByItemId(this.id)
		let resourceTiles = []
		resourceTiles.push( new Tuple(c.x, c.y, c.z) )
		
		resourceTiles.push( new Tuple(c.x-1, c.y-2, c.z) )
		resourceTiles.push( new Tuple(c.x+1, c.y+2, c.z) )
		
		resourceTiles.push( new Tuple(c.x, c.y-2, c.z) )
		resourceTiles.push( new Tuple(c.x, c.y+2, c.z) )
		
		resourceTiles.push( new Tuple(c.x+1, c.y-2, c.z) )
		resourceTiles.push( new Tuple(c.x-1, c.y+2, c.z) )
		
		resourceTiles.push( new Tuple(c.x-2, c.y-1, c.z) )
		resourceTiles.push( new Tuple(c.x+2, c.y+1, c.z) )
		
		resourceTiles.push( new Tuple(c.x-1, c.y-1, c.z) )
		resourceTiles.push( new Tuple(c.x+1, c.y+1, c.z) )
		
		resourceTiles.push( new Tuple(c.x, c.y-1, c.z) )
		resourceTiles.push( new Tuple(c.x, c.y+1, c.z) )
		
		resourceTiles.push( new Tuple(c.x+1, c.y-1, c.z) )
		resourceTiles.push( new Tuple(c.x-1, c.y+1, c.z) )
		
		resourceTiles.push( new Tuple(c.x-2, c.y, c.z) )
		resourceTiles.push( new Tuple(c.x+2, c.y, c.z) )
		
		resourceTiles.push( new Tuple(c.x-1, c.y, c.z) )
		resourceTiles.push( new Tuple(c.x+1, c.y, c.z) )
		
		resourceTiles.push( new Tuple(c.x-2, c.y+1, c.z) )
		resourceTiles.push( new Tuple(c.x+2, c.y-1, c.z) )
		
		return resourceTiles
	}
	// holy dooly folks, this is a big one
	getTileResource(c, resource) {
		if ( game.map.tileExists(c) ) {
			// c is the coordinates of the tile we are getting resource values for
			// get resources before modifiers
			let output = game.map.getTile(c)[resource]
			// cc is the coordinates of the corresponding city for this tile
			let cc = game.map.getCoordinatesByItemId(this.id)
			
			// city tile, no structures allowed
			if ( cc.equals(c) ) {
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
				let structures = game.map.getTile(c).structures
				// flotation farm
				if (resource == "food") {
					if ( structures.find( i => i instanceof FlotationFarm) !== undefined ) {
						output += 1
					}
				}
				// solar array
				if (resource == "credits") {
					if ( structures.find( i => i instanceof SolarArray) !== undefined ) {
						output += 1
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
	drawResources() {
		let resourceTiles = this.getResourceTiles()
		for (let c of resourceTiles) {
			if ( game.map.tileExists(c) ) {
				let tile = getUiTileByCoordinates(c)
				let span = document.createElement("span")
				span.className = "resourceLabel"
				span.textContent = 
					this.getTileResource(c, "food") + " " +
					this.getTileResource(c, "minerals") + " " +
					this.getTileResource(c, "credits")
				tile.appendChild(span)
			}
		}
	}
	getTotalResource(resource) {
		let resourceTiles = this.getResourceTiles()
		let total = 0
		for (let c of resourceTiles) {
			total += this.getTileResource(c, resource)
		}
		return total
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

class NoProduction extends CityStatus {
	constructor() {
		super("No Production", Infinity)
		this.fullName = "idle"
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
	hold: new Status("holding for orders", undefined, "H"),
	noProduction: new NoProduction()
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
	}
	disband() {
		// remove unit from tile
		let tile = game.map.getTileByItemId(this.id)
		tile.units.removeLast(this)
		// remove unit from unitList
		game.unitList.removeLast(this)
		game.active = undefined
		render()
	}
	resetMoves() {
		this.currentMoves = this.maxMoves
		if (this.status == status.outOfMoves) {
			this.status = status.idle
		}
	}
	moveTo(c) {
		if ( this.currentMoves >= 1 && game.map.tileExists(c) ) {
			let targetTile = game.map.getTile(c)
			let hostTile = game.map.getTileByItemId(this.id)
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
	hold() {
		// set status
		this.status = status.hold
		render()
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
			let coordinates = game.getActiveCoordinates()
			let tile = game.map.getTile(coordinates)
			tile.city = city
			// remove any structures
			tile.structures = []
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
			let t = game.getActiveTile()
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
					currentStructure = new structure( game.getActiveCoordinates() )
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
		let assignedUnits = game.getUnitsAssignedTo(this.assignedTo)
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
				let t = game.map.getTileByItemId(this.id)
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
		this.id = game.nextId++
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
		this.food = 1
		this.minerals = 0
		this.credits = 2
	}
}

// global variables

const MAPSIZE = 7
let game = new Game()
let cityNamesList = ["Alpha Prime", "Glorious Awakening", "New Inception", "Terra Nova"]

/* SOUND SYSTEM */

let audioPieces = document.getElementById("audioPieces")
let audioInterface = document.getElementById("audioInterface")
let audioMusic = document.getElementById("audioMusic")

/* EVENTS */

// close base control
document.getElementById("closeBaseControl").onclick = closeBaseControl

// change production
document.getElementById("productionMenu").onchange = queueProduction

// build city
document.getElementById("buildCity").onclick = buildCity

// disband unit
document.getElementById("disband").onclick = disband

document.getElementById("cancelOrders").onclick = cancelOrders

document.getElementById("hold").onclick = hold

document.getElementById("nextIdle").onclick = nextIdle

document.getElementById("buildFarm").onclick = buildFarm

document.getElementById("buildSolar").onclick = buildSolar

document.getElementById("endTurn").onclick = endTurn

function onItemSelect(e) {
	game.active = game.map.getItemById(e.target.parentElement.id)
	if ( game.active instanceof City) {
		openBaseControl()
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
		let c = game.getActiveCoordinates()
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
				game.active.moveTo( new Tuple(c.x-1, c.y-1, c.z) )
				break
			case "9":
				// up right
				game.active.moveTo( new Tuple(c.x, c.y-1, c.z) )
				break
			case "6":
				// right
				game.active.moveTo( new Tuple(c.x+1, c.y-1, c.z) )
				break
			case "3":
				// down right
				game.active.moveTo( new Tuple(c.x+1, c.y, c.z) )
				break
			case "2":
				// down
				game.active.moveTo( new Tuple(c.x+1, c.y+1, c.z) )
				break
			case "1":
				// down left
				game.active.moveTo( new Tuple(c.x, c.y+1, c.z) )
				break
			case "4":
				// left
				game.active.moveTo( new Tuple(c.x-1, c.y+1, c.z) )
				break
			case "7":
				// up left
				game.active.moveTo( new Tuple(c.x-1, c.y, c.z) )
				break
			case "Escape":
				closeBaseControl()
				break
			default:
				break;
		}
	}
}

/* UTILITY FUNCTIONS */

Array.prototype.removeLast = function(value) {
	let index = this.lastIndexOf(value)
	if (index !== -1) {
		this.splice(index, 1)
	}
	else {
		// throw new Error("Value not found in array.")
	}
}

function getPieceDom(piece) {
	if (piece != undefined) {
		return document.getElementById(piece.id)
	}
}

function getUiTileByCoordinates(c) {
	return document.getElementById(c.x + "," + c.y + "," + c.z)
}

/* UI FUNCTIONS */

function showPath(e) {
	// only show the path if the active piece is a unit (not a city)
	if (e.button == RIGHT_MOUSE_BUTTON && game.active instanceof Unit) {
		// calculate the path to the current tile
		// yay, graph theory
		
		// get the source tile
		let source = game.getActiveCoordinates()
		// get the destination tile
		let destination = Tuple.parseTuple(e.currentTarget.id)
		
		// create a map from tile coordinates to graph nodes
		let m = new Map()
		m[source] = new Node(source)
		m[source].distance = 0
		
		let queue = [ m[source] ]
		while (queue.length !== 0) {
			// pop the next item off the queue
			let p = queue.pop()
			// mark this node as visited
			p.visited = true
			
			// get neighbors
			let neighbors = game.map.getNeighbors(p.coordinates)
			
			// calculate new distance
			let newDistance = p.distance + 1
			
			// add neighbors' distances to the hashmap
			for (let n of neighbors) {
				// add each neighbor to the hashmap if not already present
				if ( m[n] == undefined ) {
					m[n] = new Node(n)
				}
				// check all unvisited neighbors
				if ( !m[n].visited ) {
					// add all unvisited neighbors to the queue
					queue.push(m[n])
					// get current distance
					let oldDistance = m[n].distance
					if ( newDistance < oldDistance ) {
						// update distance
						m[n].distance = newDistance
						// update parent
						m[n].parent = p
					}
				}
			}
		}
		
		// follow predecessors
		let path = []
		let previous = m[destination]
		while (previous !== undefined) {
			path.push(previous)
			previous = previous.parent
		}
		path.reverse()
		
		// draw path
		render()
		for (let p of path) {
			let pathDiv = document.createElement("div")
			pathDiv.classList.add("path")
			getUiTileByCoordinates(p.coordinates).appendChild(pathDiv)
		}
	}
}

function goTo(e) {
	
}

function queueProduction() {
	let productionTarget = game.active.productionMenu[ document.getElementById("productionMenu").value ]
	game.active.queueProduction(productionTarget)
	// update UI status
	renderActive()
	// update production queue
	populateProductionQueue()
	// re-render production menu
	populateProductionMenu()
}

function openBaseControl() {
	game.baseControlOpen = true
	render()
	document.getElementById("cityName").textContent = game.active.fullName
	game.active.drawResources()
	document.getElementById("food").textContent = game.active.getTotalResource("food")
	document.getElementById("minerals").textContent = game.active.getTotalResource("minerals")
	document.getElementById("credits").textContent = game.active.getTotalResource("credits")
	populateProductionMenu()
	populateFacilityList()
	populateProductionQueue()
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
	nextIdle()
}

function cancelOrders() {
	if (game.active.status != status.outOfMoves) {
		game.active.status = status.idle
		render()
	}
}

function buildCity() {
	// if a piece is selected and this piece can build a city
	if (game.active !== undefined && game.active.buildCity !== undefined) {
		game.active.buildCity()
	}
}

function buildFarm() {
	if (game.active instanceof EngineerSkimmer) {
		game.active.terraform(FlotationFarm)
		nextIdle()
	}
}

function buildSolar() {
	if (game.active instanceof EngineerSkimmer) {
		game.active.terraform(SolarArray)
		nextIdle()
	}
}

function disband() {
	if (game.active.disband !== undefined) {
		game.active.disband()
		nextIdle()
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
		render()
		// select next idle unit if no unit selected
		if (game.active == undefined) {
			nextIdle()
		}
	}
}

/* RENDERING */

function populateProductionQueue() {
	// clear previous items
	let queueUi = document.getElementById("productionQueue")
	while (queueUi.firstElementChild != undefined) {
		queueUi.firstElementChild.remove()
	}
	// render queue
	for (let p of game.active.productionQueue) {
		let container = document.createElement("div")
		container.classList.add("productionQueueItemContainer")
		let item = document.createElement("div")
		item.textContent = p.constructor.fullName
		item.classList.add("productionQueueItem")
		let progress = document.createElement("progress")
		
		container.appendChild(item)
		container.appendChild(progress)
		
		document.getElementById("productionQueue").appendChild(container)
	}

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
	// add default prompt
	let o = document.createElement("option")
	o.textContent = "Add to Queue..."
	o.selected = true
	o.disabled = true
	menu.appendChild(o)
	// populate
	for (let i=0; i<game.active.productionMenu.length; i++) {
		// check whether this facility has already been built
		if ( game.active.facilities.find( f => f instanceof game.active.productionMenu[i] ) == undefined ) {
			let option = document.createElement("option")
			// this shit shouldn't even be possible, like wtf javascript
			//option.textContent = new productionMenu[i]().name
			
			option.textContent =
				game.active.productionMenu[i].fullName +
				" (" +
				Math.ceil(game.active.productionMenu[i].mineralCost/game.active.getTotalResource("minerals") ) +
				" turns)"
			option.value = i
			menu.appendChild(option)
		}
	}
}

function initialize() {
	let mapDiv = document.getElementById("map")
	let z = 0
	for (let y=0; y<game.map.size; y++) {
		let row = document.createElement("div")
		row.id = "row" + y
		row.className = "row"
		mapDiv.appendChild(row)
		let currentRow = document.getElementById("row" + y)
		for (let x=0; x<game.map.size; x++) {
			let tile = document.createElement("div")
			tile.id = x + "," + y + "," + z
			tile.className = "tile"
			tile.addEventListener("mousedown", showPath)
			tile.addEventListener("mouseup", goTo)
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
				let piece = game.map.getItemById( Number(e.currentTarget.getAttribute("data-id")) )
				game.active = piece
				render()
			}
		)
		if (game.active == u) {
			unitSelectContainer.classList.add("active")
		}
		let unitLabel = document.createElement("div")
		unitLabel.classList.add("unitLabel")
		unitLabel.textContent = u.status.abbreviation
		let unitSelect = document.createElement("div")
		unitSelect.classList.add("unitIcon")
		let unitName = document.createElement("div")
		unitName.classList.add("unitName")
		unitName.textContent = u.constructor.fullName
		
		unitSelectContainer.appendChild(unitLabel)
		unitSelectContainer.appendChild(unitSelect)
		unitSelectContainer.appendChild(unitName)
		
		document.getElementById("unitList").appendChild(unitSelectContainer)
	}
	// sentinel for empty unit list
	if (game.unitList.length == 0) {
		let unitSelectContainer = document.createElement("div")
		unitSelectContainer.classList.add("unitSelectContainer")
		unitSelectContainer.classList.add("sentinel")
		unitSelectContainer.textContent = "No Units"
		document.getElementById("unitList").appendChild(unitSelectContainer)
	}
}

function render() {
	let mapDiv = document.getElementById("map")
	let z = 0;
	document.getElementById("turn").textContent = game.turn
	// render map
	for (let y=0; y<game.map.size; y++) {
		for (let x=0; x<game.map.size; x++) {
			let target = document.getElementById(x + "," + y + "," + z)
			// Reset style
			target.className = "tile"
			let tile = game.map.getTile( new Tuple(x, y, z) )
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

/* MAIN */

// push starting units
game.map.getTile( new Tuple(3, 3, 0) ).units.push(
	new PodSkimmer(),
	new EngineerSkimmer(),
)
for ( let u of game.map.getTile( new Tuple(3, 3, 0) ).units ) {
	game.unitList.push(u)
}

// begin
initialize()
render()