'use strict';

function GridView(canvas, params) {
    this._params = {};

    for (var paramIndex in this._defaultParams) {
        this._params[paramIndex] = params[paramIndex] || this._defaultParams[paramIndex];
    }
    this._params.gridWidth = (this._params.gridWidth < 0) ? canvas.width : this._params.gridWidth;
    this._params.gridHeight = (this._params.gridHeight < 0) ? canvas.height : this._params.gridHeight;

    this._canvasCtx = canvas.getContext('2d');
    this._canvasElem = canvas;

    var verticalPadding = (this._params.gridHeight % this._params.cellHeight) / 2;
    this._topPadding = Math.ceil(verticalPadding);
    this._bottomPadding = Math.floor(verticalPadding);

    var horizontalPadding = (this._params.gridWidth % this._params.cellWidth) / 2;
    this._leftPadding = Math.ceil(horizontalPadding);
    this._rightPadding = Math.floor(horizontalPadding);

    this._gridRows = Math.floor(this._params.gridWidth / this._params.cellWidth);
    this._gridCols = Math.floor(this._params.gridHeight / this._params.cellHeight);
}

GridView.prototype = {
    _defaultParams: {
        xOffset: 0,
        yOffset: 0,
        gridWidth: -1,
        gridHeight: -1,
        cellWidth: 1,
        cellHeight: 1
    },
    rows: function() {
        return this._gridCols;
    },
    cols: function() {
        return this._gridRows;
    },
    cellWidth: function() {
        return this._params.cellWidth;
    },
    cellHeight: function() {
        return this._params.cellHeight;
    },
    gridWidth: function() {
        return this._params.gridWidth;
    },
    gridHeight: function() {
        return this._params.gridHeight;
    },
    offsetX: function() {
        return this._params.xOffset;
    },
    offsetY: function() {
        return this._params.yOffset;
    },
    canvas: function() {
        return this._canvasElem;
    },
    fillCell: function(col, row, fillColor) {
        row = Math.round(row);
        col = Math.round(col);

        if (!(row >= 0 && row < this.rows()) || !(col >= 0 && col < this.cols())) {
            throw new Error('fillCell: Coordinates out of range (' +
                'row = ' + row + ', ' +
                'col = ' + col + ')');
        }
        var xPos = col * this._params.cellWidth;
        xPos += this._params.xOffset;
        xPos += this._leftPadding;

        var yPos = row * this._params.cellHeight;
        yPos += this._params.yOffset;
        yPos += this._topPadding;

        var prevFillStyle = this._canvasCtx.fillStyle;
        this._canvasCtx.fillStyle = fillColor;

        this._canvasCtx.fillRect(xPos, yPos, this._params.cellWidth, this._params.cellHeight);

        this._canvasCtx.fillStyle = prevFillStyle;
    }
};

var LifeCell = {
    CURRSTATE_BIT: 1 << 0,
    NEXTSTATE_BIT: 1 << 1,
    ISUPDATED_BIT: 1 << 2,

    getState: function(cell) {
        return !!(cell & LifeCell.CURRSTATE_BIT);
    },
    isUpdated: function(cell) {
        return !!(cell & LifeCell.ISUPDATED_BIT);
    },
    getNextState: function(cell) {
        return !!(cell & LifeCell.NEXTSTATE_BIT);
    },
    _applyBitMask: function(value, bitMask, state) {
        return state ? (value | bitMask) : (value & ~bitMask);
    },
    setState: function(cell, state) {
        return LifeCell._applyBitMask(cell, LifeCell.CURRSTATE_BIT, state);
    },
    setNextState: function(cell, state) {
        var updatedCell = LifeCell._applyBitMask(cell, LifeCell.NEXTSTATE_BIT, state);

        return updatedCell | LifeCell.ISUPDATED_BIT;
    }
};

function LifeModel(numCols, numRows) {
    this._numRows = numRows;
    this._numCols = numCols;

    this._cell = LifeModel._makeArray(numRows * numCols).fill(0);
}
LifeModel._makeArray = function(size) {
    if (Uint8Array) {
        return new Uint8Array(size);
    } else {
        return new Array(size);
    }
};

LifeModel.prototype = {
    rows: function() {
        return this._numRows;
    },
    cols: function() {
        return this._numCols;
    },
    _hashCoordinate: function(x, y) {
        return y * this.cols() + x;
    },
    setCellState: function(x, y, state) {
        if (!(x >= 0 && x < this.cols()) || !(y >= 0 && y < this.rows())) {
            throw new Error('setCellState: Coordinates out of range (' +
                'row = ' + x + ', ' +
                'col = ' + y + ')');
        }
        this._setCellState(y * this.cols() + x, state);
    },
    _setCellState: function(cellIndex, state) {
        this._cell[cellIndex] = LifeCell.setState(this._cell[cellIndex], state);
    },
    setCellNextState: function(x, y, state) {
        if (!(x >= 0 && x < this.cols()) || !(y >= 0 && y < this.rows())) {
            throw new Error('setCellNextState: Coordinates out of range (' +
                'row = ' + x + ', ' +
                'col = ' + y + ')');
        }
        this._setCellNextState(y * this.cols() + x, state);
    },
    _setCellNextState: function(cellIndex, state) {
        this._cell[cellIndex] = LifeCell.setNextState(this._cell[cellIndex], state);
    },
    forEach: function(iterFn) {
        var cellIndex = 0;

        for (var y = 0; y < this.rows(); ++y) {
            for (var x = 0; x < this.cols(); ++x, ++cellIndex) {
                var currCell = this._cell[cellIndex];

                iterFn(x, y, currCell);
            }
        }
    },
    updateCells: function(iterFn) {
        iterFn = iterFn || function() {};
        var cellIndex = 0;

        for (var y = 0; y < this.rows(); ++y) {
            for (var x = 0; x < this.cols(); ++x, ++cellIndex) {
                var oldCell = this._cell[cellIndex];
                this._updateCell(cellIndex);
                var newCell = this._cell[cellIndex];

                iterFn(x, y, oldCell, newCell);
            }
        }
    },
    _updateCell: function(cellIndex) {
        var cell = this._cell[cellIndex];

        if (LifeCell.isUpdated(cell)) {
            cell &= ~LifeCell.ISUPDATED_BIT;
            // This shift causes the next state bit to become the current state bit
            cell >>>= 1;
        }
        this._cell[cellIndex] = cell;
    },
    map: function(mapFn) {
        var cellIndex = 0;

        for (var y = 0; y < this.rows(); ++y) {
            for (var x = 0; x < this.cols(); ++x, ++cellIndex) {
                var currCell = this._cell[cellIndex];

                this._cell[cellIndex] = mapFn(x, y, currCell);
            }
        }
    },
    reduceNeighbors: function(x, y, reduceFn, reductionAcc) {
        if (!(x >= 0 && x < this.cols()) || !(y >= 0 && y < this.rows())) {
            throw new Error('reduceNeighbors: Coordinates out of range (' +
                'row = ' + x + ', ' +
                'col = ' + y + ')');
        }
        var xCoord;
        var yCoord;
        var cellIndex;
        var cell;

        // Upper-left
        xCoord = x > 0 ? x - 1 : this.cols() - 1;
        yCoord = y > 0 ? y - 1 : this.rows() - 1;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Upper-center
        xCoord = x;
        yCoord = y > 0 ? y - 1 : this.rows() - 1;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Upper-right
        xCoord = x >= this.cols() - 1 ? 0 : x + 1;
        yCoord = y > 0 ? y - 1 : this.rows() - 1;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Center-left
        xCoord = x > 0 ? x - 1 : this.cols() - 1;
        yCoord = y;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Center-right
        xCoord = x >= this.cols() - 1 ? 0 : x + 1;
        yCoord = y;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Bottom-left
        xCoord = x > 0 ? x - 1 : this.cols() - 1;
        yCoord = y >= this.rows() - 1 ? 0 : y + 1;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Bottom-center
        xCoord = x;
        yCoord = y >= this.rows() - 1 ? 0 : y + 1;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        // Bottom-right
        xCoord = x >= this.cols() - 1 ? 0 : x + 1;
        yCoord = y >= this.rows() - 1 ? 0 : y + 1;

        cellIndex = this._hashCoordinate(xCoord, yCoord);
        cell = this._cell[cellIndex];
        reductionAcc = reduceFn(xCoord, yCoord, cell, reductionAcc);

        return reductionAcc;
    }
};

function GameOfLife(gridView, ruleFn) {
    this._currGeneration = 0;
    this._ruleFn = ruleFn || GameOfLife.defaultRule;

    this._grid = gridView;
    this._model = new LifeModel(gridView.cols(), gridView.rows());
}
GameOfLife.defaultRule = function(cellState, neighborCount) {
    if (cellState) {
        return neighborCount === 2 || neighborCount === 3;
    }
    return neighborCount === 3;
};

GameOfLife.prototype = {
    countNeighbors: function(x, y) {
        this._neighborCountFn = this._neighborCountFn || function(x, y, cell, resultAcc) {
            return LifeCell.getState(cell) ? resultAcc + 1 : resultAcc;
        };
        return this._model.reduceNeighbors(x, y, this._neighborCountFn, 0);
    },
    draw: function() {
        this._drawFn = this._drawFn || function(x, y, cell) {
            var cellColor = LifeCell.getState(cell) ? 'black' : 'white';

            this._grid.fillCell(x, y, cellColor);
        }.bind(this);

        this._model.forEach(this._drawFn);
    },
    _updateCell: function(x, y, cell) {
        var cellState = LifeCell.getState(cell);
        var neighborCount = this.countNeighbors(x, y);
        var nextState = this._ruleFn(cellState, neighborCount);

        this._model.setCellNextState(x, y, nextState);
    },
    update: function(updateFn) {
        this._cellUpdateFn = this._cellUpdateFn || function(x, y, cell) {
            if (!LifeCell.getState(cell)) return;
            if (LifeCell.isUpdated(cell)) return;
            
            this._nestedUpdateFn = this._nestedUpdatedFn || function(nX, nY, neighbor) {
                if (LifeCell.getState(neighbor)) return;
                if (LifeCell.isUpdated(neighbor)) return;

                this._updateCell(nX, nY, neighbor);
            }.bind(this);

            this._model.reduceNeighbors(x, y, this._nestedUpdateFn);

            this._updateCell(x, y, cell);
        }.bind(this);

        this._model.forEach(this._cellUpdateFn);
        this._model.updateCells(updateFn);

        ++this._currGeneration;
    },
    fillBoard: function(fillFn) {
        this._model.map(function(x, y, cell) {
            return LifeCell.setState(cell, fillFn(x, y));
        });
    },
    render: function() {
        this._renderFn = this._renderFn || function(x, y, oldCell, newCell) {
            if (LifeCell.getState(newCell) !== LifeCell.getState(oldCell)) {
                var cellColor = LifeCell.getState(newCell) ? 'black' : 'white';

                this._grid.fillCell(x, y, cellColor);
            }
        }.bind(this);

        this.update(this._renderFn);
    },
    setCell: function(x, y, state) {
        this._model.setCellState(x, y, state);
        this._grid.fillCell(x, y, state ? 'black' : 'white');
    }
};
