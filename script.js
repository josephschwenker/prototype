"use strict"

// constants

const RIGHT_MOUSE_BUTTON = 2
const PRODUCTION_COMPLETE = "sound/cpu prod complete.wav"
const INVALID_COMMAND = "sound/cpu invalid command.wav"

// classes

// Node represents a node used for storing tile coordinates for pathfinding
class Node {
	constructor(coordinates) {
		this.coordinates = coordinates
		this.visited = false
		this.distance = Infinity
		this.vector = undefined
		this.turns = Infinity
		this.parent = undefined
	}
	equals(n) {
		return this.coordinates == n.coordinates
	}
}

// Action specifies a command a user can carry out by clicking a button or pressing a keyboard shortcut
class Action {
	static name = ""
	static actionBarIndex = 0
	static shortcut = ""
	
	static isAvailable = function() {
		return false
	}
	static do = function() {
		if ( this.isAvailable() ) {
			
		}
		else {
			
		}
	}
}

// actions stores all possible actions
let actions = {}

// nextUnit
	actions.nextUnit = new Action()
	actions.nextUnit.name = "Next Unit"
	actions.nextUnit.shortcut = "w"
	actions.nextUnit.actionBarIndex = 0
	actions.nextUnit.isAvailable = function() {
		return true
	}
	actions.nextUnit.do = function() {
		if ( actions.nextUnit.isAvailable() ) {
			nextIdle()
		}
		else {
			
		}
	}

// endTurn
	actions.endTurn = new Action()
	actions.endTurn.name = "End Turn"
	actions.endTurn.shortcut = "Enter"
	actions.endTurn.actionBarIndex = 0
	actions.endTurn.isAvailable = function() {
		if ( !(game.active instanceof City) ) {
			return false
		}
		else {
			return false
		}
	}
	actions.endTurn.do = function() {
		if ( actions.endTurn.isAvailable() ) {
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
	
// cancelOrders
	actions.cancelOrders = new Action()
	actions.cancelOrders.name = "Cancel Orders"
	actions.cancelOrders.shortcut = "c"
	actions.cancelOrders.isAvailable = function() {
		if ( game.active instanceof Unit ) {
			if ( game.active.status !== status.idle && game.active.status !== status.outOfMoves ) {
				return true
			}
			else {
				return false
			}
		}
		else {
			return false
		}
	}
	actions.cancelOrders.do = function() {
		if ( actions.cancelOrders.isAvailable() ) {
			game.active.status = status.idle
			render()
		}
	}

// disband
	actions.disband = new Action()
	actions.disband.name = "Disband"
	actions.disband.shortcut = "d"
	actions.disband.isAvailable = function() {
		if ( game.active instanceof Unit ) {
			return true
		}
		else {
			return false
		}
	}
	actions.disband.do = function() {
		if ( actions.disband.isAvailable() ) {
			// remove unit from tile
			let tile = game.map.getTileByItemId(game.active.id)
			tile.units.removeLast(game.active)
			// remove unit from unitList
			game.unitList.removeLast(game.active)
			game.active = undefined
			render()
		}
		else {
			play(INVALID_COMMAND)
		}
	}

// hold
	actions.hold = new Action()
	actions.hold.name = "Hold"
	actions.hold.shortcut = "h"
	actions.hold.isAvailable = function() {
		if ( game.active instanceof Unit ) {
			return true
		}
		else {
			return false
		}
	}
	actions.hold.do = function() {
		if ( actions.hold.isAvailable() ) {
			game.active.status = status.hold
			render()
		}
	}

// buildCity
	actions.buildCity = new Action()
	actions.buildCity.name = "Build City"
	actions.buildCity.shortcut = "b"
		
	actions.buildCity.isAvailable = function() {
		if ( game.active instanceof PodSkimmer && game.active.currentMoves > 0 ) {
			return true
		}
		else {
			return false
		}
	}
	actions.buildCity.do = function() {
		if ( actions.buildCity.isAvailable() ) {
			if (game.active.currentMoves >= 1) {
			let city = new City()
			city.generateName()
			// put city on the map
			let coordinates = game.getActiveCoordinates()
			let tile = game.map.getTile(coordinates)
			tile.city = city
			// remove any structures
			tile.structures = []
			game.cityList.push(city)
			actions.disband.do()
			render()
			// open the most recently-created city
			game.active = game.cityList[game.cityList.length-1]
			openBaseControl()
			}
		}
		else {
			play(INVALID_COMMAND)
		}
	}

class Game {
	
	// list of all possible actions
	#activePiece
	
	constructor() {
		// cannot initialize active until the map is rendered
		this.cityNamesList = ["Alpha Prime", "Glorious Awakening", "New Inception", "Terra Nova"]
		this.nodeMap
		this.moving = false
		this.turn = 0
		this.unitList = []
		this.cityList = []
		this.nextId = 0
		this.turn = 0
		this.map = new GameMap( MAPSIZE )
		this.baseControlOpen = false
		this.productionMenu = [StockpileMinerals, AdministrationNexus, Recycler, BiologyLab, PodSkimmer, ScoutSkimmer, EngineerSkimmer]
		this.structures = [FlotationFarm, SolarArray]
		// add actions for all structures
		for (let s of this.structures) {
			actions[s.shortName] = new Terraform(s)
		}
	}
	
	set active(piece) {
		// play default sound if this is a unit that was not previously active
		if ( this.#activePiece !== piece && piece instanceof Unit ) {
			// play default sound
			play(piece.sound)
		}
		// only change the active piece if base control is not open
		if ( !game.baseControlOpen && this.#activePiece !== piece ) {
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
			this.x === tuple.x &&
			this.y === tuple.y &&
			this.z === tuple.z
		) {
			return true;
		}
		else {
			return false
		}
	}
	
	subtract(t) {
		return new Tuple(this.x - t.x, this.y-t.y, this.z - t.z)
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
	
	getPath(nodeGraph, destination) {
		// follow predecessors
		let path = []
		let previous = nodeGraph[destination]
		while (previous !== undefined) {
			path.push(previous)
			previous = previous.parent
		}
		path.reverse()
		return path
	}
	
	generateNodeGraph(source) {
		// yay, graph theory
		
		// create a map from tile coordinates to graph nodes
		let m = {}
		m[source] = new Node(source)
		m[source].distance = 0
		m[source].turns = 0
		
		let currentNode = m[source]
		
		// must store indices of nodes, not the nodes themselves
		let unvisited = new Set()
		unvisited.add(currentNode.coordinates)
		
		// prevent infinite loops
		let max = 9999
		let ticks = 0
		
		while ( unvisited.size > 0 && ticks<max ) {
			
			ticks++
			if (ticks === max) {
				throw new Error("generateNodeGraph exceeded its maximum running time")
			}
			
			// mark this node as visited and remove it from the list of unvisited nodes
			currentNode.visited = true
			unvisited.delete(currentNode.coordinates)
			if ( unvisited.size > Math.pow(game.map.size, 2) ) {
				throw new Error("Too many nodes")
				break
			}
			
			// get neighbors
			let neighbors = game.map.getNeighbors(currentNode.coordinates)
			
			// calculate new distance
			let newDistance = currentNode.distance + 1
			
			// add neighbors' distances to the hashmap
			for (let n of neighbors) {
				// add each neighbor to the hashmap if not already present
				if ( m[n] == undefined ) {
					m[n] = new Node(n)
				}
				n = m[n]
				// check all unvisited neighbors
				if ( !n.visited ) {
					let newTurns = currentNode.turns
					// calculate this neighbor's vector
					let newVector = n.coordinates.subtract(currentNode.coordinates)
					// calculate turns
					if ( currentNode.vector !== undefined ) {
						// parent has a vector, so check if it matches the new one
						if ( !newVector.equals(currentNode.vector) ) {
							// vectors do not equal, so increment turns
							newTurns++
						}
					}
					
					if ( newDistance < n.distance || ( newDistance == n.distance && newTurns < n.turns ) ) {
						// update distance
						n.distance = newDistance
						// update turns
						n.turns = newTurns
						// update vector
						n.vector = newVector
						// update parent
						n.parent = currentNode
					}
					// add this node to the list of unvisited nodes
					unvisited.add(n.coordinates)
				}
			}
			// choose the closest unvisited node for the next iteration
			let smallestDistance = Infinity
			let smallestNode
			for (let n of unvisited) {
				let candidateNode = m[n]
				if (candidateNode.distance < smallestDistance) {
					smallestDistance = candidateNode.distance
					smallestNode = candidateNode
				}
			}
			currentNode = smallestNode
		}
		return m
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
					play(PRODUCTION_COMPLETE)
				}
				else if (currentProduction instanceof Unit) {
					// add unit to map, then push to unitList
					let c = game.map.getCoordinatesByItemId(this.id)
					game.map.getTile(c).units.push(currentProduction)
					game.unitList.push(currentProduction)
					// play sound
					play(PRODUCTION_COMPLETE)
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
		let i = Math.floor( Math.random()*game.cityNamesList.length )
		let name = game.cityNamesList[i]
		// remove name so it cannot be used again
		game.cityNamesList.removeLast(name)
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
	sentry: new Status("sentrying for enemy units", undefined, "l"),
	hold: new Status("holding for orders", undefined, "h"),
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
}

class Terraform extends Action {
	constructor(structure) {
		super()
		this.name = structure.fullName
		this.shortcut = structure.shortcut
		this.structure = structure
		// bind "this" so the function works when attached to an event handler
		this.do = this.do.bind(this)
	}
	
	isAvailable = function() {
		if ( game.active instanceof EngineerSkimmer ) {
			if ( game.active.currentMoves > 0 && game.structures.includes(this.structure) ) {
				return true
			}
			else if ( game.active.currentMoves <= 0 ) {
				return false
			}
			else if ( !game.structures.includes(this.structure) ) {
				return false
			}
		}
		else {
			return false
		}
	}
	
	do = function() {
		if ( this.isAvailable() ) {
			// unit has at least one move left
			let t = game.getActiveTile()
			if ( t.structures.find( s => s instanceof this.structure ) != undefined ) {
				// this structure already exists
				// play sound
				play("sound/cpu improved already.wav")
			}
			else {
				// this structure has not yet been built, check if in progress
				let currentStructure = t.structureQueue.find( s => s instanceof this.structure )
				if ( currentStructure == undefined ) {
					// no one has started building this structure
					currentStructure = new this.structure( game.getActiveCoordinates() )
					// add new structure to production queue
					t.structureQueue.push( currentStructure )
				}
				// assign this engineer to the structure
				game.active.assignedTo = currentStructure
				// update statuses of all units, aggregating engineer-turns
				game.active.aggregateStatus()
				// re-render to show engineer status
				render()
			}
		}
		else {
			play(INVALID_COMMAND)
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
				play("sound/CPU terraform complete.wav")
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
	static shortcut = "f"
	constructor() {
		super()
	}
}

class SolarArray extends Structure {
	static fullName = "Solar Array"
	static shortName = "solarArray"
	static buildTime = 3
	static shortcut = "s"
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

const MAPSIZE = 10
let game = new Game()

/* SOUND SYSTEM */

let audioPieces = document.getElementById("audioPieces")
let audioInterface = document.getElementById("audioInterface")
let audioMusic = document.getElementById("audioMusic")

/* EVENTS */

// close base control
document.getElementById("closeBaseControl").onclick = closeBaseControl

// change production
document.getElementById("productionMenu").onchange = queueProduction

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
				actions.cancelOrders.do()
				break
			case "d":
				actions.disband.do()
				break
			case "b":
				actions.buildCity.do()
				break
			case "f":
				actions.flotationFarm.do()
				break
			case "s":
				actions.solarArray.do()
				break
			case "h":
				actions.hold.do()
				break
			case "Escape":
				closeBaseControl()
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

/* SOUND SYSTEM */

function play(src) {
	let audioInterface = document.getElementById("audioInterface")
	audioInterface.src = src
	audioInterface.play()
}

/* UI FUNCTIONS */

function startMoving(e) {
	if (e.button === RIGHT_MOUSE_BUTTON && e.target.classList.contains("tile") && game.active !== undefined) {
		game.moving = true
		// get the source tile
		let source = game.getActiveCoordinates()
		// cache path
		game.nodeMap = game.map.generateNodeGraph(source)
		previewMove(e)
	}
}

function previewMove(e) {
	// only show the path if the active piece is a unit (not a city)
	if (game.active instanceof Unit && e.target.classList.contains("tile") && game.moving) {
		// generate path
		let source = game.getActiveCoordinates()
		// get the destination tile
		let destination = Tuple.parseTuple(e.target.id)
		let path = game.map.getPath(game.nodeMap, destination)
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
	if (game.moving) {
		let target
		for (let i of e.path) {
			if (i.classList !== undefined && i.classList.contains("tile")) {
				target = i
			}
		}
		if (target !== undefined) {
			let destination = Tuple.parseTuple(target.id)
			// generate path
			let path = game.map.getPath(game.nodeMap, destination)
			// the first item on the path is the current tile, so skip it so we don't waste a move
			for (let i=1; i<path.length; i++) {
				game.active.moveTo(game.nodeMap[ path[i].coordinates ].coordinates)
			}
		}
	}
	if (game.moving) {
		game.nodeMap = undefined
		game.moving = false
		render()
	}
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
	play("sound/menu2.wav")
}

function closeBaseControl() {
	game.baseControlOpen = false
	game.active = undefined
	render()
	document.getElementById("baseControl").style.display = "none"
	// play sound
	play("sound/menu down.wav")
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
	document.body.addEventListener("mousemove", previewMove)
	document.body.addEventListener("mouseup", goTo)
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
			tile.addEventListener("mousedown", startMoving)
			currentRow.appendChild(tile)
		}
	}
}

function renderActive() {
	// render action bar
	renderActionBar()

	if (game.active !== undefined) {
		
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

function renderActionBar() {
	let actionBar = document.getElementById("actionBar")
	// clear existing actions
	while (actionBar.firstChild) {
		actionBar.removeChild(actionBar.firstChild)
	}
	// render actions
	for (let a in actions) {
		if ( actions[a].isAvailable() ) {
			let b = document.createElement("button")
			b.textContent = `${actions[a].name} (${actions[a].shortcut})`
			b.addEventListener("click", actions[a].do)
			actionBar.appendChild(b)
		}
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
				city.addEventListener("click", onItemSelect)
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
					
					unitIcon.addEventListener("click", onItemSelect)
					
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