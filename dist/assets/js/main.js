window.onload = function() {	
	Ish.Go.View.init();
}

var gGameState;

var Constants = new function() {
	this.Color = {
		BLACK : "black",
		WHITE : "white"
	};
	this.Direction = {
		NORTH : "north",
		EAST : "east",
		SOUTH : "south",
		WEST : "west",
		ALL : ["north", "east", "south", "west"]
	};
	this.PointState = {
		EMPTY : ".",
		BLACK : "X",
		WHITE : "O"
	};
	this.MoveError = {
		REPEAT : "The attempted move would result in a repeated board state.",
		OCCUPIED : "The selected intersection is occupied.",
		SUICIDE : "The attepted move would result in a suicide."
	};
	this.TerritoryOwner = {
		UNKNOWN : this.PointState.EMPTY,
		NEUTRAL : "-",
		BLACK : this.PointState.BLACK,
		WHITE : this.PointState.WHITE
	};
	this.GameStatus = {
		ACTIVE : "active",
		IDLE : "idle",
		ENDED : "ended"
	};
};

/**
 * OBJ: Defines changed points after a move is made.
 */
function MoveResult(player, newPoint, capturedPoints) {
    this.player = player;
    this.newPoint = newPoint;
    this.capturedPoints = capturedPoints;
}

/**
 * OBJ: Defines common attributes for board points/intersections.
 */
function Point(row, column) {
	this.row = row;
	this.column = column;
	this.getNeighborAt = function(side) {
		switch (side) {
			case Constants.Direction.NORTH:
				return new Point(this.row-1, this.column);
			case Constants.Direction.SOUTH:
				return new Point(this.row+1, this.column);
			case Constants.Direction.EAST:
				return new Point(this.row, this.column+1);
			case Constants.Direction.WEST:
				return new Point(this.row, this.column-1);
		}
	};
	this.toString = function() {
		return "(" + this.row + ", " + this.column + ")";
	};
	this.equals = function(other) {
		return (this.row == other.row &&
				this.column == other.column);
	};
	this.isInArray = function(array) {
		for (var i=0; i<array.length; i++) {
			if (this.equals(array[i])) {
				return true;
			}
		}
		return false;
	};
}

/**
 * OBJ: Defines common attributes for a territory.
 */
function Territory(points, owner) {
	this.points = points || new Array();
	this.owner = owner || Constants.TerritoryOwner.UNKNOWN;
}

/**
 * OBJ: Defines common attributes for a player.
 */
function Player(color, pointState, score) {
	this.color = color; 			// Constants.Color.(BLACK/WHITE)
	this.pointState = pointState;	// Constants.PointState.(BLACK/WHITE)
	this.score = score || 0;
	
	this.equals = function(other) {
		return (this.color == other.color);
	};	
	this.toString = function() {
		return this.color;
	};
}

/**
 * OBJ: Defines common attributes for a game of Go.
 */
function GameState(boardWidth, boardHeight, player1, player2, status) {	
	this.boardWidth = boardWidth;
	this.boardHeight = boardHeight;
	
	// Initialize board
	this.board = new Array(this.boardHeight);	
	for (var i = 0; i < this.boardHeight; i++) {
		this.board[i] = new Array(this.boardWidth);
		for (var j = 0; j < this.boardWidth; j++) {
			this.board[i][j] = Constants.PointState.EMPTY;
		}
	}
	
	this.previousBoard = $.extend(true, [], this.board);	
	this.player1 = player1;
	this.player2 = player2;	
	this.currentPlayer = player1;	
	this.moveError;
	this.status = status || Constants.GameStatus.ACTIVE;
	
	this.getPointStateAt = function(point) {
		return this.board[point.row][point.column];
	};
	this.setPointStateAt = function(point, pointState) {
		this.board[point.row][point.column] = pointState;
	};	
	this.isUniqueBoard = function() {
		// Compare board and previousBoard arrays
		for (var y = 0; y < this.boardHeight; y++) {
			for (var x = 0; x < this.boardWidth; x++) {
				if (this.board[y][x] != this.previousBoard[y][x]) {
					return true;
				}
			}
		}
		return false;
	};
	this.getBoardCopy = function() {
		return $.extend(true, [], this.board)
	};
	this.setBoardCopy = function(board) {
		this.board = $.extend(true, [], board);
	};
};

// Ish.Go namespace declaration
var Ish = Ish || {};
Ish.Go = Ish.Go || {};

// begin Ish.Go.Logic namespace
Ish.Go.Logic = new function() {
	
	/**
	 * Helper function which returns true or false if the given point
	 * is in the bounds of the game state's board.
	 */
	this.isPointInBounds = function(point) {
		return (
			point &&
			point.row < gGameState.boardHeight && point.row >= 0 &&
			point.column < gGameState.boardWidth && point.column >= 0
		);
	};

	/**
	 * Returns a Territory object for the territory which "point" is a part of.
	 *
	 * A typical call passes only "point".
	 */
	this.getTerritory = function(point, territory) {
        // TODO: make this work when board is empty
		
		var pState = gGameState.getPointStateAt(point);
		
		// Skip non-empty points
		if (pState != Constants.PointState.EMPTY) {
			return new Territory(this.getChainPoints(point), pState);
		}
		
		var isRoot = false;
		if (!territory) {
			// If territory is null, make a new one
			territory = new Territory();
			// Mark instance as root of call tree
			isRoot = true;
		}
		
		// Add the current point to the territory
		territory.points.push(point);
		
		// Check for rest of territory in every direction
		for (var i = 0; i < Constants.Direction.ALL.length; i++) {
			var side = Constants.Direction.ALL[i];
			var nPoint = point.getNeighborAt(side);
			
			// Check for territory at neighboring point (nPoint)
			if (this.isPointInBounds(nPoint)) {
				var nState = gGameState.getPointStateAt(nPoint);
				
				if (nState == Constants.PointState.EMPTY) {
					// Empty. Add that piece's territory to this territory.
					if (!nPoint.isInArray(territory.points)) {
						// TODO: find out why this works
						this.getTerritory(nPoint, territory);
					}
				}
				else if (territory.owner != Constants.TerritoryOwner.NEUTRAL) {
					if (territory.owner == Constants.TerritoryOwner.UNKNOWN) {	
						territory.owner = nState;
					}
					else if (territory.owner != nState) {
						territory.owner = Constants.TerritoryOwner.NEUTRAL;
					}
				}					
			}
		}
		
		// If we are done making calls, and back at the root of the call tree,
		// ensure we're passing back a real territory owner (neutral).
		if (isRoot && territory.owner == Constants.TerritoryOwner.UNKNOWN) {
			territory.owner = Constants.TerritoryOwner.NEUTRAL;
		}
		
		return territory;
	};
		
	/**
	 * Returns an array of points which are in the chain that "point" belongs to.
	 *
	 * A typical call passes only "point".
	 */
	this.getChainPoints = function(point, chainPoints) {
		var pState = gGameState.getPointStateAt(point);
		
		// TODO: is this necessary?
		if (pState == Constants.PointState.EMPTY) {
			return new Array();
		}
		
		// If chainPoints is null, make it an empty array
		chainPoints = chainPoints || new Array();
		
		// Add the current piece to the chain
		chainPoints.push(point);
		
		// Check for rest of chain in every direction
		for (var i = 0; i < Constants.Direction.ALL.length; i++) {
			var side = Constants.Direction.ALL[i];
			var nPoint = point.getNeighborAt(side);
			
			// Check for chain at neighboring point (nPoint)
			if (this.isPointInBounds(nPoint)) {
				var nState = gGameState.getPointStateAt(nPoint);
				if (pState == nState) {
					// Same piece. Add that piece's chain points to this chain.
					if (!nPoint.isInArray(chainPoints)) {
						// TODO: find out why this works
						this.getChainPoints(nPoint, chainPoints);
					}
				}
			}
		}
		return chainPoints;
	};

	/**
	 * Returns an array of points which are captured by the piece at "point".
	 */
	this.getCapturedPoints = function(point) {	
		var capPoints = new Array();
		
		// Check for captures in every direction
		for (var i = 0; i < Constants.Direction.ALL.length; i++) {
			var side = Constants.Direction.ALL[i];
			var nPoint = point.getNeighborAt(side);
			
			// Check for captures at neighboring point (nPoint)
			if (this.isPointInBounds(nPoint)) {
				var pState = gGameState.getPointStateAt(point);
				var nState = gGameState.getPointStateAt(nPoint);
				if (nState != pState && nState != Constants.PointState.EMPTY) {
					// Opponent piece. Check for captures (if it's new).
					if (!nPoint.isInArray(capPoints) &&
							this.getLibertyPoints(nPoint).length == 0) {
						capPoints = capPoints.concat(this.getChainPoints(nPoint));
					}
				}
			}
		}
		return capPoints;
	};

	/**
	 * Returns an array of points which identify liberties of the
	 * chain that the piece at "point" belongs to.
	 *
	 * A typical call passes only "point".
	 */
	this.getLibertyPoints = function(point, chainPoints, libPoints) {	
		// If chainPoints or libPoints are null, make them empty arrays
		chainPoints = chainPoints || new Array();
		libPoints = libPoints || new Array();
		
		// Check for liberties in every direction
		for (var i = 0; i < Constants.Direction.ALL.length; i++) {
			var side = Constants.Direction.ALL[i];
			var nPoint = point.getNeighborAt(side);
			
			// Check for liberties at neighboring point (nPoint)
			if (this.isPointInBounds(nPoint)) {
				var pState = gGameState.getPointStateAt(point);
				var nState = gGameState.getPointStateAt(nPoint);
				if (pState == nState) {
					// Same piece. Add that piece's liberties to this chain's liberties.
					chainPoints.push(point);
					if (!nPoint.isInArray(chainPoints)) {
						// TODO: find out why this works
						this.getLibertyPoints(nPoint, chainPoints, libPoints);
					}
				}
				else if (nState == Constants.PointState.EMPTY) {
					// Empty. Add one liberty (if it's new).
					if (!nPoint.isInArray(libPoints)) {
						libPoints.push(nPoint);
					}
				}
			}
		}
		return libPoints;
	};

	/**
	 * Validates move, returning true or false.
	 * Also populates gGameState.moveError if move is invalid.
	 */
	this.isValidMove = function(point, player) {
		// Check if point is empty
		if (gGameState.getPointStateAt(point) != Constants.PointState.EMPTY) {
			gGameState.moveError = Constants.MoveError.OCCUPIED;
			return false;
		}
		
		var isValid = true;
		
		// Backup our board
		var backupBoard = gGameState.getBoardCopy();
		
		// Place piece
		gGameState.setPointStateAt(point, player.pointState);
		
		// Check for captured pieces
		var captures = this.getCapturedPoints(point);
		if (captures.length > 0) {
			// Remove captured pieces
			$.each(captures, function() {
				gGameState.setPointStateAt(this, Constants.PointState.EMPTY);
			});
			
			// Check for repeating board state
			if (!gGameState.isUniqueBoard()) {
				gGameState.moveError = Constants.MoveError.REPEAT;
				isValid = false;
			}
		}
		
		// Check for liberties
		else if (this.getLibertyPoints(point).length == 0) {
			gGameState.moveError = Constants.MoveError.SUICIDE;
			isValid = false;
		}
		
		// Restore our board
		gGameState.setBoardCopy(backupBoard);
		
		return isValid;
	};

	/**
	 * Validates and makes move by current player at the given point.
	 * Returns a MoveResult with the board changes.
	 */
	this.move = function(y, x) {	
		var point = new Point(y, x);
		var player = gGameState.currentPlayer;
        var capturedPoints;
        
        // Clear previous move errors
        gGameState.moveError = "";

		// Validate move
		if (!this.isValidMove(point, player)) {
			return null;
		}
		
		// Store previous board
		gGameState.previousBoard = gGameState.getBoardCopy();
		
		// Place piece
		gGameState.setPointStateAt(point, player.pointState);
		
		// Remove captured pieces (if any)
        capturedPoints = this.getCapturedPoints(point);
		$.each(capturedPoints, function() {
			gGameState.setPointStateAt(this, Constants.PointState.EMPTY);
		});
		
		// Change turn
		gGameState.currentPlayer = (player == gGameState.player1) ?
			gGameState.player2 : gGameState.player1;
        
        return new MoveResult(
            player,
            point,
            capturedPoints
        );
	};

	/**
	 * Returns a board (2d array) with territores marked
	 */
	this.getMarkedBoard = function() {
		var markedBoard = gGameState.getBoardCopy();
		
		for (var y = 0; y < gGameState.boardHeight; y++) {
			for (var x = 0; x < gGameState.boardWidth; x++) {
			
				if (markedBoard[y][x] == Constants.TerritoryOwner.UNKNOWN) {
					var territory = this.getTerritory(new Point(y,x));
					$.each(territory.points, function() {
						markedBoard[this.row][this.column] = territory.owner;
					});
				}
			}
		}
		
		return markedBoard
	};

	/**
	 * Sets the scores of both players in gGameState
	 */
	this.setScores = function() {
		var markedBoard = this.getMarkedBoard();
		var p1 = gGameState.player1;
		var p2 = gGameState.player2;
		
		// Reset scores
		p1.score = 0;
		p2.score = 0;
		
		// Scan marked board and distribute points
		for (var y = 0; y < gGameState.boardHeight; y++) {
			for (var x = 0; x < gGameState.boardWidth; x++) {
				var pState = markedBoard[y][x];
				
				if (pState == p1.pointState) {
					p1.score++;
				}
				else if (pState == p2.pointState) {
					p2.score++;
				}
			}
		}
	};
	
	/**
	 * Creates a new game, with the given board size
	 */
	this.newGame = function(width, height) {
		gGameState = new GameState(
			width,
			height,
			new Player(Constants.Color.BLACK, Constants.PointState.BLACK),
			new Player(Constants.Color.WHITE, Constants.PointState.WHITE)
		);
	}
	
}; // end Ish.Go.Logic namespace

// Ish.Go namespace declaration
var Ish = Ish || {};
Ish.Go = Ish.Go || {};

// begin Ish.Go.View namespace
Ish.Go.View = new function() {

	var canvas;
	var context;
	var isBoardMarked = false;
	var boardRatio = 19.27;

	// Static object for storing constants
	var ViewConstants = new function() {
		this.boardWidth = 19;
		this.boardHeight = 19;
		this.boardPadding = 6;
		this.pixelWidth = 800;
		this.pixelHeight = 800;
		this.pieceWidth = 800 / boardRatio;
		this.pieceHeight = 800 / boardRatio;
		this.imgPieceBlack = "dist/assets/img/piece-black.png";
		this.imgPieceWhite = "dist/assets/img/piece-white.png";
		this.imgFlagBlack = "flag-black.png";
		this.imgFlagWhite = "flag-white.png";
	};

	// Object for tracking xy coords
	var Coords = function(x, y) {
		this.x = x;
		this.y = y;
	};

	// Tracks clicks on the board (canvas)
	var clickListener = function(e) {
		var point = Ish.Go.View.getPoint(e);
		if (point && !isBoardMarked) {
			Ish.Go.View.placePiece(point);
		}
	};

	// Tracks mouse movement over the board (canvas)
	var mouseMoveListener = function(e) {
		var coords = Ish.Go.View.getCanvasCoords(e);
		var point = Ish.Go.View.getPoint(e);
		
		$("#coords").html("(" + coords.x + ", " + coords.y + ")");
		
		if (point) {
			$("#point").html("(" + point.row + ", " + point.column + ")");
		} else {
			$("#point").html("(-, -)");
		}
	};
	
	/**
	 * Initializes a canvas and context for use in the View, but only if necessary
	 */
	var initCanvas = function() {
		if ($("#go-canvas").length == 0 || !canvas || !context) {
			canvas = document.createElement("canvas");
			canvas.id = "go-canvas";
			$("#board").append(canvas);
		
			canvas.width = ViewConstants.pixelWidth;
			canvas.height = ViewConstants.pixelHeight;
			canvas.style.background = "transparent url(dist/assets/img/board.jpg) no-repeat 0 0";
			
			canvas.addEventListener("click", clickListener, false);
			canvas.addEventListener("mousemove", mouseMoveListener);
			
			context = canvas.getContext("2d");
		}
	};

	// Given a mouse event, returns Coords relative to the canvas
	this.getCanvasCoords = function(e) {
		var x, y;
		
		// Get xy coords on page
		if (e.pageX != undefined && e.pageY != undefined) {
			x = e.pageX;
			y = e.pageY;
		} else {
			x = e.clientX + document.body.scrollLeft + document.documentElement.scrollLeft;
			y = e.clientY + document.body.scrollTop + document.documentElement.scrollTop;
		}
		
		// Narrow xy coords to canvas
		x -= canvas.offsetLeft;
		y -= canvas.offsetTop;
		
		return new Coords(x, y);
	};

	// Returns board Point from mouse event, or null if not a valid Point
	this.getPoint = function(e) {
		var coords = this.getCanvasCoords(e);
		var x = coords.x;
		var y = coords.y;
		
		// Remove padding from coords
		x -= ViewConstants.boardPadding;
		y -= ViewConstants.boardPadding;
		
		// Check if xy coords are in the padding
		if (x <= 0 || x >= ViewConstants.pixelWidth - (2 * ViewConstants.boardPadding) ||
				y <= 0 || y >= ViewConstants.pixelHeight - (2 * ViewConstants.boardPadding)) {
			return null;
		}
		
		// Get Point from xy coords on canvas
		var point = new Point(
			Math.floor(y/ViewConstants.pieceHeight),	// row
			Math.floor(x/ViewConstants.pieceWidth)	// column
		);
		return point;
	};

	// Given a Point, returns the top-left Coords on the canvas
	this.getCoordsFromPoint = function(point) {
		return new Coords(
			((point.column) * ViewConstants.pieceWidth) + ViewConstants.boardPadding,
			((point.row) * ViewConstants.pieceHeight) + ViewConstants.boardPadding
		);
	};

	// Places piece, and draws changes on the board
	this.placePiece = function(point) {
        var moveResult = Ish.Go.Logic.move(point.row, point.column);
        
        // Check for empty MoveResult (indicates invalid move)
        if (!moveResult) {
			var alertMsg = "Invalid Move";
			
			// Add specific message if present
			if (gGameState.moveError) {
				alertMsg += ":\n" + gGameState.moveError;
			}
			
			alert(alertMsg);
            return;
        }
		
		// Redraw board changes as a result of the move
		this.update(moveResult);
	};

	/**
	 * Draws piece on canvas
	 */
	this.drawPiece = function(point, color) {	
		var coords = this.getCoordsFromPoint(point);
		
		var piece = new Image();
		
		if (color == Constants.Color.BLACK) {
			piece.src = ViewConstants.imgPieceBlack;
		} else {
			piece.src = ViewConstants.imgPieceWhite;
		}
		
		piece.onload = function() {
			context.drawImage(piece, coords.x, coords.y);
		};
	};
	
	/**
	 * Draws territory on canvas
	 */
	this.drawTerritory = function(point, owner) {
		var coords = this.getCoordsFromPoint(point);
		
		var territory = new Image();
		
		if (owner == Constants.TerritoryOwner.BLACK) {
			territory.src = ViewConstants.imgFlagBlack;
		}
		else if (owner == Constants.TerritoryOwner.WHITE) {
			territory.src = ViewConstants.imgFlagWhite;
		}
		else { // Neutral
			return;
		}
		
		territory.onload = function() {
			context.drawImage(territory, coords.x, coords.y);
		};
	};
    
    this.removePieces = function(points) {
        var coords;
        $.each(points, function() { 
            coords = Ish.Go.View.getCoordsFromPoint(this);
            context.clearRect(
                coords.x,
                coords.y,
                ViewConstants.pieceWidth,
                ViewConstants.pieceHeight
            );
        });
    };
    
    this.update = function(moveResult) {
        if (moveResult) {
            // Draw only board changes
            this.drawPiece(moveResult.newPoint, moveResult.player.color);
            this.removePieces(moveResult.capturedPoints);
			
			this.drawInfo();
        }
    };
    
    this.redraw = function(canvasElement) {
        // Create canvas and context if necessary
        if (!canvasElement) {
			initCanvas();
        }
        
		this.drawBoard();
		this.drawInfo();
    };
	
	this.drawBoard = function() {
        context.clearRect(0, 0, ViewConstants.pixelWidth, ViewConstants.pixelHeight);        
        var point;
        var pState;
        for (var y = 0; y < gGameState.boardHeight; y++) {
            for (var x = 0; x < gGameState.boardWidth; x++) {
                point = new Point(y, x);
                pState = gGameState.getPointStateAt(point);
                if (pState == Constants.PointState.BLACK) {
                    this.drawPiece(point, Constants.Color.BLACK);
                }
                else if (pState == Constants.PointState.WHITE) {
                    this.drawPiece(point, Constants.Color.WHITE);
                }
            }
        }	
	};
	
	this.drawMarkedBoard = function() {
		var markedBoard = Ish.Go.Logic.getMarkedBoard();
		
        context.clearRect(0, 0, ViewConstants.pixelWidth, ViewConstants.pixelHeight);
        for (var y = 0; y < gGameState.boardHeight; y++) {
            for (var x = 0; x < gGameState.boardWidth; x++) {				
                this.drawTerritory(new Point(y,x), markedBoard[y][x]);
            }
        }
	};
	
	this.drawInfo = function() {
		// Print turn
		$("#turn").html("Current Turn: " + gGameState.currentPlayer.color);
		
		// Print scores		
		Ish.Go.Logic.setScores();
		
		var p1 = gGameState.player1;
		var p2 = gGameState.player2;
		
		$("#score").html("Score:" +
			"<br>&nbsp;&nbsp;" +
			p1.color + ": " + p1.score +
			"<br>&nbsp;&nbsp;" +
			p2.color + ": " + p2.score);		
	};
	
	/**
	 * Starts a new game.
	 */
	this.startNewGame = function() {
		Ish.Go.Logic.newGame(19, 19);
		
		this.redraw($("go-canvas"));
	};

	/**
	 * Prints code defining current game state on web page
	 */
	this.printGameState = function(aId) {
		var id = aId || 'gameState';
		var sBoard = "";

		// Initialize game state
		sBoard += "gGameState = new GameState(\n";
		sBoard += "\t" + gGameState.boardWidth + ",\n";
		sBoard += "\t" + gGameState.boardHeight + ",\n";
		sBoard += "\tnew Player(Constants.Color.BLACK, Constants.PointState.BLACK),\n";
		sBoard += "\tnew Player(Constants.Color.WHITE, Constants.PointState.WHITE)\n";
		sBoard += ");\n";
		
		// Set current player
		sBoard += "gGameState.currentPlayer = " +
			(gGameState.currentPlayer == gGameState.player1 ?
				"gGameState.player1;\n" :
				"gGameState.player2;\n");
		
		// Set board
		for (var y = 0; y < gGameState.boardHeight; y++) {
			sBoard += "gGameState.board[" + y + "] = [";
			for (var x = 0; x < gGameState.boardWidth; x++) {
				
				sBoard += "\"" + gGameState.board[y][x] + "\",";
			}
			sBoard = sBoard.substring(0, sBoard.length-1);
			sBoard += "];\n";
		}
		
		// Set previous board
		for (var y = 0; y < gGameState.boardHeight; y++) {
			sBoard += "gGameState.previousBoard[" + y + "] = [";
			for (var x = 0; x < gGameState.boardWidth; x++) {
				sBoard += "\"" + gGameState.previousBoard[y][x] + "\",";
			}
			sBoard = sBoard.substring(0, sBoard.length-1);
			sBoard += "];\n";
		}
		
		$("#" + id).html("<textarea>" + sBoard + "</textarea>");
	};
	
	/**
	 * Toggles between showing a regular or marked board.
	 * Merely calls appropriate print functions.
	 */
	this.toggleMarkedBoard = function() {
		isBoardMarked ?	this.drawBoard() : this.drawMarkedBoard();
		isBoardMarked = !isBoardMarked;
	};
	
	this.init = function() {
		// Initialize game state
		gGameState = new GameState(
			19,
			19,
			new Player(Constants.Color.BLACK, Constants.PointState.BLACK),
			new Player(Constants.Color.WHITE, Constants.PointState.WHITE)
		);
		
		this.redraw();
	};
	
}; // end Ish.Go.View namespace
